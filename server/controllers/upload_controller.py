from flask import request, jsonify
from config.db import db
from werkzeug.utils import secure_filename
import os
import datetime

reports_collection = db["reports"]

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".doc", ".docx"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def upload_report():
    patient_id = request.form.get("patient_id")
    report_type = request.form.get("report_type", "General")

    file = request.files.get("file")

    if not file:
        return jsonify({"message": "No file uploaded"}), 400

    if not file.filename:
        return jsonify({"message": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": f"File type not allowed. Supported: PDF, JPG, PNG, TIFF"}), 400

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()

    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{filename}"

    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    report_data = {
        "patient_id": patient_id,
        "filename": unique_filename,
        "original_filename": file.filename,
        "filepath": filepath,
        "report_type": report_type,
        "file_ext": ext,
        "uploaded_at": datetime.datetime.utcnow(),
    }

    result = reports_collection.insert_one(report_data)

    return jsonify({
        "message": "Report uploaded successfully",
        "file": unique_filename,
        "report_id": str(result.inserted_id),
        "report_type": report_type,
        "uploaded_at": datetime.datetime.utcnow().isoformat()
    }), 201


def get_patient_reports(patient_id):
    reports = []

    for report in reports_collection.find(
        {"patient_id": patient_id}
    ).sort("uploaded_at", -1):
        report["_id"] = str(report["_id"])
        # Serialize datetime
        if "uploaded_at" in report and hasattr(report["uploaded_at"], "isoformat"):
            report["uploaded_at"] = report["uploaded_at"].isoformat()
        reports.append(report)

    return jsonify(reports), 200