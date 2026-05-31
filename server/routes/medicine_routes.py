from flask import Blueprint

from controllers.medicine_controller import (
    search_medicines
)

from middleware.auth_middleware import (
    token_required
)

medicine_bp = Blueprint(
    "medicine_bp",
    __name__
)

medicine_bp.route(
    "/search",
    methods=["GET"]
)(
    token_required(
        search_medicines
    )
)