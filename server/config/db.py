from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv
import os

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")

client = MongoClient(mongo_uri)

db = client["smart_opd"]

# ── Core collections ───────────────────────────────────────────────────────────
users_collection         = db["users"]
patients_collection      = db["patients"]
appointments_collection  = db["appointments"]
visits_collection        = db["visits"]
medicines_collection     = db["medicines"]
uploads_collection       = db["uploads"]

# ── Billing collections ────────────────────────────────────────────────────────
bills_collection         = db["bills"]          # individual patient bills
fee_config_collection    = db["fee_config"]     # configurable fee catalogue

# ── Indexes for billing (idempotent — safe to run multiple times) ───────────────
bills_collection.create_index([("patient_id", ASCENDING)])
bills_collection.create_index([("visit_id", ASCENDING)])
bills_collection.create_index([("payment_status", ASCENDING)])
bills_collection.create_index([("created_at", DESCENDING)])
bills_collection.create_index([("bill_number", ASCENDING)], unique=True, sparse=True)

fee_config_collection.create_index([("category", ASCENDING)])
fee_config_collection.create_index([("is_active", ASCENDING)])
fee_config_collection.create_index([("doctor_id", ASCENDING)])
fee_config_collection.create_index([("doctor_id", ASCENDING), ("category", ASCENDING)])


# ── Indexes for visits (patient history queries) ────────────────────────────────
visits_collection.create_index([("patient_id", ASCENDING)])
visits_collection.create_index([("patient_id", ASCENDING), ("created_at", DESCENDING)])

# ── Index for medicine fast search ─────────────────────────────────────────────
try:
    medicines_collection.create_index([("name", ASCENDING)])
    medicines_collection.create_index([("name", "text")], name="medicine_name_text",
                                       default_language="english")
except Exception:
    pass   # index already exists