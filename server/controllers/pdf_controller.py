from bson import ObjectId
from flask import send_file, jsonify
from config.db import db
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
import os
import tempfile
import datetime

patients_collection = db["patients"]
visits_collection   = db["visits"]
opds_collection     = db["opds"]

# ── Colour palette ────────────────────────────────────────────────────────────
C_DARK   = colors.HexColor("#0f172a")   # header background
C_ACCENT = colors.HexColor("#2563eb")   # section labels
C_LIGHT  = colors.HexColor("#eff6ff")   # table alt rows
C_MED    = colors.HexColor("#dbeafe")   # label cells
C_BORDER = colors.HexColor("#bfdbfe")
C_WHITE  = colors.white
C_GREY   = colors.HexColor("#64748b")
C_RED    = colors.HexColor("#dc2626")   # treated teeth

# Dental tooth numbering (FDI system)
UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"]
UPPER_LEFT  = ["21", "22", "23", "24", "25", "26", "27", "28"]
LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"]
LOWER_LEFT  = ["31", "32", "33", "34", "35", "36", "37", "38"]


def _styles():
    base = getSampleStyleSheet()

    def ps(name, **kw):
        return ParagraphStyle(name, parent=base["Normal"], **kw)

    return {
        "clinic":  ps("clinic",  fontSize=18, fontName="Helvetica-Bold",
                       textColor=C_WHITE, leading=22),
        "sub":     ps("sub",     fontSize=9,  textColor=colors.HexColor("#93c5fd"), leading=13),
        "section": ps("section", fontSize=10, fontName="Helvetica-Bold",
                       textColor=C_ACCENT, spaceBefore=10, spaceAfter=4),
        "body":    ps("body",    fontSize=9,  leading=14, textColor=C_DARK),
        "small":   ps("small",   fontSize=8,  textColor=C_GREY, leading=12),
        "footer":  ps("footer",  fontSize=7.5, textColor=C_GREY, alignment=1),
    }


def _header_table(opd_name, opd_type, opd_address, opd_contact, doctor_name, date_str, styles):
    """Returns the clinic letterhead block."""
    clinic_text = Paragraph(f"🏥 {opd_name or 'Smart OPD'}", styles["clinic"])
    type_line   = opd_type or "General"
    info_lines  = []
    if doctor_name:
        info_lines.append(f"<b>Dr. {doctor_name}</b>")
    if opd_address:
        info_lines.append(f"📍 {opd_address}")
    if opd_contact:
        info_lines.append(f"📞 {opd_contact}")
    info_lines.append(f"<i>Speciality: {type_line}</i>")
    sub_para = Paragraph("<br/>".join(info_lines), styles["sub"])

    header_data = [[clinic_text, sub_para, Paragraph(f"<b>Date:</b><br/>{date_str}", styles["sub"])]]
    t = Table(header_data, colWidths=[2.8*inch, 3.5*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), C_DARK),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING",      (0, 0), (-1, -1), 12),
        ("ALIGN",        (2, 0), (2, 0),   "RIGHT"),
    ]))
    return t


def _patient_info_table(patient, styles):
    data = [
        ["Patient Name", patient.get("name", "N/A"),
         "Blood Group",  patient.get("blood_group", "N/A")],
        ["Age",          str(patient.get("age", "N/A")),
         "Gender",       patient.get("gender", "N/A")],
        ["Phone",        patient.get("phone", "N/A"),
         "Address",      patient.get("address", "N/A")],
    ]
    t = Table(data, colWidths=[1.1*inch, 2.4*inch, 1.1*inch, 2.9*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), C_MED),
        ("BACKGROUND",  (2, 0), (2, -1), C_MED),
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",    (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8.5),
        ("PADDING",     (0, 0), (-1, -1), 6),
        ("GRID",        (0, 0), (-1, -1), 0.4, C_BORDER),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _dental_chart_table(dental_chart, styles):
    """Renders a visual 2-row tooth chart table for the prescription."""
    if not dental_chart:
        return None

    treated = {t: d for t, d in dental_chart.items() if d.get("done")}
    if not treated:
        return None

    elements = []
    elements.append(Paragraph("🦷  Dental Chart — Treated Teeth", styles["section"]))

    # Build tooth cells for upper jaw
    def _tooth_cell(tooth_id):
        is_treated = tooth_id in treated
        proc = treated[tooth_id].get("procedure", "•") if is_treated else ""
        bg   = C_RED if is_treated else colors.HexColor("#f8fafc")
        fg   = C_WHITE if is_treated else C_GREY
        return Paragraph(
            f"<font color='{'white' if is_treated else '#94a3b8'}'><b>{tooth_id}</b><br/>"
            f"<font size='6'>{proc[:6] if proc else ''}</font></font>",
            ParagraphStyle("tc", fontName="Helvetica", fontSize=7,
                           textColor=fg, alignment=1, leading=9)
        ), bg

    upper_row_cells = []
    upper_row_bgs   = []
    for t in UPPER_RIGHT + UPPER_LEFT:
        cell, bg = _tooth_cell(t)
        upper_row_cells.append(cell)
        upper_row_bgs.append(bg)

    lower_row_cells = []
    lower_row_bgs   = []
    for t in LOWER_RIGHT + LOWER_LEFT:
        cell, bg = _tooth_cell(t)
        lower_row_cells.append(cell)
        lower_row_bgs.append(bg)

    col_w = [0.43 * inch] * 16
    chart_data = [upper_row_cells, lower_row_cells]
    chart = Table(chart_data, colWidths=col_w, rowHeights=[0.52*inch, 0.52*inch])

    style_cmds = [
        ("GRID",    (0, 0), (-1, -1), 0.4, C_BORDER),
        ("ALIGN",   (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",  (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 3),
    ]
    for col_idx, bg in enumerate(upper_row_bgs):
        style_cmds.append(("BACKGROUND", (col_idx, 0), (col_idx, 0), bg))
    for col_idx, bg in enumerate(lower_row_bgs):
        style_cmds.append(("BACKGROUND", (col_idx, 1), (col_idx, 1), bg))

    chart.setStyle(TableStyle(style_cmds))
    elements.append(chart)

    # Treated teeth legend
    if treated:
        legend_lines = []
        for tooth_id, info in sorted(treated.items()):
            proc  = info.get("procedure", "Procedure")
            notes = info.get("notes", "")
            line  = f"<b>Tooth #{tooth_id}</b> — {proc}"
            if notes:
                line += f" <i>({notes})</i>"
            legend_lines.append(line)
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(
            "  •  ".join(legend_lines),
            ParagraphStyle("legend", fontName="Helvetica", fontSize=8,
                           textColor=C_DARK, leading=13)
        ))

    return elements


def generate_prescription_pdf(patient_id):
    patient = patients_collection.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        return jsonify({"message": "Patient not found"}), 404

    visits = list(
        visits_collection.find({"patient_id": patient_id}).sort("created_at", -1)
    )

    # Fetch OPD info
    opd_name = opd_address = opd_contact = opd_type = None
    opd_id   = patient.get("opd_id")
    if opd_id:
        try:
            opd = opds_collection.find_one({"_id": ObjectId(opd_id)})
            if opd:
                opd_name    = opd.get("name", "Smart OPD")
                opd_type    = opd.get("type", "General")
                opd_address = opd.get("address", "")
                opd_contact = opd.get("contact", "")
        except Exception:
            pass

    # Use doctor name from latest visit
    doctor_name = visits[0].get("doctor_name", "") if visits else ""

    # ── Build PDF ─────────────────────────────────────────────────────────────
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False,
                                      prefix=f"rx_{patient_id}_")
    pdf_path = tmp.name
    tmp.close()

    doc = SimpleDocTemplate(
        pdf_path, pagesize=letter,
        topMargin=0.4*inch, bottomMargin=0.5*inch,
        leftMargin=0.65*inch, rightMargin=0.65*inch
    )

    styles = _styles()
    date_str = datetime.datetime.utcnow().strftime("%d %b %Y")
    elements = []

    # ① Clinic Header
    elements.append(_header_table(opd_name, opd_type, opd_address,
                                  opd_contact, doctor_name, date_str, styles))
    elements.append(Spacer(1, 10))

    # ② Patient Info
    elements.append(Paragraph("PATIENT DETAILS", styles["section"]))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    elements.append(Spacer(1, 4))
    elements.append(_patient_info_table(patient, styles))
    elements.append(Spacer(1, 12))

    if not visits:
        elements.append(Paragraph("No visit records found.", styles["body"]))
    else:
        for i, visit in enumerate(visits):
            visit_date = visit.get("created_at", "")
            if hasattr(visit_date, "strftime"):
                visit_date = visit_date.strftime("%d %B %Y")

            visit_block = []

            # Visit header
            visit_block.append(Paragraph(
                f"VISIT #{i + 1} — {visit_date}  |  "
                f"Dr. {visit.get('doctor_name', 'N/A')}",
                styles["section"]
            ))
            visit_block.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
            visit_block.append(Spacer(1, 4))

            # Vitals
            vitals = visit.get("vitals") or {}
            if any(vitals.values()):
                v_data = [
                    ["Blood Pressure", vitals.get("blood_pressure") or "—",
                     "Temperature",   vitals.get("temperature") or "—"],
                    ["Pulse",          vitals.get("pulse") or "—",
                     "Weight",         vitals.get("weight") or "—"],
                ]
                vt = Table(v_data, colWidths=[1.4*inch, 1.6*inch, 1.4*inch, 1.6*inch])
                vt.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (0, -1), C_MED),
                    ("BACKGROUND", (2, 0), (2, -1), C_MED),
                    ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME",   (2, 0), (2, -1), "Helvetica-Bold"),
                    ("FONTSIZE",   (0, 0), (-1, -1), 8.5),
                    ("PADDING",    (0, 0), (-1, -1), 5),
                    ("GRID",       (0, 0), (-1, -1), 0.4, C_BORDER),
                ]))
                visit_block.append(vt)
                visit_block.append(Spacer(1, 6))

            # Clinical details
            for label, key in [
                ("Chief Complaint / Symptoms", "symptoms"),
                ("Diagnosis",                  "diagnosis"),
                ("Clinical Notes",             "notes"),
            ]:
                val = visit.get(key, "")
                if val:
                    visit_block.append(Paragraph(
                        f"<b>{label}:</b>  {val}", styles["body"]
                    ))

            if visit.get("follow_up_date"):
                visit_block.append(Paragraph(
                    f"<b>Follow-up Date:</b>  {visit['follow_up_date']}", styles["body"]
                ))
            visit_block.append(Spacer(1, 6))

            # ── Dental Chart (only if data present) ──────────────────────────
            dental_chart = visit.get("dental_chart") or {}
            chart_elements = _dental_chart_table(dental_chart, styles)
            if chart_elements:
                visit_block.extend(chart_elements)
                visit_block.append(Spacer(1, 6))

            # ── Medications ──────────────────────────────────────────────────
            medicines = visit.get("prescription") or []
            if medicines:
                visit_block.append(Paragraph("<b>Prescribed Medicines</b>", styles["body"]))
                med_data = [["Medicine", "Dosage", "Frequency", "Duration", "Instructions"]]
                for med in medicines:
                    med_data.append([
                        med.get("name", "—"),
                        med.get("dosage", "—"),
                        med.get("frequency", "—"),
                        med.get("duration", "—"),
                        med.get("instructions", "—"),
                    ])
                med_table = Table(
                    med_data,
                    colWidths=[1.6*inch, 0.9*inch, 1.1*inch, 0.9*inch, 2.05*inch]
                )
                med_table.setStyle(TableStyle([
                    ("BACKGROUND",   (0, 0), (-1, 0), C_ACCENT),
                    ("TEXTCOLOR",    (0, 0), (-1, 0), C_WHITE),
                    ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE",     (0, 0), (-1, -1), 8),
                    ("PADDING",      (0, 0), (-1, -1), 5),
                    ("GRID",         (0, 0), (-1, -1), 0.4, C_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_LIGHT]),
                    ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                ]))
                visit_block.append(med_table)
                visit_block.append(Spacer(1, 6))

            # Signature line
            sig_data = [["", f"_____________________\nDr. {visit.get('doctor_name', '')}"]]
            sig = Table(sig_data, colWidths=[5.5*inch, 2.0*inch])
            sig.setStyle(TableStyle([
                ("ALIGN",   (1, 0), (1, 0), "CENTER"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]))
            visit_block.append(sig)
            visit_block.append(Spacer(1, 18))

            elements.append(KeepTogether(visit_block))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=0.8, color=C_DARK))
    elements.append(Spacer(1, 4))
    opd_display = opd_name or "Smart OPD System"
    elements.append(Paragraph(
        f"{opd_display}  •  Computer-generated prescription  •  "
        "Always follow your doctor's advice before making any medical decisions.",
        styles["footer"]
    ))

    doc.build(elements)

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=f"prescription_{patient.get('name', patient_id).replace(' ', '_')}.pdf",
        mimetype="application/pdf"
    )