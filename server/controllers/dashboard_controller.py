"""
dashboard_controller.py
────────────────────────
Revenue from bills collection. Stats are OPD-scoped for non-admin users.
"""

from flask import jsonify, request
from config.db import (
    patients_collection,
    visits_collection,
    bills_collection,
    db,
)

reports_collection = db["reports"]


def get_dashboard_stats():
    user   = request.user
    role   = user.get("role")
    opd_id = user.get("opd_id")

    # Admin sees all; others see only their OPD
    if role == "Admin":
        base_filter = {}
    elif opd_id:
        base_filter = {"opd_id": opd_id}
    else:
        base_filter = {"opd_id": "__none__"}

    # ── Self-Healing: Auto-prune orphan documents (Admin only to avoid cross-OPD) ──
    if role == "Admin":
        try:
            existing_ids = set(str(p["_id"]) for p in patients_collection.find({}, {"_id": 1}))

            for col, key in [
                (visits_collection,   "patient_id"),
                (db["appointments"],  "patient_id"),
                (bills_collection,    "patient_id"),
            ]:
                docs    = list(col.find({}, {key: 1}))
                orphans = [d["_id"] for d in docs if d.get(key) and str(d[key]) not in existing_ids]
                if orphans:
                    col.delete_many({"_id": {"$in": orphans}})
        except Exception as e:
            print(f"[Self-Healing] Error: {e}")

    total_patients = patients_collection.count_documents(base_filter)
    total_visits   = visits_collection.count_documents(base_filter)
    total_reports  = reports_collection.count_documents({})

    revenue_pipeline = [
        {"$match": base_filter},
        {"$group": {
            "_id":             None,
            "total_collected": {"$sum": "$amount_paid"},
            "total_billed":    {"$sum": "$total_amount"},
            "total_pending":   {"$sum": "$amount_due"},
            "total_bills":     {"$sum": 1},
        }}
    ]
    rev_result = list(bills_collection.aggregate(revenue_pipeline))
    rev        = rev_result[0] if rev_result else {}

    return jsonify({
        "total_patients": total_patients,
        "total_visits":   total_visits,
        "total_reports":  total_reports,
        "total_revenue":  round(rev.get("total_collected", 0), 2),
        "total_billed":   round(rev.get("total_billed",    0), 2),
        "total_pending":  round(rev.get("total_pending",   0), 2),
        "total_bills":    rev.get("total_bills", 0),
    }), 200