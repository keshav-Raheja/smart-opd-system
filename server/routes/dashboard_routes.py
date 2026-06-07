from flask import Blueprint
from controllers.dashboard_controller import get_dashboard_stats
from middleware.auth_middleware import token_required, role_required

dashboard_bp = Blueprint("dashboard", __name__)

_ALL_STAFF = ["Doctor", "Receptionist", "Lab Staff", "Admin"]

dashboard_bp.route("/stats", methods=["GET"])(
    token_required(role_required(_ALL_STAFF)(get_dashboard_stats))
)