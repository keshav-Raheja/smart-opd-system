import os
import sys
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

# Ensure we can load env
load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    print("Error: MONGO_URI environment variable not found in .env file.")
    sys.exit(1)

client = MongoClient(mongo_uri)
db = client["smart_opd"]

visits_col = db["visits"]
appts_col = db["appointments"]

# Date threshold (today's date)
TODAY_STR = "2026-06-17"

print("--- STARTING RETROACTIVE FOLLOW-UP APPOINTMENT MIGRATION ---")

# 1. Clean up any retroactive appointments created for past dates
deleted_result = appts_col.delete_many({
    "reason": "Follow-up (Retroactive)",
    "appointment_date": {"$lt": TODAY_STR}
})
if deleted_result.deleted_count > 0:
    print(f"Cleaned up {deleted_result.deleted_count} retroactive appointments that had past dates.")

# 2. Find all visits with a follow_up_date that is today or in the future
query = {
    "follow_up_date": {"$exists": True, "$ne": None, "$ne": "", "$gte": TODAY_STR}
}
visits = list(visits_col.find(query))
print(f"Found {len(visits)} visits containing a follow-up date today or in the future ({TODAY_STR}+).")

created_count = 0
skipped_count = 0

for idx, visit in enumerate(visits):
    patient_id = visit.get("patient_id")
    patient_name = visit.get("patient_name")
    doctor_name = visit.get("doctor_name") or "Doctor"
    follow_up_date = visit.get("follow_up_date")
    opd_id = visit.get("opd_id")
    
    # Check if we already have an appointment on this date for this patient
    existing = appts_col.find_one({
        "patient_id": patient_id,
        "appointment_date": follow_up_date
    })
    
    if existing:
        skipped_count += 1
        continue
        
    # Extract time and duration if they exist, else default/empty as requested
    follow_up_time = visit.get("follow_up_time", "")
    follow_up_duration = visit.get("follow_up_duration")
    if follow_up_duration is None:
         follow_up_duration = 15
    else:
         try:
             follow_up_duration = int(follow_up_duration)
         except ValueError:
             follow_up_duration = 15
             
    # Create the new scheduled appointment
    appt = {
        "patient_id": patient_id,
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "appointment_date": follow_up_date,
        "appointment_time": follow_up_time,
        "duration": follow_up_duration,
        "status": "Scheduled",
        "reason": "Follow-up (Retroactive)",
        "opd_id": opd_id,
        "created_at": datetime.utcnow()
    }
    
    appts_col.insert_one(appt)
    created_count += 1

print(f"Migration completed. Created: {created_count}, Skipped (Already existed): {skipped_count}")
