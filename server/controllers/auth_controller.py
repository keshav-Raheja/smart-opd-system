from flask import request, jsonify
from config.db import db

import bcrypt
import jwt
import datetime
import os

users_collection = db["users"]
opds_collection  = db["opds"]

JWT_SECRET = os.getenv("JWT_SECRET")


def register():
    data     = request.json or {}
    name     = data.get("name")
    email    = data.get("email")
    password = data.get("password")
    role     = data.get("role", "Doctor")

    if role == "Receptionist":
        return jsonify({"message": "Receptionists cannot register directly. Please contact your Doctor to create your account."}), 400

    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "User already exists"}), 400

    opd_id = None
    opd_type = None

    if role == "Doctor":
        clinic_name = data.get("clinic_name", "").strip()
        clinic_type = data.get("clinic_type", "General").strip()
        clinic_address = data.get("clinic_address", "").strip()
        clinic_contact = data.get("clinic_contact", "").strip()

        if not clinic_name:
            return jsonify({"message": "Clinic Name is required for Doctor registration"}), 400

        # Check if clinic name already exists (case-insensitive)
        if opds_collection.find_one({"name": {"$regex": f"^{clinic_name}$", "$options": "i"}}):
            return jsonify({"message": f"A clinic with the name '{clinic_name}' already exists"}), 400

        # Create OPD document
        opd = {
            "name":         clinic_name,
            "type":         clinic_type,
            "address":      clinic_address,
            "contact":      clinic_contact,
            "doctors":      [],
            "receptionists": [],
            "created_at":   datetime.datetime.utcnow(),
        }
        opd_res = opds_collection.insert_one(opd)
        opd_id = str(opd_res.inserted_id)
        opd_type = clinic_type

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    user_data = {
        "name":       name,
        "email":      email,
        "password":   hashed_password,
        "role":       role,
        "opd_id":     opd_id,
        "opd_type":   opd_type,
        "created_at": datetime.datetime.utcnow(),
    }

    user_res = users_collection.insert_one(user_data)
    user_id = str(user_res.inserted_id)

    # If Doctor, link to the created OPD and set as creator
    if role == "Doctor" and opd_id:
        from bson import ObjectId
        opds_collection.update_one(
            {"_id": ObjectId(opd_id)},
            {"$addToSet": {"doctors": user_id}, "$set": {"created_by": user_id}}
        )

    return jsonify({"message": "User registered successfully"}), 201


def login():
    data     = request.json or {}
    email    = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"message": "Invalid email"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"message": "Invalid password"}), 401

    user_role = user.get("role", "Receptionist")

    # If Receptionist, check Clinic Name
    if user_role == "Receptionist":
        clinic_name = data.get("clinic_name", "").strip()
        if not clinic_name:
            return jsonify({"message": "Clinic Name is required for Receptionists"}), 400
        
        opd_id = user.get("opd_id")
        if not opd_id:
            return jsonify({"message": "Receptionist has not been assigned to any clinic"}), 400
        
        from bson import ObjectId
        try:
            opd_doc = opds_collection.find_one({"_id": ObjectId(opd_id)})
            if not opd_doc or opd_doc.get("name", "").strip().lower() != clinic_name.lower():
                return jsonify({"message": "Invalid Clinic Name. Access denied."}), 400
        except Exception:
            return jsonify({"message": "Invalid clinic association"}), 400

    # Fetch fresh OPD details so name is always up-to-date
    opd_id   = user.get("opd_id")
    opd_type = user.get("opd_type")
    opd_name = None
    is_head = False

    if opd_id:
        try:
            from bson import ObjectId
            opd_doc = opds_collection.find_one({"_id": ObjectId(opd_id)})
            if opd_doc:
                opd_name = opd_doc.get("name")
                opd_type = opd_doc.get("type", opd_type)
                # Check is_head
                head_doctor_id = opd_doc.get("created_by") or (opd_doc.get("doctors")[0] if opd_doc.get("doctors") else None)
                is_head = (head_doctor_id == str(user["_id"]))
        except Exception:
            pass

    token = jwt.encode(
        {
            "user_id":  str(user["_id"]),
            "name":     user["name"],
            "email":    user["email"],
            "role":     user_role,
            "opd_id":   opd_id,
            "opd_type": opd_type,
            "opd_name": opd_name,
            "is_head":  is_head,
            "exp":      datetime.datetime.utcnow() + datetime.timedelta(days=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user": {
            "id":       str(user["_id"]),
            "name":     user["name"],
            "email":    user["email"],
            "role":     user_role,
            "opd_id":   opd_id,
            "opd_type": opd_type,
            "opd_name": opd_name,
            "is_head":  is_head,
        },
    }), 200


def create_receptionist():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400

    doctor = request.user
    doctor_opd_id = doctor.get("opd_id")
    doctor_opd_type = doctor.get("opd_type")

    if not doctor_opd_id:
        return jsonify({"message": "You must be associated with a clinic to create a receptionist"}), 400

    # Check if user already exists
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "A user with this email already exists"}), 400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    receptionist_data = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "role": "Receptionist",
        "opd_id": doctor_opd_id,
        "opd_type": doctor_opd_type,
        "created_at": datetime.datetime.utcnow(),
    }

    result = users_collection.insert_one(receptionist_data)
    receptionist_id = str(result.inserted_id)

    # Link receptionist to the doctor's OPD
    from bson import ObjectId
    opds_collection.update_one(
        {"_id": ObjectId(doctor_opd_id)},
        {"$addToSet": {"receptionists": receptionist_id}}
    )

    return jsonify({
        "message": "Receptionist account created successfully",
        "receptionist": {
            "id": receptionist_id,
            "name": name,
            "email": email,
            "role": "Receptionist",
            "opd_id": doctor_opd_id,
            "opd_type": doctor_opd_type
        }
    }), 201


def delete_receptionist(receptionist_id):
    user = request.user
    doctor_opd_id = user.get("opd_id")
    role = user.get("role")

    from bson import ObjectId
    try:
        receptionist = users_collection.find_one({"_id": ObjectId(receptionist_id)})
    except Exception:
        return jsonify({"message": "Invalid receptionist ID"}), 400

    if not receptionist:
        return jsonify({"message": "Receptionist not found"}), 404

    if receptionist.get("role") != "Receptionist":
        return jsonify({"message": "User is not a receptionist"}), 400

    # Enforce clinic separation: Doctors can only delete receptionists in their own clinic
    if role == "Doctor":
        if receptionist.get("opd_id") != doctor_opd_id:
            return jsonify({"message": "Access denied: Receptionist does not belong to your clinic"}), 403

    # Delete the user document
    users_collection.delete_one({"_id": ObjectId(receptionist_id)})

    # Remove from OPD
    opd_id = receptionist.get("opd_id")
    if opd_id:
        opds_collection.update_one(
            {"_id": ObjectId(opd_id)},
            {"$pull": {"receptionists": receptionist_id}}
        )

    return jsonify({"message": "Receptionist deleted successfully"}), 200


def create_doctor():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400

    creator = request.user
    creator_opd_id = creator.get("opd_id")
    creator_opd_type = creator.get("opd_type")

    if not creator_opd_id:
        return jsonify({"message": "You must be associated with a clinic to create a doctor"}), 400

    # Only allow OPD creator / head doctor to create another doctor
    from bson import ObjectId
    opd = opds_collection.find_one({"_id": ObjectId(creator_opd_id)})
    if not opd:
        return jsonify({"message": "OPD clinic not found"}), 404

    # Fallback owner check if created_by is missing
    head_doctor_id = opd.get("created_by") or (opd.get("doctors")[0] if opd.get("doctors") else None)
    if head_doctor_id != creator.get("user_id"):
        return jsonify({"message": "Only the clinic head doctor can add other doctors"}), 403

    # Check if user already exists
    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "A user with this email already exists"}), 400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    doctor_data = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "role": "Doctor",
        "opd_id": creator_opd_id,
        "opd_type": creator_opd_type,
        "created_at": datetime.datetime.utcnow(),
    }

    result = users_collection.insert_one(doctor_data)
    doctor_id = str(result.inserted_id)

    # Link doctor to the creator's OPD
    opds_collection.update_one(
        {"_id": ObjectId(creator_opd_id)},
        {"$addToSet": {"doctors": doctor_id}}
    )

    return jsonify({
        "message": "Doctor account created successfully",
        "doctor": {
            "id": doctor_id,
            "name": name,
            "email": email,
            "role": "Doctor",
            "opd_id": creator_opd_id,
            "opd_type": creator_opd_type
        }
    }), 201


def delete_doctor(doctor_id):
    user = request.user
    role = user.get("role")
    doctor_opd_id = user.get("opd_id")

    from bson import ObjectId
    try:
        doctor_to_del = users_collection.find_one({"_id": ObjectId(doctor_id)})
    except Exception:
        return jsonify({"message": "Invalid doctor ID"}), 400

    if not doctor_to_del:
        return jsonify({"message": "Doctor not found"}), 404

    if doctor_to_del.get("role") != "Doctor":
        return jsonify({"message": "User is not a doctor"}), 400

    # Only the clinic creator (head doctor) can delete other doctors
    opd = opds_collection.find_one({"_id": ObjectId(doctor_opd_id)})
    if not opd:
        return jsonify({"message": "Clinic not found"}), 404
        
    head_doctor_id = opd.get("created_by") or (opd.get("doctors")[0] if opd.get("doctors") else None)
    if head_doctor_id != user.get("user_id"):
        return jsonify({"message": "Only the clinic head doctor can delete other doctors"}), 403

    # Check that head doctor cannot delete themselves
    if doctor_id == user.get("user_id"):
        return jsonify({"message": "You cannot delete your own head doctor account. If you want to delete the clinic, contact Admin."}), 400

    # Delete the user document
    users_collection.delete_one({"_id": ObjectId(doctor_id)})

    # Remove from OPD's doctors array
    opds_collection.update_one(
        {"_id": ObjectId(doctor_opd_id)},
        {"$pull": {"doctors": doctor_id}}
    )

    return jsonify({"message": "Doctor deleted successfully"}), 200