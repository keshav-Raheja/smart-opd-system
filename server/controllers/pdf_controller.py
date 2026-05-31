from bson import ObjectId
from flask import send_file, jsonify
from config.db import db
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
import os
import tempfile
import datetime

patients_collection = db["patients"]
visits_collection = db["visits"]


def generate_prescription_pdf(patient_id):

    patient = patients_collection.find_one({
        "_id": ObjectId(patient_id)
    })

    visits = list(
        visits_collection.find({
            "patient_id": patient_id
        }).sort("created_at", -1)
    )

    if not patient:
        return jsonify({"message": "Patient not found"}), 404

    # Use a temp file to avoid cluttering the root directory
    tmp = tempfile.NamedTemporaryFile(
        suffix=".pdf",
        delete=False,
        prefix=f"prescription_{patient_id}_"
    )
    pdf_path = tmp.name
    tmp.close()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=20,
        textColor=colors.HexColor("#1e3a5f"),
        spaceAfter=6
    )

    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=12,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14
    )

    elements = []

    # Header
    elements.append(Paragraph("🏥 Smart OPD System", title_style))
    elements.append(Paragraph("Medical Prescription Report", styles["Heading3"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 12))

    # Patient info table
    dob = patient.get("created_at", datetime.datetime.utcnow())
    patient_info = [
        ["Patient Name:", patient.get("name", "N/A"), "Blood Group:", patient.get("blood_group", "N/A")],
        ["Age:", str(patient.get("age", "N/A")), "Gender:", patient.get("gender", "N/A")],
        ["Phone:", patient.get("phone", "N/A"), "Address:", patient.get("address", "N/A")],
        ["Report Date:", datetime.datetime.utcnow().strftime("%d %B %Y"), "", ""],
    ]

    info_table = Table(patient_info, colWidths=[1.2 * inch, 2.3 * inch, 1.2 * inch, 2.3 * inch])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e8f0fe")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#e8f0fe")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 16))

    if not visits:
        elements.append(Paragraph("No visit records found.", body_style))
    else:
        for i, visit in enumerate(visits):
            visit_date = visit.get("created_at", "")
            if hasattr(visit_date, "strftime"):
                visit_date = visit_date.strftime("%d %B %Y")

            elements.append(Paragraph(
                f"Visit #{i+1} — {visit_date}",
                heading_style
            ))
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))

            # Doctor & vitals
            doctor = visit.get("doctor_name", "N/A")
            vitals = visit.get("vitals", {})

            elements.append(Paragraph(f"<b>Attending Doctor:</b> {doctor}", body_style))

            if vitals:
                vitals_data = [
                    ["Blood Pressure", vitals.get("blood_pressure", "—"),
                     "Temperature", vitals.get("temperature", "—")],
                    ["Pulse", vitals.get("pulse", "—"),
                     "Weight", vitals.get("weight", "—")],
                ]
                vt = Table(vitals_data, colWidths=[1.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch])
                vt.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f4ff")),
                    ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f0f4ff")),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ]))
                elements.append(Spacer(1, 4))
                elements.append(vt)

            elements.append(Spacer(1, 8))
            elements.append(Paragraph(f"<b>Symptoms:</b> {visit.get('symptoms', 'N/A')}", body_style))
            elements.append(Paragraph(f"<b>Diagnosis:</b> {visit.get('diagnosis', 'N/A')}", body_style))
            elements.append(Paragraph(f"<b>Notes:</b> {visit.get('notes', 'N/A')}", body_style))

            follow_up = visit.get("follow_up_date", "")
            if follow_up:
                elements.append(Paragraph(f"<b>Follow-up Date:</b> {follow_up}", body_style))

            # FIX: Use "prescription" key (not "medicines")
            medicines = visit.get("prescription", [])
            if medicines:
                elements.append(Spacer(1, 8))
                elements.append(Paragraph("<b>Prescribed Medicines:</b>", body_style))
                med_data = [["Medicine", "Dosage", "Frequency", "Duration", "Instructions"]]
                for med in medicines:
                    med_data.append([
                        med.get("name", "—"),
                        med.get("dosage", "—"),
                        med.get("frequency", "—"),
                        med.get("duration", "—"),
                        med.get("instructions", "—"),
                    ])
                med_table = Table(med_data, colWidths=[1.5*inch, 1.0*inch, 1.2*inch, 1.0*inch, 2.0*inch])
                med_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8faff")]),
                ]))
                elements.append(med_table)

            elements.append(Spacer(1, 16))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        "This prescription is computer-generated by Smart OPD System. "
        "Please consult your doctor before making any medical decisions.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey)
    ))

    doc.build(elements)

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=f"prescription_{patient.get('name', patient_id)}.pdf",
        mimetype="application/pdf"
    )