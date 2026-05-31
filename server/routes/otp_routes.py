from flask import Blueprint

from controllers.otp_controller import (
    send_otp,
    verify_otp
)

otp_bp = Blueprint("otp", __name__)

otp_bp.route(
    "/send",
    methods=["POST"]
)(send_otp)

otp_bp.route(
    "/verify",
    methods=["POST"]
)(verify_otp)