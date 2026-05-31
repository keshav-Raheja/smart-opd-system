from flask import Blueprint

from controllers.dashboard_controller import (
    get_dashboard_stats
)

dashboard_bp = Blueprint(
    "dashboard",
    __name__
)

dashboard_bp.route(
    "/stats",
    methods=["GET"]
)(get_dashboard_stats)