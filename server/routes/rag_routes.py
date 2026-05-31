from flask import Blueprint
from controllers.rag_controller import analyze_report, analyze_uploaded_report

rag_bp = Blueprint("rag", __name__)

# Analyze an existing report by report_id or filepath
rag_bp.route("/analyze", methods=["POST"])(analyze_report)

# Analyze a freshly uploaded file (multipart)
rag_bp.route("/analyze-upload", methods=["POST"])(analyze_uploaded_report)
