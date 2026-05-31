from flask import Blueprint
from controllers.fee_config_controller import (
    list_fee_config,
    list_my_fees,
    create_fee_config,
    update_fee_config,
    delete_fee_config,
)
from middleware.auth_middleware import token_required, role_required

fee_config_bp = Blueprint("fee_config", __name__)

_ALL_CLINICAL = ["Admin", "Doctor", "Receptionist", "Lab Staff"]
_DOCTORS_AND_ADMIN = ["Admin", "Doctor"]

# GET /api/fee-config/         → list (doctor sees global+own; admin sees all)
fee_config_bp.route("/", methods=["GET"])(
    token_required(role_required(_ALL_CLINICAL)(list_fee_config))
)

# GET /api/fee-config/mine     → doctor's personal items only (for management UI)
fee_config_bp.route("/mine", methods=["GET"])(
    token_required(role_required(_DOCTORS_AND_ADMIN)(list_my_fees))
)

# POST /api/fee-config/        → create (doctor creates own; admin creates global or any)
fee_config_bp.route("/", methods=["POST"])(
    token_required(role_required(_DOCTORS_AND_ADMIN)(create_fee_config))
)

# PUT /api/fee-config/<id>     → update (own items only; admin: anything)
fee_config_bp.route("/<fee_id>", methods=["PUT"])(
    token_required(role_required(_DOCTORS_AND_ADMIN)(update_fee_config))
)

# DELETE /api/fee-config/<id>  → soft-delete (own items only; admin: anything)
fee_config_bp.route("/<fee_id>", methods=["DELETE"])(
    token_required(role_required(_DOCTORS_AND_ADMIN)(delete_fee_config))
)
