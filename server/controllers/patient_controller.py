from flask import request, jsonify
from config.db import db
from bson import ObjectId
import datetime

patients_collection = db["patients"]


def _opd_filter():
    """Build a MongoDB filter based on the caller's role and opd_id."""
    user   = request.user
    role   = user.get("role")
    opd_id = user.get("opd_id")

    # Admin sees everything
    if role == "Admin":
        return {}

    # Staff with an OPD sees only their OPD's patients
    if opd_id:
        return {"opd_id": opd_id}

    # Unassigned staff — should not see any patients
    return {"opd_id": "__none__"}


def add_patient():
    data   = request.json or {}
    opd_id = request.user.get("opd_id")
    name   = data.get("name")
    phone  = data.get("phone")

    if not name or not phone:
        return jsonify({"message": "Patient Name and Phone number are required"}), 400

    # Avoid duplicate registrations under the same OPD
    existing_patient = patients_collection.find_one({
        "phone": phone,
        "opd_id": opd_id
    })

    if existing_patient:
        return jsonify({
            "message": "Patient with this phone number already registered.",
            "patient_id": str(existing_patient["_id"]),
        }), 200

    patient_data = {
        "name":        name,
        "age":         data.get("age"),
        "gender":      data.get("gender"),
        "phone":       phone,
        "address":     data.get("address"),
        "blood_group": data.get("blood_group"),
        "opd_id":      opd_id,           # ← tag with creator's OPD
        "created_at":  datetime.datetime.utcnow(),
    }

    result = patients_collection.insert_one(patient_data)
    return jsonify({
        "message":    "Patient added successfully",
        "patient_id": str(result.inserted_id),
    }), 201


def get_all_patients():
    query    = _opd_filter()
    patients = []
    for patient in patients_collection.find(query):
        patient["_id"] = str(patient["_id"])
        patients.append(patient)
    return jsonify(patients), 200


def get_single_patient(patient_id):
    query = {"_id": ObjectId(patient_id)}

    # Non-admin: enforce OPD ownership
    role   = request.user.get("role")
    opd_id = request.user.get("opd_id")
    if role != "Admin" and opd_id:
        query["opd_id"] = opd_id

    patient = patients_collection.find_one(query)

    if not patient:
        return jsonify({"message": "Patient not found or access denied"}), 404

    patient["_id"] = str(patient["_id"])
    return jsonify(patient), 200


def delete_patient(patient_id):
    try:
        query = {"_id": ObjectId(patient_id)}
        role  = request.user.get("role")
        if role != "Admin":
            query["opd_id"] = request.user.get("opd_id")

        result = patients_collection.delete_one(query)
        if result.deleted_count == 0:
            return jsonify({"message": "Patient not found or access denied"}), 404

        q = {"$or": [{"patient_id": patient_id}, {"patient_id": ObjectId(patient_id)}]}
        appts  = db["appointments"].delete_many(q)
        visits = db["visits"].delete_many(q)
        bills  = db["bills"].delete_many(q)

        return jsonify({
            "message":              "Patient and all associated records deleted permanently",
            "appointments_deleted": appts.deleted_count,
            "visits_deleted":       visits.deleted_count,
            "bills_deleted":        bills.deleted_count,
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting patient: {str(e)}"}), 500