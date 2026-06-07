from flask import request, jsonify
from config.db import db

import bcrypt
import jwt
import datetime
import os

users_collection = db["users"]
opds_collection  = db["opds"]

JWT_SECRET = os.getenv("JWT_SECRET")


def register():
    data     = request.json
    name     = data.get("name")
    email    = data.get("email")
    password = data.get("password")

    existing_user = users_collection.find_one({"email": email})
    if existing_user:
        return jsonify({"message": "User already exists"}), 400

    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    user_data = {
        "name":       name,
        "email":      email,
        "password":   hashed_password,
        "role":       data.get("role", "Receptionist"),
        "opd_id":     None,   # Admin assigns to an OPD after registration
        "opd_type":   None,
        "created_at": datetime.datetime.utcnow(),
    }

    users_collection.insert_one(user_data)
    return jsonify({"message": "User registered successfully"}), 201


def login():
    data     = request.json
    email    = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"message": "Invalid email"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"message": "Invalid password"}), 401

    # Fetch fresh OPD details so name is always up-to-date
    opd_id   = user.get("opd_id")
    opd_type = user.get("opd_type")
    opd_name = None

    if opd_id:
        try:
            from bson import ObjectId
            opd_doc = opds_collection.find_one({"_id": ObjectId(opd_id)}, {"name": 1, "type": 1})
            if opd_doc:
                opd_name = opd_doc.get("name")
                opd_type = opd_doc.get("type", opd_type)
        except Exception:
            pass

    token = jwt.encode(
        {
            "user_id":  str(user["_id"]),
            "name":     user["name"],
            "email":    user["email"],
            "role":     user.get("role", "Receptionist"),
            "opd_id":   opd_id,
            "opd_type": opd_type,
            "opd_name": opd_name,
            "exp":      datetime.datetime.utcnow() + datetime.timedelta(days=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    return jsonify({
        "message": "Login successful",
        "token":   token,
        "user": {
            "id":       str(user["_id"]),
            "name":     user["name"],
            "email":    user["email"],
            "role":     user.get("role", "Receptionist"),
            "opd_id":   opd_id,
            "opd_type": opd_type,
            "opd_name": opd_name,
        },
    }), 200