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
C_PRIMARY    = colors.HexColor("#0f172a")   # Slate 900
C_SECONDARY  = colors.HexColor("#0284c7")   # Sky 600
C_TEXT_DARK  = colors.HexColor("#1e293b")   # Slate 800
C_TEXT_MUTED = colors.HexColor("#64748b")   # Slate 500
C_BG_LIGHT   = colors.HexColor("#f8fafc")   # Slate 50
C_BORDER     = colors.HexColor("#e2e8f0")   # Slate 200
C_WHITE      = colors.white
C_GREY       = colors.HexColor("#94a3b8")

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
        "clinic_name":  ps("clinic_name",  fontSize=18, fontName="Helvetica-Bold",
                           textColor=C_PRIMARY, leading=22),
        "clinic_sub":   ps("clinic_sub",   fontSize=9.5, fontName="Helvetica-Bold",
                           textColor=C_SECONDARY, leading=13),
        "clinic_info":  ps("clinic_info",  fontSize=8.5, textColor=C_TEXT_MUTED, leading=12),
        "doctor_info":  ps("doctor_info",  fontSize=9, textColor=C_TEXT_DARK, leading=13, alignment=2),
        "section":      ps("section",      fontSize=10, fontName="Helvetica-Bold",
                           textColor=C_SECONDARY, spaceBefore=8, spaceAfter=4, leading=12),
        "body":         ps("body",         fontSize=9,  leading=14, textColor=C_TEXT_DARK),
        "body_bold":    ps("body_bold",    fontSize=9,  leading=14, fontName="Helvetica-Bold", textColor=C_TEXT_DARK),
        "small":        ps("small",        fontSize=8,  textColor=C_TEXT_MUTED, leading=12),
    }


def _header_table(opd_name, opd_type, opd_address, opd_contact, doctor_name, date_str, styles):
    """Returns the clinic letterhead block with a modern left/right alignment."""
    # Clinic details on the left
    clinic_text = Paragraph(f"🏥 {opd_name or 'Smart OPD'}", styles["clinic_name"])
    specialty_text = Paragraph(f"{opd_type or 'General'} Clinic", styles["clinic_sub"])
    
    info_parts = []
    if opd_address:
        info_parts.append(opd_address)
    if opd_contact:
        info_parts.append(f"📞 {opd_contact}")
    contact_text = Paragraph(" | ".join(info_parts), styles["clinic_info"])
    
    left_cell = [clinic_text, specialty_text, Spacer(1, 3), contact_text]

    # Doctor details on the right
    right_lines = []
    if doctor_name:
        right_lines.append(f"<b>Dr. {doctor_name}</b>")
        right_lines.append("Consulting Practitioner")
    right_lines.append(f"<b>Date:</b> {date_str}")
    
    right_cell = [Paragraph("<br/>".join(right_lines), styles["doctor_info"])]

    t = Table([[left_cell, right_cell]], colWidths=[4.5*inch, 3.0*inch])
    t.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("ALIGN",        (1, 0), (1, 0),   "RIGHT"),
        ("PADDING",      (0, 0), (-1, -1), 0),
    ]))
    return t


def _patient_info_table(patient, date_str, styles):
    """Clean patient details box styled as a unified light grey card."""
    data = [
        [
            Paragraph("<b>Patient Name:</b>", styles["body"]),
            Paragraph(patient.get("name", "N/A"), styles["body"]),
            Paragraph("<b>Blood Group:</b>", styles["body"]),
            Paragraph(patient.get("blood_group", "N/A"), styles["body"])
        ],
        [
            Paragraph("<b>Age / Gender:</b>", styles["body"]),
            Paragraph(f"{patient.get('age', 'N/A')} yrs / {patient.get('gender', 'N/A')}", styles["body"]),
            Paragraph("<b>Phone:</b>", styles["body"]),
            Paragraph(patient.get("phone", "N/A"), styles["body"])
        ],
        [
            Paragraph("<b>Address:</b>", styles["body"]),
            Paragraph(patient.get("address", "N/A"), styles["body"]),
            Paragraph("<b>Prescription Date:</b>", styles["body"]),
            Paragraph(date_str, styles["body"])
        ],
    ]
    t = Table(data, colWidths=[1.2*inch, 2.55*inch, 1.2*inch, 2.55*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), C_BG_LIGHT),
        ("PADDING",     (0, 0), (-1, -1), 6),
        ("BOX",         (0, 0), (-1, -1), 0.5, C_BORDER),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("INNERGRID",   (0, 0), (-1, -1), 0.3, C_BORDER),
    ]))
    return t


def _info_card(label, text, styles):
    """Renders a clean card with a left colored highlight bar."""
    card_data = [
        ["", Paragraph(f"<b>{label}</b><br/>{text}", styles["body"])]
    ]
    t = Table(card_data, colWidths=[0.05*inch, 7.45*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), C_SECONDARY),
        ("BACKGROUND", (1, 0), (1, 0), C_BG_LIGHT),
        ("PADDING",    (0, 0), (-1, -1), 6),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW",  (1, 0), (1, 0), 0.5, C_BORDER),
        ("LINEABOVE",  (1, 0), (1, 0), 0.5, C_BORDER),
        ("LINERIGHT",  (1, 0), (1, 0), 0.5, C_BORDER),
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
        proc = treated[tooth_id].get("procedure", "") if is_treated else ""
        bg   = C_SECONDARY if is_treated else colors.HexColor("#f8fafc")
        fg   = C_WHITE if is_treated else C_TEXT_MUTED
        
        text = f"<b>{tooth_id}</b>"
        if proc:
            text += f"<br/><font size='5.5'>{proc[:6]}</font>"
            
        return Paragraph(
            f"<font color='{'white' if is_treated else '#64748b'}'>{text}</font>",
            ParagraphStyle("tc", fontName="Helvetica-Bold" if is_treated else "Helvetica", fontSize=7.5,
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

    col_w = [0.45 * inch] * 16
    chart_data = [upper_row_cells, lower_row_cells]
    chart = Table(chart_data, colWidths=col_w, rowHeights=[0.52*inch, 0.52*inch], hAlign="CENTER")

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
            line  = f"<b>Tooth #{tooth_id}:</b> {proc}"
            if notes:
                line += f" <i>({notes})</i>"
            legend_lines.append(line)
        elements.append(Spacer(1, 4))
        
        legend_text = "  •  ".join(legend_lines)
        elements.append(Paragraph(
            f"ℹ️ {legend_text}",
            ParagraphStyle("legend", fontName="Helvetica", fontSize=8,
                           textColor=C_TEXT_DARK, leading=12)
        ))

    return elements


def _draw_footer(canvas, doc):
    """Draws a running line and document footer on every page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(C_TEXT_MUTED)
    
    # Draw a thin line above the footer
    canvas.setStrokeColor(C_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(36, 36, 576, 36)
    
    # Left disclaimer
    opd_display = getattr(doc, "opd_name", None) or "Smart OPD System"
    disclaimer = f"{opd_display}  •  Computer-Generated Prescription  •  Please consult your doctor."
    canvas.drawString(36, 24, disclaimer)
    
    # Right page number
    page_num = f"Page {doc.page}"
    canvas.drawRightString(576, 24, page_num)
    canvas.restoreState()


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

    # Margin 0.5 inches left/right gives exactly 7.5 inches of width
    doc = SimpleDocTemplate(
        pdf_path, pagesize=letter,
        topMargin=0.4*inch, bottomMargin=0.7*inch,
        leftMargin=0.5*inch, rightMargin=0.5*inch
    )
    # Store OPD name on document metadata to access it inside draw_footer
    doc.opd_name = opd_name

    styles = _styles()
    date_str = datetime.datetime.utcnow().strftime("%d %b %Y")
    elements = []

    # ① Clinic Header Letterhead
    elements.append(_header_table(opd_name, opd_type, opd_address,
                                  opd_contact, doctor_name, date_str, styles))
    
    # Decorative horizontal separator line below letterhead
    elements.append(HRFlowable(width="100%", thickness=2, color=C_SECONDARY, spaceBefore=4, spaceAfter=8))

    # ② Patient Info Card
    elements.append(_patient_info_table(patient, date_str, styles))
    elements.append(Spacer(1, 10))

    if not visits:
        elements.append(Paragraph("No visit records found.", styles["body"]))
    else:
        for i, visit in enumerate(visits):
            visit_date = visit.get("created_at", "")
            if hasattr(visit_date, "strftime"):
                visit_date = visit_date.strftime("%d %B %Y")

            visit_block = []

            # Visit Header Banner
            visit_block.append(Paragraph(
                f"VISIT #{i + 1} — {visit_date}  |  "
                f"Practitioner: Dr. {visit.get('doctor_name', 'N/A')}",
                styles["section"]
            ))
            visit_block.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceBefore=2, spaceAfter=6))

            # Vitals
            vitals = visit.get("vitals") or {}
            if any(vitals.values()):
                bp = vitals.get("blood_pressure") or "—"
                temp = vitals.get("temperature") or "—"
                pulse = vitals.get("pulse") or "—"
                weight = vitals.get("weight") or "—"
                
                v_data = [
                    [
                        Paragraph(f"🩸 <b>Blood Pressure</b><br/><font size='9.5'><b>{bp}</b></font> <font size='7'>mmHg</font>", styles["body"]),
                        Paragraph(f"🌡️ <b>Temperature</b><br/><font size='9.5'><b>{temp}</b></font> <font size='7'>°F</font>", styles["body"]),
                        Paragraph(f"💓 <b>Pulse Rate</b><br/><font size='9.5'><b>{pulse}</b></font> <font size='7'>bpm</font>", styles["body"]),
                        Paragraph(f"⚖️ <b>Weight</b><br/><font size='9.5'><b>{weight}</b></font> <font size='7'>kg</font>", styles["body"]),
                    ]
                ]
                vt = Table(v_data, colWidths=[1.875*inch] * 4)
                vt.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), C_BG_LIGHT),
                    ("BOX",        (0, 0), (-1, -1), 0.5, C_BORDER),
                    ("INNERGRID",  (0, 0), (-1, -1), 0.5, C_BORDER),
                    ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
                    ("PADDING",    (0, 0), (-1, -1), 6),
                ]))
                visit_block.append(vt)
                visit_block.append(Spacer(1, 8))

            # Clinical details (Symptoms, Diagnosis, Notes) styled as clean left-highlighted cards
            clinical_details = []
            if visit.get("symptoms"):
                clinical_details.append(("Chief Complaint / Symptoms", visit["symptoms"]))
            if visit.get("diagnosis"):
                clinical_details.append(("Diagnosis", visit["diagnosis"]))
            if visit.get("notes"):
                clinical_details.append(("Clinical Notes", visit["notes"]))
            if visit.get("follow_up_date"):
                clinical_details.append(("Follow-up Date", f"Please visit again on or before: <b>{visit['follow_up_date']}</b>"))
                
            for label, val in clinical_details:
                visit_block.append(_info_card(label, val, styles))
                visit_block.append(Spacer(1, 6))

            # ── Dental Chart (only if present) ──────────────────────────
            dental_chart = visit.get("dental_chart") or {}
            chart_elements = _dental_chart_table(dental_chart, styles)
            if chart_elements:
                visit_block.extend(chart_elements)
                visit_block.append(Spacer(1, 8))

            # ── Medications ℞ Table ──────────────────────────────────────────
            medicines = visit.get("prescription") or []
            if medicines:
                visit_block.append(Paragraph("<b>℞ Prescribed Medications</b>", styles["section"]))
                visit_block.append(Spacer(1, 4))
                
                # Table Headers
                med_data = [[
                    Paragraph("<b>Medicine Name</b>", ParagraphStyle("th", parent=styles["body_bold"], textColor=C_WHITE)),
                    Paragraph("<b>Dosage</b>", ParagraphStyle("thc", parent=styles["body_bold"], textColor=C_WHITE, alignment=1)),
                    Paragraph("<b>Frequency</b>", ParagraphStyle("thc", parent=styles["body_bold"], textColor=C_WHITE, alignment=1)),
                    Paragraph("<b>Duration</b>", ParagraphStyle("thc", parent=styles["body_bold"], textColor=C_WHITE, alignment=1)),
                    Paragraph("<b>Instructions</b>", ParagraphStyle("th", parent=styles["body_bold"], textColor=C_WHITE)),
                ]]
                
                # Table Rows
                for med in medicines:
                    med_data.append([
                        Paragraph(f"<b>{med.get('name', '—')}</b>", styles["body"]),
                        Paragraph(med.get("dosage", "—"), ParagraphStyle("tdc", parent=styles["body"], alignment=1)),
                        Paragraph(med.get("frequency", "—"), ParagraphStyle("tdc", parent=styles["body"], alignment=1)),
                        Paragraph(med.get("duration", "—"), ParagraphStyle("tdc", parent=styles["body"], alignment=1)),
                        Paragraph(med.get("instructions", "—"), styles["body"]),
                    ])
                    
                med_table = Table(
                    med_data,
                    colWidths=[2.3*inch, 0.95*inch, 1.25*inch, 0.95*inch, 2.05*inch]
                )
                med_table.setStyle(TableStyle([
                    ("BACKGROUND",   (0, 0), (-1, 0), C_SECONDARY),
                    ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
                    ("PADDING",      (0, 0), (-1, -1), 6),
                    ("BOX",          (0, 0), (-1, -1), 0.5, C_BORDER),
                    ("INNERGRID",    (0, 0), (-1, -1), 0.3, C_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_BG_LIGHT]),
                ]))
                visit_block.append(med_table)
                visit_block.append(Spacer(1, 10))

            # Authorized Signature block with signature line
            sig_lines = [
                f"<b>Dr. {visit.get('doctor_name', '')}</b>",
                "Authorized Signature / Stamp",
                f"<font size='7' color='#64748b'>Prescribed on: {visit_date}</font>"
            ]
            sig_para = Paragraph("<br/>".join(sig_lines), ParagraphStyle("sig", parent=styles["body"], alignment=2, leading=12))
            
            sig_table = Table([["", sig_para]], colWidths=[5.0*inch, 2.5*inch])
            sig_table.setStyle(TableStyle([
                ("VALIGN",   (0, 0), (-1, -1), "TOP"),
                ("PADDING",  (0, 0), (-1, -1), 0),
                ("LINEABOVE", (1, 0), (1, 0), 0.5, C_TEXT_MUTED),
            ]))
            visit_block.append(Spacer(1, 16))
            visit_block.append(sig_table)
            visit_block.append(Spacer(1, 16))

            elements.append(KeepTogether(visit_block))

    # Build document and run footer drawing callback
    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=f"prescription_{patient.get('name', patient_id).replace(' ', '_')}.pdf",
        mimetype="application/pdf"
    )