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

    is_historical = data.get("is_historical", False)
    historical_visits = 0
    if is_historical:
        try:
            historical_visits = int(data.get("historical_visits", 0))
        except ValueError:
            historical_visits = 0

    patient_data = {
        "name":        name,
        "age":         data.get("age"),
        "gender":      data.get("gender"),
        "phone":       phone,
        "address":     data.get("address"),
        "blood_group": data.get("blood_group"),
        "opd_id":      opd_id,
        "created_at":  datetime.datetime.utcnow(),
        "historical_visits": historical_visits,
        "historical_diagnosis": data.get("historical_diagnosis", "") if is_historical else "",
        "historical_medicines": data.get("historical_medicines", "") if is_historical else "",
        "historical_paid_amount": data.get("historical_paid_amount", 0) if is_historical else 0,
        "historical_dental_chart": data.get("historical_dental_chart", {}) if is_historical else {},
        "historical_follow_up_date": data.get("historical_follow_up_date", "") if is_historical else "",
        "historical_follow_up_time": data.get("historical_follow_up_time", "") if is_historical else "",
        "historical_follow_up_duration": int(data.get("historical_follow_up_duration", 15)) if is_historical else 15,
    }

    result = patients_collection.insert_one(patient_data)
    patient_id = result.inserted_id

    # If it is a historical record, populate visits, bills, and appointments
    if is_historical:
        visit = {
            "patient_id":     str(patient_id),
            "patient_name":   name,
            "doctor_name":    request.user.get("name", "Doctor"),
            "symptoms":       "Historical Import",
            "diagnosis":      data.get("historical_diagnosis", ""),
            "notes":          "Imported historical patient history",
            "prescription":   [{"name": med.strip(), "dosage": "As prescribed in history", "frequency": "", "duration": "", "instructions": ""} for med in data.get("historical_medicines", "").split(",") if med.strip()] if data.get("historical_medicines") else [],
            "follow_up_date": "",
            "opd_id":         opd_id,
            "vitals": {
                "blood_pressure": "",
                "temperature":    "",
                "pulse":          "",
                "weight":         "",
            },
            "dental_chart":   data.get("historical_dental_chart", {}),
            "created_at":     datetime.datetime.utcnow() - datetime.timedelta(seconds=5),
            "is_historical":  True
        }
        db["visits"].insert_one(visit)

        paid_amt = 0.0
        try:
            paid_amt = float(data.get("historical_paid_amount", 0))
        except ValueError:
            pass

        if paid_amt > 0:
            bill = {
                "patient_id":     str(patient_id),
                "patient_name":   name,
                "doctor_name":    request.user.get("name", "Doctor"),
                "total_amount":   paid_amt,
                "amount_paid":    paid_amt,
                "amount_due":     0.0,
                "payment_status": "Paid",
                "payment_method": "Cash",
                "services":       [{"name": "Historical Treatment", "charge": paid_amt, "qty": 1, "total": paid_amt}],
                "is_historical":  True,
                "opd_id":         opd_id,
                "created_at":     datetime.datetime.utcnow() - datetime.timedelta(seconds=5)
            }
            db["bills"].insert_one(bill)

        hist_follow_up_date = data.get("historical_follow_up_date")
        if hist_follow_up_date:
            hist_follow_up_time = data.get("historical_follow_up_time", "")
            try:
                hist_follow_up_duration = int(data.get("historical_follow_up_duration", 15))
            except (ValueError, TypeError):
                hist_follow_up_duration = 15

            appt = {
                "patient_id":        str(patient_id),
                "patient_name":      name,
                "doctor_name":       request.user.get("name", "Doctor"),
                "appointment_date":  hist_follow_up_date,
                "appointment_time":  hist_follow_up_time,
                "duration":          hist_follow_up_duration,
                "status":            "Scheduled",
                "reason":            "Historical Follow-up",
                "opd_id":            opd_id,
                "created_at":        datetime.datetime.utcnow(),
            }
            db["appointments"].insert_one(appt)

    return jsonify({
        "message":    "Patient added successfully",
        "patient_id": str(patient_id),
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


def update_patient(patient_id):
    data   = request.json or {}
    opd_id = request.user.get("opd_id")
    role   = request.user.get("role")

    query = {"_id": ObjectId(patient_id)}
    if role != "Admin" and opd_id:
        query["opd_id"] = opd_id

    patient = patients_collection.find_one(query)
    if not patient:
        return jsonify({"message": "Patient not found or access denied"}), 404

    name = data.get("name")
    phone = data.get("phone")
    if not name or not phone:
        return jsonify({"message": "Patient Name and Phone number are required"}), 400

    # Ensure phone duplicate check doesn't conflict with current patient
    existing_patient = patients_collection.find_one({
        "phone": phone,
        "opd_id": opd_id,
        "_id": {"$ne": ObjectId(patient_id)}
    })
    if existing_patient:
        return jsonify({"message": "Another patient with this phone number is already registered under this OPD."}), 400

    # Read basic fields
    age = data.get("age")
    gender = data.get("gender")
    address = data.get("address")
    blood_group = data.get("blood_group")

    # Read historical fields
    is_historical = data.get("is_historical", False)
    historical_visits = 0
    historical_paid_amount = 0.0
    historical_diagnosis = ""
    historical_medicines = ""
    historical_dental_chart = {}
    historical_follow_up_date = ""
    historical_follow_up_time = ""
    historical_follow_up_duration = 15

    if is_historical:
        try:
            historical_visits = int(data.get("historical_visits", 0))
        except ValueError:
            historical_visits = 0
        try:
            historical_paid_amount = float(data.get("historical_paid_amount", 0))
        except ValueError:
            historical_paid_amount = 0.0
        historical_diagnosis = data.get("historical_diagnosis", "")
        historical_medicines = data.get("historical_medicines", "")
        historical_dental_chart = data.get("historical_dental_chart", {})
        historical_follow_up_date = data.get("historical_follow_up_date", "")
        historical_follow_up_time = data.get("historical_follow_up_time", "")
        try:
            historical_follow_up_duration = int(data.get("historical_follow_up_duration", 15))
        except (ValueError, TypeError):
            historical_follow_up_duration = 15

    # Update patient record
    patients_collection.update_one(
        {"_id": ObjectId(patient_id)},
        {"$set": {
            "name": name,
            "age": age,
            "gender": gender,
            "phone": phone,
            "address": address,
            "blood_group": blood_group,
            "historical_visits": historical_visits,
            "historical_diagnosis": historical_diagnosis,
            "historical_medicines": historical_medicines,
            "historical_paid_amount": historical_paid_amount,
            "historical_dental_chart": historical_dental_chart,
            "historical_follow_up_date": historical_follow_up_date,
            "historical_follow_up_time": historical_follow_up_time,
            "historical_follow_up_duration": historical_follow_up_duration,
        }}
    )

    # Sync historical visit
    has_historical_data = (historical_visits > 0 or historical_diagnosis or historical_medicines or historical_dental_chart)
    existing_hist_visit = db["visits"].find_one({"patient_id": str(patient_id), "is_historical": True})

    if existing_hist_visit:
        if has_historical_data:
            # Update existing visit
            prescription_list = []
            if historical_medicines:
                prescription_list = [{"name": med.strip(), "dosage": "As prescribed in history", "frequency": "", "duration": "", "instructions": ""} for med in historical_medicines.split(",") if med.strip()]

            db["visits"].update_one(
                {"_id": existing_hist_visit["_id"]},
                {"$set": {
                    "patient_name": name,
                    "diagnosis": historical_diagnosis,
                    "prescription": prescription_list,
                    "dental_chart": historical_dental_chart,
                    "doctor_name": request.user.get("name", "Doctor"),
                }}
            )
        else:
            # Delete historical visit
            db["visits"].delete_one({"_id": existing_hist_visit["_id"]})
    else:
        if has_historical_data:
            # Insert historical visit
            prescription_list = []
            if historical_medicines:
                prescription_list = [{"name": med.strip(), "dosage": "As prescribed in history", "frequency": "", "duration": "", "instructions": ""} for med in historical_medicines.split(",") if med.strip()]
            
            visit = {
                "patient_id":     str(patient_id),
                "patient_name":   name,
                "doctor_name":    request.user.get("name", "Doctor"),
                "symptoms":       "Historical Import",
                "diagnosis":      historical_diagnosis,
                "notes":          "Imported historical patient history",
                "prescription":   prescription_list,
                "follow_up_date": "",
                "opd_id":         opd_id,
                "vitals": {
                    "blood_pressure": "",
                    "temperature":    "",
                    "pulse":          "",
                    "weight":         "",
                },
                "dental_chart":   historical_dental_chart,
                "created_at":     datetime.datetime.utcnow() - datetime.timedelta(seconds=5),
                "is_historical":  True
            }
            db["visits"].insert_one(visit)

    # Sync historical bill
    existing_hist_bill = db["bills"].find_one({"patient_id": str(patient_id), "is_historical": True})
    if existing_hist_bill:
        if historical_paid_amount > 0:
            db["bills"].update_one(
                {"_id": existing_hist_bill["_id"]},
                {"$set": {
                    "patient_name": name,
                    "total_amount": historical_paid_amount,
                    "amount_paid":  historical_paid_amount,
                    "services":     [{"name": "Historical Treatment", "charge": historical_paid_amount, "qty": 1, "total": historical_paid_amount}],
                    "doctor_name":  request.user.get("name", "Doctor"),
                }}
            )
        else:
            db["bills"].delete_one({"_id": existing_hist_bill["_id"]})
    else:
        if historical_paid_amount > 0:
            bill = {
                "patient_id":     str(patient_id),
                "patient_name":   name,
                "doctor_name":    request.user.get("name", "Doctor"),
                "total_amount":   historical_paid_amount,
                "amount_paid":    historical_paid_amount,
                "amount_due":     0.0,
                "payment_status": "Paid",
                "payment_method": "Cash",
                "services":       [{"name": "Historical Treatment", "charge": historical_paid_amount, "qty": 1, "total": historical_paid_amount}],
                "is_historical":  True,
                "opd_id":         opd_id,
                "created_at":     datetime.datetime.utcnow() - datetime.timedelta(seconds=5)
            }
            db["bills"].insert_one(bill)

    # Sync historical follow-up appointment
    existing_hist_appt = db["appointments"].find_one({"patient_id": str(patient_id), "reason": "Historical Follow-up"})
    if existing_hist_appt:
        if is_historical and historical_follow_up_date:
            db["appointments"].update_one(
                {"_id": existing_hist_appt["_id"]},
                {"$set": {
                    "patient_name":      name,
                    "appointment_date":  historical_follow_up_date,
                    "appointment_time":  historical_follow_up_time,
                    "duration":          historical_follow_up_duration,
                    "doctor_name":       request.user.get("name", "Doctor"),
                }}
            )
        else:
            db["appointments"].delete_one({"_id": existing_hist_appt["_id"]})
    else:
        if is_historical and historical_follow_up_date:
            appt = {
                "patient_id":        str(patient_id),
                "patient_name":      name,
                "doctor_name":       request.user.get("name", "Doctor"),
                "appointment_date":  historical_follow_up_date,
                "appointment_time":  historical_follow_up_time,
                "duration":          historical_follow_up_duration,
                "status":            "Scheduled",
                "reason":            "Historical Follow-up",
                "opd_id":            opd_id,
                "created_at":        datetime.datetime.utcnow(),
            }
            db["appointments"].insert_one(appt)

    return jsonify({"message": "Patient details updated successfully"}), 200




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