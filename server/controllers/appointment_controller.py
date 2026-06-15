from flask import jsonify, request
from config.db import db
from bson import ObjectId
from datetime import datetime

appointments_collection = db["appointments"]


def _opd_query():
    user   = request.user
    role   = user.get("role")
    opd_id = user.get("opd_id")
    if role == "Admin":
        return {}
    if opd_id:
        return {"opd_id": opd_id}
    return {"opd_id": "__none__"}


def create_appointment():
    data = request.json
    opd_id = request.user.get("opd_id")

    appointment = {
        "patient_id":        data["patient_id"],
        "patient_name":      data["patient_name"],
        "doctor_name":       data["doctor_name"],
        "appointment_date":  data["appointment_date"],
        "appointment_time":  data["appointment_time"],
        "duration":          int(data.get("duration", 15)),
        "status":            "Scheduled",
        "reason":            data.get("reason", ""),
        "opd_id":            opd_id,
        "created_at":        datetime.utcnow(),
    }

    result = appointments_collection.insert_one(appointment)
    return jsonify({"message": "Appointment created", "id": str(result.inserted_id)})


def get_appointments():
    query = _opd_query()
    appointments = []
    for a in appointments_collection.find(query).sort("created_at", -1):
        a["_id"] = str(a["_id"])
        a["duration"] = int(a.get("duration", 15))
        appointments.append(a)
    return jsonify(appointments)


def update_appointment_status(id):
    data = request.json
    appointments_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": data["status"]}}
    )
    return jsonify({"message": "Status updated"})


def delete_appointment(id):
    appointments_collection.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Appointment deleted"})


def get_today_appointments():
    today = datetime.utcnow().strftime("%Y-%m-%d")
    query = {**_opd_query(), "appointment_date": today}
    appointments = []
    for a in appointments_collection.find(query):
        a["_id"] = str(a["_id"])
        a["duration"] = int(a.get("duration", 15))
        appointments.append(a)
    return jsonify(appointments)
