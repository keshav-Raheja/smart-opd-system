"""
opd_controller.py
─────────────────
CRUD for OPD (department/clinic) entities.
Only Admin can create/update/delete OPDs and assign staff.
"""

from flask import request, jsonify
from config.db import db
from bson import ObjectId
import datetime
import jwt
import os

opds_collection  = db["opds"]
users_collection = db["users"]

JWT_SECRET = os.getenv("JWT_SECRET")


def create_opd():
    data    = request.json or {}
    name    = data.get("name", "").strip()
    opd_type = data.get("type", "General")
    address = data.get("address", "").strip()
    contact = data.get("contact", "").strip()

    if not name:
        return jsonify({"message": "OPD name is required"}), 400

    if opds_collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}):
        return jsonify({"message": "An OPD with this name already exists"}), 400

    opd = {
        "name":         name,
        "type":         opd_type,
        "address":      address,
        "contact":      contact,
        "doctors":      [],
        "receptionists": [],
        "created_by":   request.user.get("user_id"),
        "created_at":   datetime.datetime.utcnow(),
    }

    result = opds_collection.insert_one(opd)
    return jsonify({"message": "OPD created successfully", "opd_id": str(result.inserted_id)}), 201


def get_all_opds():
    opds = []
    for opd in opds_collection.find():
        opd["_id"] = str(opd["_id"])
        if isinstance(opd.get("created_at"), datetime.datetime):
            opd["created_at"] = opd["created_at"].isoformat()

        # Enrich doctor list with names/emails
        doctors = []
        for uid in (opd.get("doctors") or []):
            try:
                u = users_collection.find_one({"_id": ObjectId(uid)}, {"name": 1, "email": 1, "role": 1})
                if u:
                    u["_id"] = str(u["_id"])
                    doctors.append(u)
            except Exception:
                pass

        # Enrich receptionist list
        receptionists = []
        for uid in (opd.get("receptionists") or []):
            try:
                u = users_collection.find_one({"_id": ObjectId(uid)}, {"name": 1, "email": 1, "role": 1})
                if u:
                    u["_id"] = str(u["_id"])
                    receptionists.append(u)
            except Exception:
                pass

        opd["doctors_detail"]       = doctors
        opd["receptionists_detail"] = receptionists
        opds.append(opd)

    return jsonify(opds), 200


def get_unassigned_users():
    """Users with no OPD assigned — shown in admin assignment UI."""
    users = []
    for u in users_collection.find(
        {
            "$and": [
                {"role": {"$in": ["Doctor", "Receptionist"]}},
                {"$or": [{"opd_id": {"$exists": False}}, {"opd_id": None}, {"opd_id": ""}]},
            ]
        },
        {"name": 1, "email": 1, "role": 1}
    ):
        u["_id"] = str(u["_id"])
        users.append(u)
    return jsonify(users), 200


def update_opd(opd_id):
    data = request.json or {}

    try:
        opd = opds_collection.find_one({"_id": ObjectId(opd_id)})
    except Exception:
        return jsonify({"message": "Invalid OPD ID"}), 400

    if not opd:
        return jsonify({"message": "OPD not found"}), 404

    update_fields = {}
    if "name"    in data: update_fields["name"]    = data["name"].strip()
    if "type"    in data: update_fields["type"]    = data["type"]
    if "address" in data: update_fields["address"] = data["address"].strip()
    if "contact" in data: update_fields["contact"] = data["contact"].strip()

    opd_type = data.get("type", opd.get("type", "General"))

    # ── Staff assignment helpers ─────────────────────────────────────────────
    def _assign_user(uid, role_field):
        opds_collection.update_one(
            {"_id": ObjectId(opd_id)},
            {"$addToSet": {role_field: uid}}
        )
        users_collection.update_one(
            {"_id": ObjectId(uid)},
            {"$set": {"opd_id": opd_id, "opd_type": opd_type}}
        )

    def _unassign_user(uid, role_field):
        opds_collection.update_one(
            {"_id": ObjectId(opd_id)},
            {"$pull": {role_field: uid}}
        )
        users_collection.update_one(
            {"_id": ObjectId(uid)},
            {"$set": {"opd_id": None, "opd_type": None}}
        )

    if "add_doctor"          in data: _assign_user(data["add_doctor"],         "doctors")
    if "remove_doctor"       in data: _unassign_user(data["remove_doctor"],    "doctors")
    if "add_receptionist"    in data: _assign_user(data["add_receptionist"],   "receptionists")
    if "remove_receptionist" in data: _unassign_user(data["remove_receptionist"], "receptionists")

    if update_fields:
        opds_collection.update_one({"_id": ObjectId(opd_id)}, {"$set": update_fields})

    return jsonify({"message": "OPD updated successfully"}), 200


def delete_opd(opd_id):
    try:
        opd = opds_collection.find_one({"_id": ObjectId(opd_id)})
    except Exception:
        return jsonify({"message": "Invalid OPD ID"}), 400

    if not opd:
        return jsonify({"message": "OPD not found"}), 404

    # Unassign all staff from this OPD
    users_collection.update_many(
        {"opd_id": opd_id},
        {"$set": {"opd_id": None, "opd_type": None}}
    )

    opds_collection.delete_one({"_id": ObjectId(opd_id)})
    return jsonify({"message": "OPD deleted successfully"}), 200


def get_my_clinic():
    user = request.user
    opd_id = user.get("opd_id")
    if not opd_id:
        return jsonify({"message": "No clinic associated with your account"}), 400

    try:
        opd = opds_collection.find_one({"_id": ObjectId(opd_id)})
    except Exception:
        return jsonify({"message": "Invalid clinic ID"}), 400

    if not opd:
        return jsonify({"message": "Clinic not found"}), 404

    opd["_id"] = str(opd["_id"])
    if isinstance(opd.get("created_at"), datetime.datetime):
        opd["created_at"] = opd["created_at"].isoformat()

    # Enrich doctor list
    doctors = []
    for uid in (opd.get("doctors") or []):
        try:
            u = users_collection.find_one({"_id": ObjectId(uid)}, {"name": 1, "email": 1, "role": 1})
            if u:
                u["_id"] = str(u["_id"])
                doctors.append(u)
        except Exception:
            pass

    # Enrich receptionist list
    receptionists = []
    for uid in (opd.get("receptionists") or []):
        try:
            u = users_collection.find_one({"_id": ObjectId(uid)}, {"name": 1, "email": 1, "role": 1})
            if u:
                u["_id"] = str(u["_id"])
                receptionists.append(u)
        except Exception:
            pass

    opd["doctors_detail"]       = doctors
    opd["receptionists_detail"] = receptionists

    return jsonify(opd), 200


def setup_clinic():
    user = request.user
    opd_id = user.get("opd_id")
    if opd_id:
        return jsonify({"message": "You already have a clinic associated with your account"}), 400

    data = request.json or {}
    name = data.get("name", "").strip()
    opd_type = data.get("type", "General").strip()
    address = data.get("address", "").strip()
    contact = data.get("contact", "").strip()

    if not name:
        return jsonify({"message": "Clinic Name is required"}), 400

    # Check if clinic name already exists (case-insensitive)
    if opds_collection.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}):
        return jsonify({"message": f"A clinic with the name '{name}' already exists"}), 400

    # Create OPD document
    opd = {
        "name":         name,
        "type":         opd_type,
        "address":      address,
        "contact":      contact,
        "doctors":      [user.get("user_id")],
        "receptionists": [],
        "created_by":   user.get("user_id"),
        "created_at":   datetime.datetime.utcnow(),
    }
    opd_res = opds_collection.insert_one(opd)
    new_opd_id = str(opd_res.inserted_id)

    # Update user's opd_id and opd_type in DB
    users_collection.update_one(
        {"_id": ObjectId(user.get("user_id"))},
        {"$set": {"opd_id": new_opd_id, "opd_type": opd_type}}
    )

    # Fetch updated user doc to return new token
    updated_user = users_collection.find_one({"_id": ObjectId(user.get("user_id"))})

    token = jwt.encode(
        {
            "user_id":  str(updated_user["_id"]),
            "name":     updated_user["name"],
            "email":    updated_user["email"],
            "role":     updated_user.get("role", "Doctor"),
            "opd_id":   new_opd_id,
            "opd_type": opd_type,
            "opd_name": name,
            "exp":      datetime.datetime.utcnow() + datetime.timedelta(days=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    return jsonify({
        "message": "Clinic setup completed successfully",
        "token":   token,
        "user": {
            "id":       str(updated_user["_id"]),
            "name":     updated_user["name"],
            "email":    updated_user["email"],
            "role":     updated_user.get("role", "Doctor"),
            "opd_id":   new_opd_id,
            "opd_type": opd_type,
            "opd_name": name,
        }
    }), 201
