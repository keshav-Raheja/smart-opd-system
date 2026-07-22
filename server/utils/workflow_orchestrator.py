from datetime import datetime, timezone
from bson import ObjectId
from config.db import (
    visits_collection,
    bills_collection,
    appointments_collection,
    fee_config_collection,
    patients_collection
)
from controllers.billing_controller import _generate_bill_number, _compute_totals

class ClinicalWorkflowOrchestrator:
    @staticmethod
    def orchestrate_encounter(payload, user_id, opd_id, user_name):
        """
        Orchestrates the entire clinical encounter workflow in a single request.
        Coordinates:
          1. Recording the clinical visit (EMR data, prescriptions, dental chart)
          2. Patient profile update (syncing historical dental chart status)
          3. Automated billing configuration based on dental chart procedures
          4. Appointment queue status update (completing today's slot)
          5. Next follow-up appointment booking
        """
        patient_id = payload.get("patient_id")
        patient_name = payload.get("patient_name")
        appointment_id = payload.get("appointment_id")
        symptoms = payload.get("symptoms", "")
        diagnosis = payload.get("diagnosis", "")
        notes = payload.get("notes", "")
        prescription = payload.get("prescription", [])
        dental_chart = payload.get("dental_chart", {})
        
        # Payment details logged now
        amount_paid_now = float(payload.get("amount_paid_now") or 0)
        payment_method = payload.get("payment_method", "Cash")
        
        # Follow-up appointment scheduling
        follow_up_date = payload.get("follow_up_date")
        follow_up_time = payload.get("follow_up_time", "")
        follow_up_duration = payload.get("follow_up_duration", 15)

        # ── STEP 1: Save the Clinical Visit ──────────────────────────────────
        visit_doc = {
            "patient_id": patient_id,
            "patient_name": patient_name,
            "appointment_id": appointment_id,
            "doctor_name": user_name,
            "symptoms": symptoms,
            "diagnosis": diagnosis,
            "notes": notes,
            "prescription": prescription,
            "dental_chart": dental_chart,
            "opd_id": opd_id,
            "created_at": datetime.utcnow(),
            "vitals": {
                "blood_pressure": payload.get("blood_pressure", ""),
                "temperature": payload.get("temperature", ""),
                "pulse": payload.get("pulse", ""),
                "weight": payload.get("weight", ""),
            }
        }
        visit_result = visits_collection.insert_one(visit_doc)
        visit_id = str(visit_result.inserted_id)

        # ── STEP 2: Sync Dental Chart into Patient Record ──────────────────
        patient = patients_collection.find_one({"_id": ObjectId(patient_id)})
        if patient:
            merged_chart = {**(patient.get("historical_dental_chart") or {})}
            
            # Merge current visit's chart updates
            for tooth_id, tooth_data in dental_chart.items():
                merged_chart[tooth_id] = tooth_data
            
            # Remove any non-completed treatments that were cleared in the workspace
            for tooth_id in list(merged_chart.keys()):
                if merged_chart[tooth_id].get("status") != "completed" and tooth_id not in dental_chart:
                    del merged_chart[tooth_id]
            
            patients_collection.update_one(
                {"_id": ObjectId(patient_id)},
                {"$set": {"historical_dental_chart": merged_chart}}
            )

        # ── STEP 3: Automated Invoicing & Billing Integration ──────────────
        bill_id = None
        bill_number = None
        
        # Gather all procedures from the dental chart that are active
        active_procedures = []
        for tooth_id, tooth_data in dental_chart.items():
            proc_name = tooth_data.get("procedure")
            if proc_name:
                active_procedures.append({
                    "tooth": tooth_id,
                    "name": proc_name
                })
        
        # If there are active procedures to charge for
        if active_procedures:
            # Query configuration prices
            line_items = []
            for proc in active_procedures:
                proc_name = proc["name"]
                tooth_id = proc["tooth"]
                
                # Try finding doctor's custom configured fee
                fee_config = fee_config_collection.find_one({
                    "name": {"$regex": f"^{proc_name}$", "$options": "i"},
                    "doctor_id": user_id,
                    "is_active": True
                })
                
                # Fall back to seeded global fee defaults
                if not fee_config:
                    fee_config = fee_config_collection.find_one({
                        "name": {"$regex": f"^{proc_name}$", "$options": "i"},
                        "doctor_id": None,
                        "is_active": True
                    })
                
                price = float(fee_config.get("default_fee", 0)) if fee_config else 0.0
                line_items.append({
                    "type": "other",
                    "description": f"{proc_name} (Tooth #{tooth_id})",
                    "quantity": 1,
                    "unit_price": price,
                    "amount": price
                })
            
            # Fetch existing global bill if any
            existing_bill = bills_collection.find_one({
                "patient_id": patient_id,
                "payment_status": {"$ne": "Waived"},
                "opd_id": opd_id
            })
            
            if existing_bill:
                # Append line items to existing bill
                current_items = existing_bill.get("line_items", [])
                current_items.extend(line_items)
                
                # Recalculate totals
                totals = _compute_totals(
                    current_items,
                    existing_bill.get("discount_type", "flat"),
                    existing_bill.get("discount_value", 0.0),
                    existing_bill.get("tax_percent", 0.0)
                )
                
                # Handle payment log
                new_payment_history = existing_bill.get("payment_history", [])
                updated_paid = float(existing_bill.get("amount_paid", 0))
                
                if amount_paid_now > 0:
                    new_payment_history.append({
                        "amount": amount_paid_now,
                        "payment_method": payment_method,
                        "notes": f"Paid during encounter: {diagnosis or 'Checkup'}",
                        "created_at": datetime.utcnow()
                    })
                    updated_paid += amount_paid_now
                
                updated_due = max(0.0, totals["total_amount"] - updated_paid)
                
                # Calculate status
                if updated_due <= 0:
                    status = "Paid"
                elif updated_paid > 0:
                    status = "Partial"
                else:
                    status = "Pending"
                
                bills_collection.update_one(
                    {"_id": existing_bill["_id"]},
                    {
                        "$set": {
                            "line_items": current_items,
                            "subtotal": totals["subtotal"],
                            "discount_amount": totals["discount_amount"],
                            "tax_amount": totals["tax_amount"],
                            "total_amount": totals["total_amount"],
                            "amount_paid": updated_paid,
                            "amount_due": updated_due,
                            "payment_status": status,
                            "payment_method": payment_method if amount_paid_now > 0 else existing_bill.get("payment_method"),
                            "payment_history": new_payment_history,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                bill_id = str(existing_bill["_id"])
                bill_number = existing_bill.get("bill_number")
                
            else:
                # Create a new treatment bill
                totals = _compute_totals(line_items, "flat", 0.0, 0.0)
                bill_number = _generate_bill_number()
                
                payment_history = []
                if amount_paid_now > 0:
                    payment_history.append({
                        "amount": amount_paid_now,
                        "payment_method": payment_method,
                        "notes": "Initial setup payment",
                        "created_at": datetime.utcnow()
                    })
                
                due = max(0.0, totals["total_amount"] - amount_paid_now)
                if due <= 0:
                    status = "Paid"
                elif amount_paid_now > 0:
                    status = "Partial"
                else:
                    status = "Pending"
                
                bill_doc = {
                    "bill_number": bill_number,
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "visit_id": visit_id,
                    "doctor_name": user_name,
                    "line_items": line_items,
                    "subtotal": totals["subtotal"],
                    "discount_type": "flat",
                    "discount_value": 0.0,
                    "discount_amount": 0.0,
                    "tax_percent": 0.0,
                    "tax_amount": 0.0,
                    "total_amount": totals["total_amount"],
                    "payment_status": status,
                    "payment_method": payment_method if amount_paid_now > 0 else None,
                    "amount_paid": amount_paid_now,
                    "amount_due": due,
                    "payment_history": payment_history,
                    "notes": f"Treatment Plan for: {diagnosis or 'Dental visit'}",
                    "opd_id": opd_id,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                bill_result = bills_collection.insert_one(bill_doc)
                bill_id = str(bill_result.inserted_id)

        # ── STEP 4: Auto-Mark Appointment as Completed ──────────────────────
        if appointment_id:
            try:
                appointments_collection.update_one(
                    {"_id": ObjectId(appointment_id)},
                    {"$set": {"status": "Completed"}}
                )
            except Exception as e:
                print(f"[Orchestrator] Error completing appointment: {e}")

        # ── STEP 5: Auto-Schedule Follow-up Appointment ────────────────────
        follow_up_id = None
        if follow_up_date:
            try:
                duration_val = int(follow_up_duration)
            except (ValueError, TypeError):
                duration_val = 15
                
            follow_up_appt = {
                "patient_id": patient_id,
                "patient_name": patient_name,
                "doctor_name": user_name,
                "appointment_date": follow_up_date,
                "appointment_time": follow_up_time,
                "duration": duration_val,
                "status": "Scheduled",
                "reason": f"Follow-up for: {diagnosis or 'Treatment'}",
                "opd_id": opd_id,
                "created_at": datetime.utcnow(),
            }
            try:
                appt_result = appointments_collection.insert_one(follow_up_appt)
                follow_up_id = str(appt_result.inserted_id)
            except Exception as e:
                print(f"[Orchestrator] Error creating follow-up: {e}")

        return {
            "visit_id": visit_id,
            "bill_id": bill_id,
            "bill_number": bill_number,
            "follow_up_id": follow_up_id
        }
