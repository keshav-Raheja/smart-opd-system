from flask import Blueprint

from controllers.visit_controller import (
    create_visit,
    get_patient_visits,
    get_patient_summary,
    search_diagnoses,
)

from middleware.auth_middleware import (
    token_required,
    role_required,
)

visit_bp = Blueprint("visit_bp", __name__)

# ── Create a new visit ─────────────────────────────────────────────────────────
visit_bp.route("/", methods=["POST"])(
    token_required(
        role_required(["Doctor"])(create_visit)
    )
)

# ── Get all visits for a patient (newest first) ────────────────────────────────
visit_bp.route("/patient/<patient_id>", methods=["GET"])(
    token_required(
        role_required(["Doctor", "Admin", "Receptionist"])(get_patient_visits)
    )
)

# ── Lifetime patient summary (visits + billing totals) ─────────────────────────
visit_bp.route("/summary/<patient_id>", methods=["GET"])(
    token_required(
        role_required(["Doctor", "Admin", "Receptionist"])(get_patient_summary)
    )
)

# ── Search diagnosis autocompletes ─────────────────────────────────────────────
visit_bp.route("/diagnoses/search", methods=["GET"])(
    token_required(
        role_required(["Doctor", "Admin", "Receptionist"])(search_diagnoses)
    )
)