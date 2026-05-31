from flask import Blueprint

from controllers.patient_controller import (
    add_patient,
    get_all_patients,
    get_single_patient,
    delete_patient
)

from middleware.auth_middleware import (
    token_required,
    role_required
)

patient_bp = Blueprint("patients", __name__)


@patient_bp.route("/", methods=["POST"])
@token_required
@role_required(["Doctor", "Admin"])
def create_patient():

    return add_patient()


@patient_bp.route("/", methods=["GET"])
@token_required
@role_required([
    "Doctor",
    "Admin",
    "Receptionist"
])
def patients():

    return get_all_patients()


@patient_bp.route("/<patient_id>", methods=["GET"])
@token_required
@role_required([
    "Doctor",
    "Admin",
    "Receptionist"
])
def single_patient(patient_id):

    return get_single_patient(patient_id)


@patient_bp.route("/<patient_id>", methods=["DELETE"])
@token_required
@role_required(["Doctor", "Admin"])
def remove_patient(patient_id):

    return delete_patient(patient_id)