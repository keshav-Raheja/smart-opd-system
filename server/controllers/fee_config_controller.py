"""
fee_config_controller.py  — Doctor-scoped fee catalogue
─────────────────────────────────────────────────────────
Design
──────
• Global fees  (doctor_id = None) — seeded defaults visible to ALL doctors
  unless the doctor has explicitly hidden them via a personal override.
• Doctor fees   (doctor_id = <id>) — items created by that specific doctor;
  visible ONLY to them (and Admin).

Listing rules
─────────────
  Doctor role  → returns (global active fees) + (their own fees), deduped
  Admin  role  → returns all fees; optionally filter by doctor_id query param

Write rules
───────────
  Doctor → can only create/edit/delete their OWN (doctor_id = their id)
  Admin  → can create/edit/delete any item, including global ones
"""

from datetime import datetime, timezone
from flask import request, jsonify
from bson import ObjectId

from config.db import fee_config_collection


# ─────────────────────────────────────────────────────────────────────────────
# SEED DATA  (global — doctor_id absent / None)
# ─────────────────────────────────────────────────────────────────────────────
SEED_FEES = [
    # ── Consultation types ─────────────────────────────────────────────────
    {"category": "consultation_type", "name": "General OPD",
     "code": "CONS_GEN",   "default_fee": 200, "is_active": True,
     "description": "Standard outpatient consultation"},
    {"category": "consultation_type", "name": "Follow-Up",
     "code": "CONS_FU",    "default_fee": 100, "is_active": True,
     "description": "Follow-up visit (same complaint)"},
    {"category": "consultation_type", "name": "Specialist",
     "code": "CONS_SPEC",  "default_fee": 500, "is_active": True,
     "description": "Specialist / senior consultant"},
    {"category": "consultation_type", "name": "Emergency",
     "code": "CONS_EMG",   "default_fee": 800, "is_active": True,
     "description": "Emergency / out-of-hours consultation"},

    # ── Diagnosis categories ───────────────────────────────────────────────
    {"category": "diagnosis_category", "name": "Fever / Viral Infection",
     "code": "DX_FEVER",   "default_fee": 100, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Hypertension",
     "code": "DX_HTN",     "default_fee": 150, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Diabetes",
     "code": "DX_DM",      "default_fee": 150, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Respiratory / Asthma",
     "code": "DX_RESP",    "default_fee": 200, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Gastroenteritis",
     "code": "DX_GI",      "default_fee": 120, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Fracture / Ortho",
     "code": "DX_ORTHO",   "default_fee": 500, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Cardiac / Heart",
     "code": "DX_CARDIAC", "default_fee": 600, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Skin / Dermatology",
     "code": "DX_SKIN",    "default_fee": 180, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Neurological",
     "code": "DX_NEURO",   "default_fee": 350, "is_active": True, "description": ""},
    {"category": "diagnosis_category", "name": "Gynaecology / OB",
     "code": "DX_GYN",     "default_fee": 300, "is_active": True, "description": ""},

    # ── Lab tests ──────────────────────────────────────────────────────────
    {"category": "lab_test", "name": "Complete Blood Count (CBC)",
     "code": "LAB_CBC",    "default_fee": 150, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "Liver Function Test (LFT)",
     "code": "LAB_LFT",    "default_fee": 300, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "Kidney Function Test (KFT)",
     "code": "LAB_KFT",    "default_fee": 300, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "Blood Glucose / HbA1c",
     "code": "LAB_GLUC",   "default_fee": 120, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "Lipid Profile",
     "code": "LAB_LIPID",  "default_fee": 250, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "Thyroid (TSH / T3 / T4)",
     "code": "LAB_THYROID","default_fee": 350, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "Urine Routine",
     "code": "LAB_URINE",  "default_fee": 80,  "is_active": True, "description": ""},
    {"category": "lab_test", "name": "X-Ray",
     "code": "LAB_XRAY",   "default_fee": 200, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "ECG",
     "code": "LAB_ECG",    "default_fee": 150, "is_active": True, "description": ""},
    {"category": "lab_test", "name": "MRI",
     "code": "LAB_MRI",    "default_fee": 3500,"is_active": True, "description": ""},
    {"category": "lab_test", "name": "CT Scan",
     "code": "LAB_CT",     "default_fee": 2500,"is_active": True, "description": ""},
    {"category": "lab_test", "name": "Ultrasound",
     "code": "LAB_USG",    "default_fee": 500, "is_active": True, "description": ""},

    # ── Other charges ──────────────────────────────────────────────────────
    {"category": "other", "name": "Dressing / Wound Care",
     "code": "OTH_DRESS",  "default_fee": 100, "is_active": True, "description": ""},
    {"category": "other", "name": "Injection / IV",
     "code": "OTH_INJ",    "default_fee": 50,  "is_active": True, "description": ""},
    {"category": "other", "name": "Nebulisation",
     "code": "OTH_NEB",    "default_fee": 80,  "is_active": True, "description": ""},
    {"category": "other", "name": "Physiotherapy (per session)",
     "code": "OTH_PHYSIO", "default_fee": 300, "is_active": True, "description": ""},
]

VALID_CATEGORIES = {"consultation_type", "diagnosis_category", "lab_test", "other"}


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# SEED  (run once at startup — only seeds global fees)
# ─────────────────────────────────────────────────────────────────────────────
def seed_fee_config():
    """Insert default global fee catalogue rows if none exist."""
    if fee_config_collection.count_documents({"doctor_id": None}) == 0:
        now = datetime.now(timezone.utc)
        rows = [
            {**f, "doctor_id": None, "doctor_name": None,
             "created_at": now, "updated_at": now}
            for f in SEED_FEES
        ]
        fee_config_collection.insert_many(rows)
        print(f"[FeeConfig] Seeded {len(rows)} global fee entries.")


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _current_user():
    """Returns (user_id, name, role) from the decoded JWT on request."""
    u = getattr(request, "user", {})
    return u.get("user_id"), u.get("name", ""), u.get("role", "")


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/fee-config/
#   Doctor  → global active + their own (hidden ones excluded)
#   Admin   → all; ?doctor_id=xxx to filter; ?scope=global|mine|all
# ─────────────────────────────────────────────────────────────────────────────
def list_fee_config():
    user_id, _, role = _current_user()
    category    = request.args.get("category")
    active_only = request.args.get("active_only", "true").lower() == "true"
    # Admin extras
    filter_doctor = request.args.get("doctor_id")   # Admin: filter by specific doctor
    scope         = request.args.get("scope", "")   # "global" | "mine" | "all"

    query = {}
    if category:
        query["category"] = category
    if active_only:
        query["is_active"] = True

    if role == "Admin":
        # Admin can see everything; optionally filter by doctor_id or scope
        if scope == "global":
            query["doctor_id"] = None
        elif scope == "mine":
            query["doctor_id"] = user_id
        elif filter_doctor:
            query["doctor_id"] = filter_doctor
        # else: no additional filter → returns all

        items = list(fee_config_collection.find(query).sort([("doctor_id", 1), ("category", 1)]))
        return jsonify([_serialize(i) for i in items]), 200

    else:
        # Non-admin (Doctor, Receptionist, Lab Staff):
        if role == "Doctor":
            # Doctors ONLY see their own custom specialty catalogue!
            personal_q = {"doctor_id": user_id, "is_active": True}
            if category:
                personal_q["category"] = category

            results = list(fee_config_collection.find(personal_q))
            results.sort(key=lambda x: (x.get("category", ""), x.get("name", "").lower()))
            return jsonify([_serialize(i) for i in results]), 200
        else:
            # Other staff (Receptionist, Lab Staff) see the global default active catalogue
            global_q = {"doctor_id": None, "is_active": True}
            if category:
                global_q["category"] = category

            results = list(fee_config_collection.find(global_q))
            results.sort(key=lambda x: (x.get("category", ""), x.get("name", "").lower()))
            return jsonify([_serialize(i) for i in results]), 200


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/fee-config/mine
#   Returns ONLY this doctor's personal fee items (not global ones)
#   Used by the FeeConfig management page for doctors
# ─────────────────────────────────────────────────────────────────────────────
def list_my_fees():
    user_id, _, role = _current_user()
    active_only = request.args.get("active_only", "false").lower() == "true"

    query = {"doctor_id": user_id}
    if active_only:
        query["is_active"] = True

    items = list(fee_config_collection.find(query).sort("category", 1))
    return jsonify([_serialize(i) for i in items]), 200


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/fee-config/
# ─────────────────────────────────────────────────────────────────────────────
def create_fee_config():
    user_id, user_name, role = _current_user()
    data = request.json or {}

    required = ["category", "name", "default_fee"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    if data["category"] not in VALID_CATEGORIES:
        return jsonify({"message": f"category must be one of {VALID_CATEGORIES}"}), 400

    try:
        fee = float(data["default_fee"])
        if fee < 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"message": "default_fee must be a non-negative number"}), 400

    now = datetime.now(timezone.utc)

    # Admin can create global fees (doctor_id = None) or specify a doctor
    # Doctor always creates under their own id
    if role == "Admin":
        doc_id   = data.get("doctor_id") or None
        doc_name = data.get("doctor_name") or None
    else:
        doc_id   = user_id
        doc_name = user_name

    doc = {
        "category":    data["category"],
        "name":        data["name"].strip(),
        "code":        data.get("code", "").strip().upper() or None,
        "default_fee": fee,
        "description": data.get("description", "").strip(),
        "is_active":   True,
        "doctor_id":   doc_id,
        "doctor_name": doc_name,
        "created_at":  now,
        "updated_at":  now,
    }

    result = fee_config_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return jsonify(doc), 201


# ─────────────────────────────────────────────────────────────────────────────
# PUT /api/fee-config/<id>
# ─────────────────────────────────────────────────────────────────────────────
def update_fee_config(fee_id):
    user_id, _, role = _current_user()
    data = request.json or {}

    existing = fee_config_collection.find_one({"_id": ObjectId(fee_id)})
    if not existing:
        return jsonify({"message": "Fee config not found"}), 404

    # Ownership check: Doctor can only edit their own items
    if role != "Admin" and existing.get("doctor_id") != user_id:
        return jsonify({"message": "You can only edit your own fee items"}), 403

    updates = {}
    if "name"        in data: updates["name"]        = data["name"].strip()
    if "default_fee" in data:
        try:    updates["default_fee"] = float(data["default_fee"])
        except: return jsonify({"message": "default_fee must be a number"}), 400
    if "description" in data: updates["description"] = data["description"].strip()
    if "is_active"   in data: updates["is_active"]   = bool(data["is_active"])
    if "code"        in data: updates["code"]         = data["code"].strip().upper()

    if not updates:
        return jsonify({"message": "No updatable fields provided"}), 400

    updates["updated_at"] = datetime.now(timezone.utc)

    result = fee_config_collection.find_one_and_update(
        {"_id": ObjectId(fee_id)},
        {"$set": updates},
        return_document=True,
    )
    return jsonify(_serialize(result)), 200


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/fee-config/<id>  → soft-delete (deactivate)
# ─────────────────────────────────────────────────────────────────────────────
def delete_fee_config(fee_id):
    user_id, _, role = _current_user()

    existing = fee_config_collection.find_one({"_id": ObjectId(fee_id)})
    if not existing:
        return jsonify({"message": "Fee config not found"}), 404

    if role != "Admin" and existing.get("doctor_id") != user_id:
        return jsonify({"message": "You can only delete your own fee items"}), 403

    fee_config_collection.find_one_and_update(
        {"_id": ObjectId(fee_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return jsonify({"message": "Fee item deactivated"}), 200
