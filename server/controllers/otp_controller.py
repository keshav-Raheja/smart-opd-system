from flask import request, jsonify
from flask_mail import Message
from config.mail_config import mail
from config.db import db
import random
import datetime

otp_collection = db["otp_verifications"]


def send_otp():

    data = request.json

    email = data.get("email")

    if not email:

        return jsonify({
            "message": "Email required"
        }), 400

    otp = str(random.randint(100000, 999999))

    otp_collection.insert_one({
        "email": email,
        "otp": otp,
        "created_at": datetime.datetime.utcnow()
    })

    msg = Message(
        "Smart OPD Verification OTP",
        sender="Smart OPD",
        recipients=[email]
    )

    msg.body = f"""
Your Smart OPD verification OTP is:

{otp}

This OTP is valid for 5 minutes.
"""

    mail.send(msg)

    return jsonify({
        "message": "OTP sent successfully"
    }), 200


def verify_otp():

    data = request.json

    email = data.get("email")

    otp = data.get("otp")

    otp_data = otp_collection.find_one({
        "email": email,
        "otp": otp
    })

    if not otp_data:

        return jsonify({
            "message": "Invalid OTP"
        }), 400

    return jsonify({
        "message": "OTP verified successfully"
    }), 200