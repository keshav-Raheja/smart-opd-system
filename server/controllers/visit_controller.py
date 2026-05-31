"""
visit_controller.py — Visit CRUD + Patient summary
────────────────────────────────────────────────────
Endpoints:
  POST  /api/visits/                     create_visit
  GET   /api/visits/patient/<patient_id> get_patient_visits  (sorted newest-first)
  GET   /api/visits/summary/<patient_id> get_patient_summary (lifetime stats)
"""

from flask import request, jsonify
from config.db import visits_collection, bills_collection, appointments_collection
from bson import ObjectId
from datetime import datetime


def create_visit():
    data = request.json
    appointment_id = data.get("appointment_id")

    visit = {
        "patient_id":     data.get("patient_id"),
        "patient_name":   data.get("patient_name"),
        "appointment_id": appointment_id,
        "doctor_name":    data.get("doctor_name"),
        "symptoms":       data.get("symptoms"),
        "diagnosis":      data.get("diagnosis"),
        "notes":          data.get("notes"),
        "prescription":   data.get("prescription", []),
        "follow_up_date": data.get("follow_up_date"),
        "vitals": {
            "blood_pressure": data.get("blood_pressure"),
            "temperature":    data.get("temperature"),
            "pulse":          data.get("pulse"),
            "weight":         data.get("weight"),
        },
        "created_at": datetime.utcnow(),
    }

    result = visits_collection.insert_one(visit)

    # Automatically complete the appointment and clear it from Dr Queue
    if appointment_id:
        try:
            appointments_collection.update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": {"status": "Completed"}}
            )
        except Exception as e:
            print(f"[VisitController] Error updating appointment status: {e}")

    return jsonify({
        "message":  "Visit saved",
        "visit_id": str(result.inserted_id)
    }), 201


def get_patient_visits(patient_id):
    """
    Returns all visits for a patient sorted newest-first.
    Includes vitals so the UI can display them.
    """
    visits = list(
        visits_collection.find(
            {"patient_id": patient_id}
        ).sort("created_at", -1)          # newest first
    )

    for v in visits:
        v["_id"] = str(v["_id"])
        # Ensure created_at is ISO string
        if isinstance(v.get("created_at"), datetime):
            v["created_at"] = v["created_at"].isoformat()

    return jsonify(visits), 200


def get_patient_summary(patient_id):
    """
    Returns lifetime statistics for a patient:
      - total_visits
      - first_visit  / last_visit dates
      - total_billed / total_paid / total_due (from bills collection)
      - all unique diagnoses ever recorded
      - all unique medicines ever prescribed
    """
    visits = list(
        visits_collection.find(
            {"patient_id": patient_id},
            {"created_at": 1, "diagnosis": 1, "prescription": 1, "doctor_name": 1}
        ).sort("created_at", 1)
    )

    total_visits = len(visits)
    first_visit  = None
    last_visit   = None
    diagnoses    = set()
    medicines    = set()

    for v in visits:
        dt = v.get("created_at")
        if isinstance(dt, datetime):
            iso = dt.isoformat()
        else:
            iso = str(dt) if dt else None

        if iso:
            if first_visit is None:
                first_visit = iso
            last_visit = iso

        if v.get("diagnosis"):
            diagnoses.add(v["diagnosis"].strip())

        for m in (v.get("prescription") or []):
            name = m.get("name", "").strip()
            if name:
                medicines.add(name)

    # ── Billing aggregation ─────────────────────────────────────────────────────
    bill_pipeline = [
        {"$match": {"patient_id": patient_id}},
        {"$group": {
            "_id":            None,
            "total_billed":   {"$sum": "$total_amount"},
            "total_paid":     {"$sum": "$amount_paid"},
            "total_due":      {"$sum": "$amount_due"},
            "total_bills":    {"$sum": 1},
        }}
    ]
    bill_result = list(bills_collection.aggregate(bill_pipeline))
    billing = bill_result[0] if bill_result else {}
    billing.pop("_id", None)

    return jsonify({
        "patient_id":   patient_id,
        "total_visits": total_visits,
        "first_visit":  first_visit,
        "last_visit":   last_visit,
        "diagnoses":    sorted(diagnoses),
        "medicines":    sorted(medicines),
        "billing": {
            "total_billed": billing.get("total_billed", 0),
            "total_paid":   billing.get("total_paid",   0),
            "total_due":    billing.get("total_due",    0),
            "total_bills":  billing.get("total_bills",  0),
        }
    }), 200