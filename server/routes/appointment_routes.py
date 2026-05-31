from flask import Blueprint

from controllers.appointment_controller import (
    get_today_appointments
)

from controllers.appointment_controller import (
    create_appointment,
    get_appointments,
    update_appointment_status,
    delete_appointment
)

appointment_bp = Blueprint("appointment_bp", __name__)

appointment_bp.route("/", methods=["POST"])(create_appointment)

appointment_bp.route("/", methods=["GET"])(get_appointments)

appointment_bp.route(
    "/<id>/status",
    methods=["PUT"]
)(update_appointment_status)

appointment_bp.route(
    "/<id>",
    methods=["DELETE"]
)(delete_appointment)

appointment_bp.route(
    "/today",
    methods=["GET"]
)(get_today_appointments)