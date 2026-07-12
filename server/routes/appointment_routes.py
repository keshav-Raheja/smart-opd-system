from flask import Blueprint
from controllers.appointment_controller import (
    create_appointment,
    get_appointments,
    update_appointment_status,
    update_appointment,
    delete_appointment,
    get_today_appointments,
    bulk_schedule_appointments,
)
from middleware.auth_middleware import token_required, role_required

appointment_bp = Blueprint("appointment_bp", __name__)

_ALL_STAFF = ["Doctor", "Receptionist", "Admin"]
_MANAGERS  = ["Doctor", "Admin"]

appointment_bp.route("/", methods=["POST"])(
    token_required(role_required(_ALL_STAFF)(create_appointment))
)

appointment_bp.route("/bulk", methods=["POST"])(
    token_required(role_required(_ALL_STAFF)(bulk_schedule_appointments))
)

appointment_bp.route("/", methods=["GET"])(
    token_required(role_required(_ALL_STAFF)(get_appointments))
)

appointment_bp.route("/<id>/status", methods=["PUT"])(
    token_required(role_required(_ALL_STAFF)(update_appointment_status))
)

appointment_bp.route("/<id>", methods=["PUT"])(
    token_required(role_required(_ALL_STAFF)(update_appointment))
)

appointment_bp.route("/<id>", methods=["DELETE"])(
    token_required(role_required(_MANAGERS)(delete_appointment))
)

appointment_bp.route("/today", methods=["GET"])(
    token_required(role_required(_ALL_STAFF)(get_today_appointments))
)