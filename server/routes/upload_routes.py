from flask import Blueprint

from controllers.upload_controller import (
    upload_report,
    get_patient_reports
)

upload_bp = Blueprint("uploads", __name__)

upload_bp.route("/", methods=["POST"])(upload_report)

upload_bp.route(
    "/patient/<patient_id>",
    methods=["GET"]
)(get_patient_reports)