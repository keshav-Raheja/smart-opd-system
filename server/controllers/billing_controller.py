"""
billing_controller.py
─────────────────────
Handles the full patient billing lifecycle:
  • create_bill      – generate a bill from line items
  • get_bills        – list bills (filterable by patient / status / date)
  • get_bill         – single bill by ID
  • update_payment   – record payment / partial payment
  • get_revenue_stats– aggregated revenue for the dashboard

Data model (bills collection)
─────────────────────────────
{
  bill_number    : "BILL-20240527-0001"   (auto-generated, unique)
  patient_id     : str
  patient_name   : str
  visit_id       : str | None             (linked visit, optional)
  doctor_name    : str
  line_items     : [
    {
      type        : "consultation"|"diagnosis"|"lab"|"medicine"|"other"
      description : str
      quantity    : int    (default 1)
      unit_price  : float
      amount      : float  (quantity × unit_price)
    }
  ]
  subtotal       : float
  discount_type  : "flat" | "percent"
  discount_value : float
  discount_amount: float
  tax_percent    : float   (0 = tax-free)
  tax_amount     : float
  total_amount   : float   (subtotal - discount + tax)
  payment_status : "Pending" | "Paid" | "Partial" | "Waived"
  payment_method : "Cash" | "Card" | "UPI" | "Insurance" | None
  amount_paid    : float
  amount_due     : float
  notes          : str
  created_at     : datetime
  updated_at     : datetime
}
"""

from datetime import datetime, timezone
from flask import request, jsonify
from bson import ObjectId
from bson.errors import InvalidId

from config.db import bills_collection, visits_collection


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

VALID_PAYMENT_STATUSES = {"Pending", "Paid", "Partial", "Waived"}
VALID_PAYMENT_METHODS  = {"Cash", "Card", "UPI", "Insurance"}
VALID_LINE_TYPES       = {"consultation", "diagnosis", "lab", "medicine", "other"}


def _serialize(doc: dict) -> dict:
    """Convert ObjectId → str and datetimes → ISO strings."""
    doc["_id"] = str(doc["_id"])
    for field in ("created_at", "updated_at"):
        if field in doc and hasattr(doc[field], "isoformat"):
            doc[field] = doc[field].isoformat()
    return doc


def _generate_bill_number() -> str:
    """BILL-YYYYMMDD-NNNN  (counter resets per day for readability)."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"BILL-{today}-"
    last = bills_collection.find_one(
        {"bill_number": {"$regex": f"^{prefix}"}},
        sort=[("bill_number", -1)],
    )
    seq = 1
    if last and last.get("bill_number"):
        try:
            seq = int(last["bill_number"].split("-")[-1]) + 1
        except (ValueError, IndexError):
            pass
    return f"{prefix}{seq:04d}"


def _compute_totals(line_items: list, discount_type: str,
                    discount_value: float, tax_percent: float) -> dict:
    """Return subtotal / discount_amount / tax_amount / total_amount."""
    subtotal = sum(item.get("amount", 0) for item in line_items)

    if discount_type == "percent":
        discount_amount = round(subtotal * (discount_value / 100), 2)
    else:
        discount_amount = min(discount_value, subtotal)

    taxable = subtotal - discount_amount
    tax_amount   = round(taxable * (tax_percent / 100), 2)
    total_amount = round(taxable + tax_amount, 2)

    return {
        "subtotal":        round(subtotal, 2),
        "discount_amount": round(discount_amount, 2),
        "tax_amount":      tax_amount,
        "total_amount":    max(total_amount, 0),
    }


def _validate_line_items(raw_items: list):
    """Validate & normalise line items. Returns (items, error_string)."""
    if not raw_items or not isinstance(raw_items, list):
        return None, "line_items must be a non-empty list"

    items = []
    for i, item in enumerate(raw_items):
        if not item.get("description"):
            return None, f"line_items[{i}].description is required"

        try:
            qty   = float(item.get("quantity", 1))
            price = float(item.get("unit_price", 0))
            if qty <= 0 or price < 0:
                raise ValueError
        except (TypeError, ValueError):
            return None, f"line_items[{i}] has invalid quantity or unit_price"

        items.append({
            "type":        item.get("type", "other"),
            "description": item["description"].strip(),
            "quantity":    qty,
            "unit_price":  round(price, 2),
            "amount":      round(qty * price, 2),
        })

    return items, None


# ─────────────────────────────────────────────────────────────
# POST /api/billing/                → create bill
# ─────────────────────────────────────────────────────────────
def create_bill():
    data = request.json or {}

    # Required
    patient_id   = data.get("patient_id", "").strip()
    patient_name = data.get("patient_name", "").strip()
    if not patient_id or not patient_name:
        return jsonify({"message": "patient_id and patient_name are required"}), 400

    # Line items
    line_items, err = _validate_line_items(data.get("line_items", []))
    if err:
        return jsonify({"message": err}), 400

    # Optional financial config
    discount_type  = data.get("discount_type", "flat")
    discount_value = float(data.get("discount_value", 0))
    tax_percent    = float(data.get("tax_percent", 0))

    totals = _compute_totals(line_items, discount_type, discount_value, tax_percent)

    amount_paid = float(data.get("amount_paid", 0))
    amount_due  = round(totals["total_amount"] - amount_paid, 2)

    if amount_paid >= totals["total_amount"] and totals["total_amount"] > 0:
        payment_status = "Paid"
    elif amount_paid > 0:
        payment_status = "Partial"
    else:
        payment_status = "Pending"

    now = datetime.now(timezone.utc)
    doc = {
        "bill_number":    _generate_bill_number(),
        "patient_id":     patient_id,
        "patient_name":   patient_name,
        "visit_id":       data.get("visit_id"),
        "doctor_name":    data.get("doctor_name", ""),
        "line_items":     line_items,
        "subtotal":       totals["subtotal"],
        "discount_type":  discount_type,
        "discount_value": discount_value,
        "discount_amount":totals["discount_amount"],
        "tax_percent":    tax_percent,
        "tax_amount":     totals["tax_amount"],
        "total_amount":   totals["total_amount"],
        "payment_status": payment_status,
        "payment_method": data.get("payment_method"),
        "amount_paid":    round(amount_paid, 2),
        "amount_due":     max(amount_due, 0),
        "notes":          data.get("notes", "").strip(),
        "created_at":     now,
        "updated_at":     now,
    }

    result = bills_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # If linked to a visit, store the bill_id on the visit doc too
    if doc.get("visit_id"):
        try:
            visits_collection.update_one(
                {"_id": ObjectId(doc["visit_id"])},
                {"$set": {"bill_id": str(result.inserted_id),
                          "bill_amount": totals["total_amount"]}}
            )
        except (InvalidId, Exception):
            pass

    return jsonify(_serialize(doc)), 201


# ─────────────────────────────────────────────────────────────
# GET /api/billing/                 → list bills
# ─────────────────────────────────────────────────────────────
def get_bills():
    query = {}

    patient_id = request.args.get("patient_id")
    if patient_id:
        query["patient_id"] = patient_id

    status = request.args.get("status")
    if status and status in VALID_PAYMENT_STATUSES:
        query["payment_status"] = status

    # Date range (ISO date strings)
    date_from = request.args.get("from")
    date_to   = request.args.get("to")
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_filter["$lte"] = datetime.fromisoformat(date_to)
        query["created_at"] = date_filter

    limit = min(int(request.args.get("limit", 100)), 500)

    bills = list(
        bills_collection.find(query)
        .sort("created_at", -1)
        .limit(limit)
    )
    return jsonify([_serialize(b) for b in bills]), 200


# ─────────────────────────────────────────────────────────────
# GET /api/billing/<bill_id>        → single bill
# ─────────────────────────────────────────────────────────────
def get_bill(bill_id):
    try:
        bill = bills_collection.find_one({"_id": ObjectId(bill_id)})
    except InvalidId:
        return jsonify({"message": "Invalid bill ID"}), 400

    if not bill:
        return jsonify({"message": "Bill not found"}), 404

    return jsonify(_serialize(bill)), 200


# ─────────────────────────────────────────────────────────────
# PUT /api/billing/<bill_id>/payment → record / update payment
# ─────────────────────────────────────────────────────────────
def update_payment(bill_id):
    data = request.json or {}

    try:
        bill = bills_collection.find_one({"_id": ObjectId(bill_id)})
    except InvalidId:
        return jsonify({"message": "Invalid bill ID"}), 400

    if not bill:
        return jsonify({"message": "Bill not found"}), 404

    updates = {}

    if "payment_method" in data:
        method = data["payment_method"]
        if method not in VALID_PAYMENT_METHODS:
            return jsonify({"message": f"payment_method must be one of {VALID_PAYMENT_METHODS}"}), 400
        updates["payment_method"] = method

    if "amount_paid" in data:
        try:
            paid = float(data["amount_paid"])
            if paid < 0:
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({"message": "amount_paid must be a non-negative number"}), 400

        total = bill["total_amount"]
        due   = round(total - paid, 2)

        if data.get("payment_status") == "Waived":
            status = "Waived"
        elif paid >= total:
            status = "Paid"
        elif paid > 0:
            status = "Partial"
        else:
            status = "Pending"

        updates.update({
            "amount_paid":    round(paid, 2),
            "amount_due":     max(due, 0),
            "payment_status": status,
        })

    if "payment_status" in data and data["payment_status"] == "Waived":
        updates["payment_status"] = "Waived"
        updates["amount_due"] = 0

    if "notes" in data:
        updates["notes"] = data["notes"].strip()

    if not updates:
        return jsonify({"message": "Nothing to update"}), 400

    updates["updated_at"] = datetime.now(timezone.utc)

    result = bills_collection.find_one_and_update(
        {"_id": ObjectId(bill_id)},
        {"$set": updates},
        return_document=True,
    )
    return jsonify(_serialize(result)), 200


# ─────────────────────────────────────────────────────────────
# GET /api/billing/stats/revenue    → aggregated revenue stats
# ─────────────────────────────────────────────────────────────
def get_revenue_stats():
    """
    Returns revenue aggregates used by the dashboard:
      total_billed   – sum of total_amount (all bills)
      total_collected– sum of amount_paid  (all bills)
      total_pending  – sum of amount_due   (Pending + Partial)
      by_status      – count / revenue grouped by payment_status
      by_month       – last 6 months revenue trend
    """
    pipeline_totals = [
        {"$group": {
            "_id":            None,
            "total_billed":   {"$sum": "$total_amount"},
            "total_collected":{"$sum": "$amount_paid"},
            "total_pending":  {"$sum": "$amount_due"},
            "total_bills":    {"$sum": 1},
        }}
    ]

    pipeline_by_status = [
        {"$group": {
            "_id":   "$payment_status",
            "count": {"$sum": 1},
            "amount":{"$sum": "$total_amount"},
        }}
    ]

    pipeline_by_month = [
        {"$group": {
            "_id": {
                "year":  {"$year":  "$created_at"},
                "month": {"$month": "$created_at"},
            },
            "billed":   {"$sum": "$total_amount"},
            "collected":{"$sum": "$amount_paid"},
            "count":    {"$sum": 1},
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}},
        {"$limit": 6},
    ]

    totals_result = list(bills_collection.aggregate(pipeline_totals))
    totals = totals_result[0] if totals_result else {
        "total_billed": 0, "total_collected": 0,
        "total_pending": 0, "total_bills": 0,
    }
    totals.pop("_id", None)

    by_status = [
        {"status": r["_id"], "count": r["count"], "amount": r["amount"]}
        for r in bills_collection.aggregate(pipeline_by_status)
    ]

    raw_months = list(bills_collection.aggregate(pipeline_by_month))
    by_month = [
        {
            "year":      r["_id"]["year"],
            "month":     r["_id"]["month"],
            "label":     f"{r['_id']['year']}-{r['_id']['month']:02d}",
            "billed":    r["billed"],
            "collected": r["collected"],
            "count":     r["count"],
        }
        for r in reversed(raw_months)
    ]

    return jsonify({
        **totals,
        "by_status": by_status,
        "by_month":  by_month,
    }), 200
