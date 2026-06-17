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


def _cleanup_expired_appointments():
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        appointments_collection.delete_many({
            "appointment_date": {"$lt": today},
            "status": "Scheduled"
        })
    except Exception as e:
        print(f"[AppointmentController] Error in cleanup: {e}")


def get_appointments():
    _cleanup_expired_appointments()
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


def update_appointment(id):
    data = request.json
    update_fields = {}
    if "doctor_name" in data:
        update_fields["doctor_name"] = data["doctor_name"]
    if "appointment_date" in data:
        update_fields["appointment_date"] = data["appointment_date"]
    if "appointment_time" in data:
        update_fields["appointment_time"] = data["appointment_time"]
    if "duration" in data:
        try:
            update_fields["duration"] = int(data["duration"])
        except ValueError:
            pass
    if "reason" in data:
        update_fields["reason"] = data["reason"]
    if "status" in data:
        update_fields["status"] = data["status"]

    if update_fields:
        appointments_collection.update_one(
            {"_id": ObjectId(id)},
            {"$set": update_fields}
        )
    return jsonify({"message": "Appointment updated"})


def delete_appointment(id):
    appointments_collection.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Appointment deleted"})


def get_today_appointments():
    _cleanup_expired_appointments()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    query = {**_opd_query(), "appointment_date": today}
    appointments = []
    for a in appointments_collection.find(query):
        a["_id"] = str(a["_id"])
        a["duration"] = int(a.get("duration", 15))
        appointments.append(a)
    return jsonify(appointments)
