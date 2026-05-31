from flask_mail import Mail
from flask import Flask
import os

mail = Mail()

def configure_mail(app):

    app.config["MAIL_SERVER"] = "smtp.gmail.com"

    app.config["MAIL_PORT"] = 587

    app.config["MAIL_USE_TLS"] = True

    app.config["MAIL_USERNAME"] = os.getenv("EMAIL_USER")

    app.config["MAIL_PASSWORD"] = os.getenv("EMAIL_PASS")

    mail.init_app(app)