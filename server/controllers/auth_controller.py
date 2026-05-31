from flask import request, jsonify
from config.db import db

import bcrypt
import jwt
import datetime
import os

users_collection = db["users"]

JWT_SECRET = os.getenv("JWT_SECRET")


def register():

    data = request.json

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    existing_user = users_collection.find_one({
        "email": email
    })

    if existing_user:

        return jsonify({
            "message": "User already exists"
        }), 400

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    user_data = {
        "name": name,
        "email": email,
        "password": hashed_password,

        # Default secure role
        "role": data.get(
            "role",
            "Receptionist"
        ),

        "created_at": datetime.datetime.utcnow()
    }

    users_collection.insert_one(user_data)

    return jsonify({
        "message": "User registered successfully"
    }), 201


def login():

    data = request.json

    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({
        "email": email
    })

    if not user:

        return jsonify({
            "message": "Invalid email"
        }), 401

    password_match = bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"]
    )

    if not password_match:

        return jsonify({
            "message": "Invalid password"
        }), 401

    token = jwt.encode(

        {
            "user_id": str(user["_id"]),

            "name": user["name"],

            "email": user["email"],

            "role": user.get("role", "Receptionist"),

            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)

        },

        JWT_SECRET,

        algorithm="HS256"
    )

    return jsonify({

        "message": "Login successful",

        "token": token,

        "user": {

            "id": str(user["_id"]),

            "name": user["name"],

            "email": user["email"],

            "role": user.get("role", "Receptionist")

        }

    }), 200