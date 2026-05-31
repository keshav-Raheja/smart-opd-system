from flask import jsonify, request
from config.db import db
from bson import ObjectId
from datetime import datetime
from datetime import datetime

appointments_collection = db["appointments"]


def create_appointment():

    data = request.json

    appointment = {
        "patient_id": data["patient_id"],
        "patient_name": data["patient_name"],
        "doctor_name": data["doctor_name"],
        "appointment_date": data["appointment_date"],
        "appointment_time": data["appointment_time"],
        "status": "Scheduled",
        "reason": data.get("reason", ""),
        "created_at": datetime.utcnow()
    }

    result = appointments_collection.insert_one(appointment)

    return jsonify({
        "message": "Appointment created",
        "id": str(result.inserted_id)
    })


def get_appointments():

    appointments = []

    for appointment in appointments_collection.find().sort("created_at", -1):

        appointment["_id"] = str(appointment["_id"])

        appointments.append(appointment)

    return jsonify(appointments)


def update_appointment_status(id):

    data = request.json

    appointments_collection.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "status": data["status"]
            }
        }
    )

    return jsonify({
        "message": "Status updated"
    })


def delete_appointment(id):

    appointments_collection.delete_one({
        "_id": ObjectId(id)
    })

    return jsonify({
        "message": "Appointment deleted"
    })


def get_today_appointments():

    today = datetime.utcnow().strftime("%Y-%m-%d")

    appointments = []

    data = appointments_collection.find({
        "appointment_date": today
    })

    for appointment in data:

        appointment["_id"] = str(appointment["_id"])

        appointments.append(appointment)

    return jsonify(appointments)
