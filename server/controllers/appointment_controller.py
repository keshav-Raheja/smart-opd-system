import threading
import time
from flask import jsonify, request
from config.db import db
from bson import ObjectId
from datetime import datetime

appointments_collection = db["appointments"]

_last_appt_cleanup_time = 0

def _run_appointment_cleanups():
    _cleanup_expired_appointments()
    _auto_complete_past_active_appointments()

def _trigger_cleanup_routines_async():
    global _last_appt_cleanup_time
    now_ts = time.time()
    if now_ts - _last_appt_cleanup_time > 600:
        _last_appt_cleanup_time = now_ts
        threading.Thread(target=_run_appointment_cleanups, daemon=True).start()


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
        today = datetime.now().strftime("%Y-%m-%d")
        appointments_collection.update_many({
            "appointment_date": {"$lt": today},
            "status": "Scheduled"
        }, {
            "$set": {"status": "Cancelled"}
        })
    except Exception as e:
        print(f"[AppointmentController] Error in cleanup: {e}")


def _auto_complete_past_active_appointments():
    try:
        now = datetime.now()
        current_date_str = now.strftime("%Y-%m-%d")
        
        # Query Checked-In and In Consultation appointments
        query = {
            "status": {"$in": ["Checked-In", "In Consultation"]}
        }
        
        to_complete_ids = []
        for appt in appointments_collection.find(query):
            appt_date = appt.get("appointment_date")
            appt_time = appt.get("appointment_time")
            
            if not appt_date:
                continue
                
            # Case 1: Date is strictly in the past
            if appt_date < current_date_str:
                to_complete_ids.append(appt["_id"])
                continue
                
            # Case 2: Date is today, check if 2+ hours have passed since scheduled start time
            if appt_date == current_date_str and appt_time:
                try:
                    appt_h, appt_m = map(int, appt_time.split(":"))
                    appt_dt = now.replace(hour=appt_h, minute=appt_m, second=0, microsecond=0)
                    diff_seconds = (now - appt_dt).total_seconds()
                    if diff_seconds >= 2 * 3600:  # 2 hours
                        to_complete_ids.append(appt["_id"])
                except Exception:
                    pass
                    
        if to_complete_ids:
            appointments_collection.update_many(
                {"_id": {"$in": to_complete_ids}},
                {"$set": {"status": "Completed"}}
            )
            print(f"[AppointmentController] Auto-completed {len(to_complete_ids)} past active appointments.")
    except Exception as e:
        print(f"[AppointmentController] Error in auto-complete: {e}")


def get_appointments():
    _trigger_cleanup_routines_async()
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
    _trigger_cleanup_routines_async()
    today = datetime.now().strftime("%Y-%m-%d")
    query = {**_opd_query(), "appointment_date": today}
    appointments = []
    for a in appointments_collection.find(query):
        a["_id"] = str(a["_id"])
        a["duration"] = int(a.get("duration", 15))
        appointments.append(a)
    return jsonify(appointments)
