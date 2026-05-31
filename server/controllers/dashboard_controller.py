"""
dashboard_controller.py
────────────────────────
Revenue now comes from the bills collection (real data), not a dummy formula.
"""

from flask import jsonify
from config.db import (
    patients_collection,
    visits_collection,
    bills_collection,
    db,
)

reports_collection = db["reports"]


def get_dashboard_stats():
    # ── Self-Healing Database: Auto-prune any pre-existing orphan documents ──
    try:
        # Get set of all valid patient IDs (as strings)
        existing_patient_ids = set(str(p["_id"]) for p in patients_collection.find({}, {"_id": 1}))

        # 1. Prune orphan visits
        all_visits = list(visits_collection.find({}, {"patient_id": 1}))
        orphan_visit_ids = [v["_id"] for v in all_visits if v.get("patient_id") and str(v["patient_id"]) not in existing_patient_ids]
        if orphan_visit_ids:
            visits_collection.delete_many({"_id": {"$in": orphan_visit_ids}})

        # 2. Prune orphan appointments
        all_appts = list(db["appointments"].find({}, {"patient_id": 1}))
        orphan_appt_ids = [a["_id"] for a in all_appts if a.get("patient_id") and str(a["patient_id"]) not in existing_patient_ids]
        if orphan_appt_ids:
            db["appointments"].delete_many({"_id": {"$in": orphan_appt_ids}})

        # 3. Prune orphan bills
        all_bills = list(bills_collection.find({}, {"patient_id": 1}))
        orphan_bill_ids = [b["_id"] for b in all_bills if b.get("patient_id") and str(b["patient_id"]) not in existing_patient_ids]
        if orphan_bill_ids:
            bills_collection.delete_many({"_id": {"$in": orphan_bill_ids}})
    except Exception as e:
        print(f"[Self-Healing] Error pruning orphans: {e}")

    total_patients = patients_collection.count_documents({})
    total_visits   = visits_collection.count_documents({})
    total_reports  = reports_collection.count_documents({})

    # ── Real revenue: sum amount_paid across all bills ─────────────────────────
    revenue_pipeline = [
        {"$group": {
            "_id": None,
            "total_collected": {"$sum": "$amount_paid"},
            "total_billed":    {"$sum": "$total_amount"},
            "total_pending":   {"$sum": "$amount_due"},
            "total_bills":     {"$sum": 1},
        }}
    ]
    rev_result = list(bills_collection.aggregate(revenue_pipeline))
    rev = rev_result[0] if rev_result else {}

    total_revenue  = rev.get("total_collected", 0)
    total_billed   = rev.get("total_billed",    0)
    total_pending  = rev.get("total_pending",   0)
    total_bills    = rev.get("total_bills",     0)

    return jsonify({
        "total_patients": total_patients,
        "total_visits":   total_visits,
        "total_reports":  total_reports,
        # Revenue breakdown
        "total_revenue":  round(total_revenue, 2),   # actual cash collected
        "total_billed":   round(total_billed, 2),    # total invoiced
        "total_pending":  round(total_pending, 2),   # outstanding dues
        "total_bills":    total_bills,
    }), 200