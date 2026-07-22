"""
visit_controller.py — Visit CRUD + Patient summary + Dental chart support
──────────────────────────────────────────────────────────────────────────
Endpoints:
  POST  /api/visits/                     create_visit
  GET   /api/visits/patient/<patient_id> get_patient_visits  (sorted newest-first)
  GET   /api/visits/summary/<patient_id> get_patient_summary (lifetime stats)
"""

from flask import request, jsonify
from config.db import visits_collection, bills_collection, appointments_collection, patients_collection
from bson import ObjectId
from datetime import datetime
from utils.workflow_orchestrator import ClinicalWorkflowOrchestrator


def create_visit():
    data           = request.json
    appointment_id = data.get("appointment_id")
    opd_id         = request.user.get("opd_id")

    visit = {
        "patient_id":     data.get("patient_id"),
        "patient_name":   data.get("patient_name"),
        "appointment_id": appointment_id,
        "doctor_name":    data.get("doctor_name"),
        "symptoms":       data.get("symptoms"),
        "diagnosis":      data.get("diagnosis"),
        "notes":          data.get("notes"),
        "prescription":   data.get("prescription", []),
        "follow_up_date": data.get("follow_up_date"),
        "opd_id":         opd_id,
        "vitals": {
            "blood_pressure": data.get("blood_pressure"),
            "temperature":    data.get("temperature"),
            "pulse":          data.get("pulse"),
            "weight":         data.get("weight"),
        },
        # Dental chart — only populated when OPD type is Dental
        # Format: { "tooth_number": { "procedure": "Root Canal", "done": true, "notes": "" } }
        "dental_chart":   data.get("dental_chart", {}),
        "created_at":     datetime.utcnow(),
    }

    result = visits_collection.insert_one(visit)

    # Automatically mark appointment as Completed
    if appointment_id:
        try:
            appointments_collection.update_one(
                {"_id": ObjectId(appointment_id)},
                {"$set": {"status": "Completed"}}
            )
        except Exception as e:
            print(f"[VisitController] Error updating appointment status: {e}")

    # Automatically schedule follow-up appointment if follow_up_date is provided
    follow_up_date = data.get("follow_up_date")
    if follow_up_date:
        follow_up_time = data.get("follow_up_time", "")
        follow_up_duration = data.get("follow_up_duration")
        if follow_up_duration is None:
            follow_up_duration = 15
        else:
            try:
                follow_up_duration = int(follow_up_duration)
            except ValueError:
                follow_up_duration = 15

        follow_up_appt = {
            "patient_id":        data.get("patient_id"),
            "patient_name":      data.get("patient_name"),
            "doctor_name":       data.get("doctor_name") or request.user.get("name", "Doctor"),
            "appointment_date":  follow_up_date,
            "appointment_time":  follow_up_time,
            "duration":          follow_up_duration,
            "status":            "Scheduled",
            "reason":            "Follow-up",
            "opd_id":            opd_id,
            "created_at":        datetime.utcnow(),
        }
        try:
            appointments_collection.insert_one(follow_up_appt)
        except Exception as e:
            print(f"[VisitController] Error creating follow-up appointment: {e}")

    return jsonify({"message": "Visit saved", "visit_id": str(result.inserted_id)}), 201


def get_patient_visits(patient_id):
    """Returns all visits for a patient sorted newest-first."""
    visits = list(
        visits_collection.find({"patient_id": patient_id}).sort("created_at", -1)
    )
    for v in visits:
        v["_id"] = str(v["_id"])
        if isinstance(v.get("created_at"), datetime):
            v["created_at"] = v["created_at"].isoformat()
    return jsonify(visits), 200


def get_patient_summary(patient_id):
    """Returns lifetime statistics for a patient."""
    visits = list(
        visits_collection.find(
            {"patient_id": patient_id},
            {"created_at": 1, "diagnosis": 1, "prescription": 1, "doctor_name": 1, "dental_chart": 1, "is_historical": 1}
        ).sort("created_at", 1)
    )

    patient = patients_collection.find_one({"_id": ObjectId(patient_id)})
    historical_visits = int(patient.get("historical_visits", 0)) if patient else 0
    non_historical_visits = len([v for v in visits if not v.get("is_historical")])
    total_visits = non_historical_visits + historical_visits
    first_visit  = None
    last_visit   = None
    diagnoses    = set()
    medicines    = set()

    # Aggregate dental chart across all visits
    tooth_history = {}   # { tooth_id: [{ procedure, done, date }] }

    for v in visits:
        dt = v.get("created_at")
        iso = dt.isoformat() if isinstance(dt, datetime) else (str(dt) if dt else None)

        if iso:
            if first_visit is None:
                first_visit = iso
            last_visit = iso

        if v.get("diagnosis"):
            diagnoses.add(v["diagnosis"].strip())

        for m in (v.get("prescription") or []):
            name = m.get("name", "").strip()
            if name:
                medicines.add(name)

        # Accumulate dental chart history
        for tooth_id, tooth_data in (v.get("dental_chart") or {}).items():
            if tooth_id not in tooth_history:
                tooth_history[tooth_id] = []
            tooth_history[tooth_id].append({
                "procedure": tooth_data.get("procedure", ""),
                "done":      tooth_data.get("done", False),
                "status":    tooth_data.get("status", "completed" if tooth_data.get("done") else "planned"),
                "session":   tooth_data.get("session", ""),
                "planned_visits": tooth_data.get("planned_visits", ""),
                "notes":     tooth_data.get("notes", ""),
                "date":      iso,
            })

    # Billing aggregation
    bill_pipeline = [
        {"$match": {"patient_id": patient_id}},
        {"$group": {
            "_id":          None,
            "total_billed": {"$sum": "$total_amount"},
            "total_paid":   {"$sum": "$amount_paid"},
            "total_due":    {"$sum": "$amount_due"},
            "total_bills":  {"$sum": 1},
        }}
    ]
    bill_result = list(bills_collection.aggregate(bill_pipeline))
    billing     = bill_result[0] if bill_result else {}
    billing.pop("_id", None)

    return jsonify({
        "patient_id":   patient_id,
        "total_visits": total_visits,
        "first_visit":  first_visit,
        "last_visit":   last_visit,
        "diagnoses":    sorted(diagnoses),
        "medicines":    sorted(medicines),
        "tooth_history": tooth_history,
        "billing": {
            "total_billed": billing.get("total_billed", 0),
            "total_paid":   billing.get("total_paid",   0),
            "total_due":    billing.get("total_due",    0),
            "total_bills":  billing.get("total_bills",  0),
        }
    }), 200


COMMON_DIAGNOSES = [
    "Dental Caries", "Pulpitis", "Apical Periodontitis", "Gingivitis", 
    "Chronic Periodontitis", "Periapical Abscess", "Impacted Tooth",
    "Hypertension", "Type 2 Diabetes", "Acute Upper Respiratory Infection", 
    "Gastroesophageal Reflux Disease", "Migraine", "Allergic Rhinitis",
    "Pulp necrosis", "Deep dentinal caries", "Reversible pulpitis", "Irreversible pulpitis"
]

def search_diagnoses():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify([]), 200

    opd_id = request.user.get("opd_id")
    match_q = {"diagnosis": {"$regex": query, "$options": "i"}}
    if opd_id:
        match_q["opd_id"] = opd_id

    try:
        results = list(visits_collection.aggregate([
            {"$match": match_q},
            {"$group": {"_id": "$diagnosis"}},
            {"$limit": 10}
        ]))
        db_diagnoses = [r["_id"] for r in results if r.get("_id")]
    except Exception as e:
        print(f"[VisitController] Error searching diagnoses: {e}")
        db_diagnoses = []

    merged = list(db_diagnoses)
    for cd in COMMON_DIAGNOSES:
        if query.lower() in cd.lower() and cd not in merged:
            merged.append(cd)
            if len(merged) >= 10:
                break

    return jsonify(merged[:10]), 200


def get_treatments_dashboard():
    role   = request.user.get("role")
    opd_id = request.user.get("opd_id")
    doctor_filter = request.args.get("doctor")
    
    # Non-admin: filter by OPD
    if role == "Admin":
        patients_query = {}
    elif opd_id:
        patients_query = {"opd_id": opd_id}
    else:
        patients_query = {"opd_id": "__none__"}
        
    # Get all patients under the OPD
    patients = list(patients_collection.find(patients_query, {"name": 1}))
    patient_names = {str(p["_id"]): p["name"] for p in patients}
    patient_ids = list(patient_names.keys())
    
    # Get all visits for these patients, sorted by created_at ascending to build timeline progress
    visits_query = {"patient_id": {"$in": patient_ids}}
    if doctor_filter:
        visits_query["doctor_name"] = doctor_filter

    visits = list(visits_collection.find(
        visits_query
    ).sort("created_at", 1))
    
    # Track latest status per patient per tooth
    # Format: { patient_id: { tooth_id: { procedure, status, session, notes, date, follow_up_date } } }
    patient_tooth_states = {}
    
    for v in visits:
        pid = v.get("patient_id")
        dt = v.get("created_at")
        iso_date = dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else (str(dt)[:10] if dt else "")
        follow_up = v.get("follow_up_date") or ""
        
        if pid not in patient_tooth_states:
            patient_tooth_states[pid] = {}
            
        for tooth_id, tooth_data in (v.get("dental_chart") or {}).items():
            procedure = tooth_data.get("procedure")
            if not procedure:
                continue
                
            status = tooth_data.get("status")
            if not status:
                status = "completed" if tooth_data.get("done") else "planned"
                
            # Update to latest visit's record
            patient_tooth_states[pid][tooth_id] = {
                "procedure": procedure,
                "status": status,
                "session": tooth_data.get("session", ""),
                "notes": tooth_data.get("notes", ""),
                "last_visit_date": iso_date,
                "last_follow_up": follow_up,
            }
            
    # Now query future scheduled appointments for all these patients
    now_str = datetime.now().strftime("%Y-%m-%d")
    appt_query = {
        "patient_id": {"$in": patient_ids},
        "appointment_date": {"$gte": now_str},
        "status": "Scheduled"
    }
    if doctor_filter:
        appt_query["doctor_name"] = doctor_filter

    appts = list(appointments_collection.find(appt_query).sort([("appointment_date", 1), ("appointment_time", 1)]))
    
    # Map patient_id -> next scheduled appointment string
    next_appts = {}
    for a in appts:
        pid = a.get("patient_id")
        if pid not in next_appts:
            time_part = f" at {a.get('appointment_time')}" if a.get("appointment_time") else ""
            next_appts[pid] = f"{a.get('appointment_date')}{time_part}"

    # Group everything by Procedure
    # Format: { procedure_name: { "in_progress": [], "planned": [], "completed": [] } }
    dashboard_data = {}
    
    for pid, teeth in patient_tooth_states.items():
        pname = patient_names.get(pid, "Unknown")
        for tooth_id, state in teeth.items():
            proc = state["procedure"]
            status = state["status"] # planned, in_progress, completed
            
            # Map status key
            if status == "completed":
                key = "completed"
            elif status == "planned":
                key = "planned"
            else:
                key = "in_progress"
                
            if proc not in dashboard_data:
                dashboard_data[proc] = {
                    "in_progress": [],
                    "planned": [],
                    "completed": []
                }
                
            # Upcoming follow-up/appointment date
            upcoming = next_appts.get(pid)
            if not upcoming:
                if state["last_follow_up"] and state["last_follow_up"] >= now_str:
                    upcoming = state["last_follow_up"]
                else:
                    upcoming = ""
                    
            dashboard_data[proc][key].append({
                "patient_id": pid,
                "patient_name": pname,
                "tooth": tooth_id,
                "session": state["session"],
                "notes": state["notes"],
                "last_visit": state["last_visit_date"],
                "upcoming_date": upcoming,
            })
            
    # Convert map to sorted list
    output = []
    for proc, stages in sorted(dashboard_data.items()):
        output.append({
            "procedure": proc,
            "in_progress": stages["in_progress"],
            "planned": stages["planned"],
            "completed": stages["completed"],
        })
        
    return jsonify(output), 200


def orchestrate_encounter_endpoint():
    payload = request.json or {}
    user_id = request.user.get("user_id")
    opd_id = request.user.get("opd_id")
    user_name = request.user.get("name", "Doctor")
    
    if not payload.get("patient_id"):
        return jsonify({"message": "patient_id is required"}), 400
        
    try:
        result = ClinicalWorkflowOrchestrator.orchestrate_encounter(
            payload, user_id, opd_id, user_name
        )
        return jsonify(result), 200
    except Exception as e:
        print(f"[OrchestrateController] Error running clinical orchestrator: {e}")
        return jsonify({"message": "Orchestration failed", "error": str(e)}), 500