"""
medicine_controller.py — Optimised medicine search
──────────────────────────────────────────────────
Changes:
  • Returns up to 20 results (was 3 after the broken filter)
  • Two-pass ranking: prefix matches first, then contains
  • Adds category / manufacturer / strength if stored
  • Sets MongoDB text index on startup for fast full-text search
"""

from flask import request, jsonify
from config.db import medicines_collection


# ── Ensure a text index exists for fast search ─────────────────────────────────
try:
    medicines_collection.create_index([("name", "text"), ("category", "text")],
                                      name="medicine_text_idx",
                                      default_language="english")
except Exception:
    pass   # index already exists or collection empty


def search_medicines():
    """
    GET /api/medicines/search?query=para&limit=20
    Returns ranked list: prefix matches first, then substring matches.
    """
    query = request.args.get("query", "").strip()
    try:
        limit = min(int(request.args.get("limit", 20)), 50)
    except (ValueError, TypeError):
        limit = 20

    if not query or len(query) < 1:
        return jsonify([]), 200

    query_lower = query.lower()

    # ── Pull candidates via case-insensitive regex ──────────────────────────────
    regex_filter = {
        "name": {
            "$regex": query_lower,
            "$options": "i"
        }
    }

    raw = list(
        medicines_collection.find(
            regex_filter,
            {"name": 1, "category": 1, "strength": 1, "manufacturer": 1}
        ).limit(limit * 3)          # fetch extra; we re-rank below
    )

    # ── Two-pass ranking ────────────────────────────────────────────────────────
    prefix_matches  = []
    contain_matches = []

    for med in raw:
        name_lower = med.get("name", "").lower()
        entry = {
            "id":           str(med["_id"]),
            "name":         med.get("name", ""),
            "category":     med.get("category", ""),
            "strength":     med.get("strength", ""),
            "manufacturer": med.get("manufacturer", ""),
        }

        if name_lower.startswith(query_lower):
            prefix_matches.append(entry)
        else:
            contain_matches.append(entry)

    # Prefix matches come first, then contains-matches
    results = (prefix_matches + contain_matches)[:limit]

    return jsonify(results), 200


def get_all_medicines():
    """GET /api/medicines/ — paginated list for admin."""
    page  = max(int(request.args.get("page", 1)), 1)
    size  = min(int(request.args.get("size", 50)), 200)
    skip  = (page - 1) * size

    meds  = list(
        medicines_collection.find({}, {"name": 1, "category": 1, "strength": 1})
        .skip(skip).limit(size)
    )
    for m in meds:
        m["_id"] = str(m["_id"])

    total = medicines_collection.count_documents({})
    return jsonify({"medicines": meds, "total": total, "page": page, "size": size}), 200