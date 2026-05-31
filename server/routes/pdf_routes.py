from flask import Blueprint

from controllers.pdf_controller import (
    generate_prescription_pdf
)

pdf_bp = Blueprint("pdf", __name__)

pdf_bp.route(
    "/prescription/<patient_id>",
    methods=["GET"]
)(generate_prescription_pdf)