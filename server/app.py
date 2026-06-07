from flask import Flask
from flask_cors import CORS

from routes.auth_routes import auth_bp
from routes.patient_routes import patient_bp
from routes.visit_routes import visit_bp
from routes.medicine_routes import medicine_bp
from routes.upload_routes import upload_bp
from config.mail_config import configure_mail
from routes.otp_routes import otp_bp
from routes.pdf_routes import pdf_bp
from routes.dashboard_routes import dashboard_bp
from routes.appointment_routes import appointment_bp
from routes.rag_routes import rag_bp
from routes.billing_routes import billing_bp
from routes.fee_config_routes import fee_config_bp
from routes.opd_routes import opd_bp

# ── Seed default fee catalogue on first run ────────────────────────────────────
from controllers.fee_config_controller import seed_fee_config

app = Flask(__name__)

configure_mail(app)

CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(auth_bp,        url_prefix="/api/auth")
app.register_blueprint(patient_bp,     url_prefix="/api/patients")
app.register_blueprint(visit_bp,       url_prefix="/api/visits")
app.register_blueprint(medicine_bp,    url_prefix="/api/medicines")
app.register_blueprint(upload_bp,      url_prefix="/api/uploads")
app.register_blueprint(otp_bp,         url_prefix="/api/otp")
app.register_blueprint(pdf_bp,         url_prefix="/api/pdf")
app.register_blueprint(dashboard_bp,   url_prefix="/api/dashboard")
app.register_blueprint(appointment_bp, url_prefix="/api/appointments")
app.register_blueprint(rag_bp,         url_prefix="/api/rag")
app.register_blueprint(billing_bp,     url_prefix="/api/billing")
app.register_blueprint(fee_config_bp,  url_prefix="/api/fee-config")
app.register_blueprint(opd_bp,         url_prefix="/api/opd")


@app.route("/")
def home():
    return {
        "message": "Smart OPD Backend Running Successfully",
        "version": "3.0 — Advanced with RAG AI + Billing System"
    }


# ── Run seed after app context is ready ───────────────────────────────────────
with app.app_context():
    seed_fee_config()


if __name__ == "__main__":
    app.run(debug=True)