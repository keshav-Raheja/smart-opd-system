from flask import Blueprint
from controllers.billing_controller import (
    create_bill,
    get_bills,
    get_bill,
    update_payment,
    get_revenue_stats,
    record_installment,
    edit_bill,
)
from middleware.auth_middleware import token_required, role_required

billing_bp = Blueprint("billing", __name__)

_ALL_STAFF = ["Doctor", "Receptionist", "Admin"]
_MANAGERS  = ["Doctor", "Admin"]

billing_bp.route("/", methods=["POST"])(
    token_required(role_required(_ALL_STAFF)(create_bill))
)

billing_bp.route("/", methods=["GET"])(
    token_required(role_required(_ALL_STAFF)(get_bills))
)

billing_bp.route("/stats/revenue", methods=["GET"])(
    token_required(role_required(_MANAGERS)(get_revenue_stats))
)

billing_bp.route("/<bill_id>", methods=["GET"])(
    token_required(role_required(_ALL_STAFF)(get_bill))
)

billing_bp.route("/<bill_id>", methods=["PUT"])(
    token_required(role_required(_MANAGERS)(edit_bill))
)

billing_bp.route("/<bill_id>/payment", methods=["PUT"])(
    token_required(role_required(_ALL_STAFF)(update_payment))
)

billing_bp.route("/<bill_id>/installment", methods=["POST"])(
    token_required(role_required(_MANAGERS)(record_installment))
)

