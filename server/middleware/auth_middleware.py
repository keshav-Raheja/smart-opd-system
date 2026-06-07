from functools import wraps
from flask import request, jsonify
import jwt
import os

JWT_SECRET = os.getenv("JWT_SECRET")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token missing"}), 401

        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            # Expose full decoded payload including opd_id and opd_type
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated


def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user_role = request.user.get("role")
            if user_role not in allowed_roles:
                return jsonify({"message": "Access denied"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator