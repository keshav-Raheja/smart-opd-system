from flask import Blueprint
from controllers.billing_controller import (
    create_bill,
    get_bills,
    get_bill,
    update_payment,
    get_revenue_stats,
)

billing_bp = Blueprint("billing", __name__)

billing_bp.route("/", methods=["POST"])(create_bill)
billing_bp.route("/", methods=["GET"])(get_bills)
billing_bp.route("/stats/revenue", methods=["GET"])(get_revenue_stats)
billing_bp.route("/<bill_id>", methods=["GET"])(get_bill)
billing_bp.route("/<bill_id>/payment", methods=["PUT"])(update_payment)
