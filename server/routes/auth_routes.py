from flask import Blueprint
from controllers.auth_controller import register, login, create_receptionist, delete_receptionist
from middleware.auth_middleware import token_required, role_required

auth_bp = Blueprint("auth", __name__)

_STAFF_MANAGERS = ["Doctor", "Admin"]

auth_bp.route("/register", methods=["POST"])(register)
auth_bp.route("/login", methods=["POST"])(login)
auth_bp.route("/create-receptionist", methods=["POST"])(
    token_required(role_required(_STAFF_MANAGERS)(create_receptionist))
)
auth_bp.route("/receptionist/<receptionist_id>", methods=["DELETE"])(
    token_required(role_required(_STAFF_MANAGERS)(delete_receptionist))
)