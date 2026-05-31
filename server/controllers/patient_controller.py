from flask import request, jsonify
from config.db import db
from bson import ObjectId
import datetime

patients_collection = db["patients"]


def add_patient():

    data = request.json

    patient_data = {
        "name": data.get("name"),
        "age": data.get("age"),
        "gender": data.get("gender"),
        "phone": data.get("phone"),
        "address": data.get("address"),
        "blood_group": data.get("blood_group"),
        "created_at": datetime.datetime.utcnow()
    }

    result = patients_collection.insert_one(patient_data)

    return jsonify({
        "message": "Patient added successfully",
        "patient_id": str(result.inserted_id)
    }), 201


def get_all_patients():

    patients = []

    for patient in patients_collection.find():

        patient["_id"] = str(patient["_id"])

        patients.append(patient)

    return jsonify(patients), 200


def get_single_patient(patient_id):

    patient = patients_collection.find_one({
        "_id": ObjectId(patient_id)
    })

    if not patient:
        return jsonify({
            "message": "Patient not found"
        }), 404

    patient["_id"] = str(patient["_id"])

    return jsonify(patient), 200


def delete_patient(patient_id):
    try:
        # 1. Delete patient document
        result = patients_collection.delete_one({"_id": ObjectId(patient_id)})
        if result.deleted_count == 0:
            return jsonify({"message": "Patient not found"}), 404

        # Defensive design: some collections may store patient_id as string, others as ObjectId
        query = {"$or": [{"patient_id": patient_id}, {"patient_id": ObjectId(patient_id)}]}

        # 2. Cascading Delete: Delete all appointments
        appts = db["appointments"].delete_many(query)

        # 3. Cascading Delete: Delete all clinical visits
        visits = db["visits"].delete_many(query)

        # 4. Cascading Delete: Delete all bills
        bills = db["bills"].delete_many(query)

        return jsonify({
            "message": "Patient and all associated records deleted permanently",
            "appointments_deleted": appts.deleted_count,
            "visits_deleted": visits.deleted_count,
            "bills_deleted": bills.deleted_count
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting patient: {str(e)}"}), 500