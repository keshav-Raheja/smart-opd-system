from flask import request, jsonify
from config.db import db
import random
import datetime
import os
import requests

otp_collection = db["otp_verifications"]

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM     = os.environ.get("EMAIL_FROM", "onboarding@resend.dev")   # sender address
EMAIL_USER     = os.environ.get("EMAIL_USER", "")                        # fallback display


def _send_via_resend(to_email: str, otp: str) -> None:
    """Send OTP email using Resend HTTPS API (works on Render free tier)."""
    payload = {
        "from":    f"Smart OPD System <{EMAIL_FROM}>",
        "to":      [to_email],
        "subject": "Smart OPD — Email Verification Code",
        "html": f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;
                    padding:32px;background:#f8faff;border-radius:12px;border:1px solid #e2e8f0;">
            <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#1e3a5f;font-size:24px;margin:0;">&#127973; Smart OPD System</h1>
                <p style="color:#64748b;margin:8px 0 0;">Email Verification</p>
            </div>
            <div style="background:white;border-radius:10px;padding:28px;
                        text-align:center;border:1px solid #e2e8f0;">
                <p style="color:#374151;font-size:15px;margin:0 0 20px;">
                    Your verification code is:
                </p>
                <div style="background:#1e3a5f;color:white;font-size:36px;font-weight:bold;
                            letter-spacing:10px;padding:20px;border-radius:10px;">
                    {otp}
                </div>
                <p style="color:#94a3b8;font-size:13px;margin:20px 0 0;">
                    This code expires in 5 minutes. Do not share it with anyone.
                </p>
            </div>
        </div>
        """,
        "text": f"Your Smart OPD verification OTP is: {otp}\n\nThis OTP is valid for 5 minutes.",
    }

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )

    if resp.status_code not in (200, 201):
        raise Exception(f"Resend API error {resp.status_code}: {resp.text}")


def send_otp():
    data  = request.json
    email = data.get("email")

    if not email:
        return jsonify({"message": "Email required"}), 400

    otp = str(random.randint(100000, 999999))

    # Remove old OTPs for this email, store fresh one
    otp_collection.delete_many({"email": email})
    otp_collection.insert_one({
        "email":      email,
        "otp":        otp,
        "created_at": datetime.datetime.utcnow(),
    })

    try:
        _send_via_resend(email, otp)
        return jsonify({"message": "OTP sent successfully"}), 200

    except Exception as e:
        return jsonify({"message": f"Email delivery failed: {str(e)}"}), 500


def verify_otp():
    data  = request.json
    email = data.get("email")
    otp   = data.get("otp")

    otp_data = otp_collection.find_one({"email": email, "otp": otp})

    if not otp_data:
        return jsonify({"message": "Invalid OTP"}), 400

    return jsonify({"message": "OTP verified successfully"}), 200