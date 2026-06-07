from flask import Blueprint
from controllers.opd_controller import (
    create_opd,
    get_all_opds,
    get_unassigned_users,
    update_opd,
    delete_opd,
)
from middleware.auth_middleware import token_required, role_required

opd_bp = Blueprint("opd", __name__)

_ADMIN = ["Admin"]

opd_bp.route("/",            methods=["POST"])(token_required(role_required(_ADMIN)(create_opd)))
opd_bp.route("/",            methods=["GET"]) (token_required(role_required(_ADMIN)(get_all_opds)))
opd_bp.route("/unassigned",  methods=["GET"]) (token_required(role_required(_ADMIN)(get_unassigned_users)))
opd_bp.route("/<opd_id>",   methods=["PUT"]) (token_required(role_required(_ADMIN)(update_opd)))
opd_bp.route("/<opd_id>",   methods=["DELETE"])(token_required(role_required(_ADMIN)(delete_opd)))
