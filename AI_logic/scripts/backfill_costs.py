"""
Backfill cost estimates for existing analytics_interactions.
Reads previous chat history from MongoDB and populates usage_logs.

Run once from AI_logic directory:
    python scripts/backfill_costs.py
"""

import os
import sys
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
if not mongo_uri:
    print("ERROR: MONGODB_URI not set in .env")
    sys.exit(1)

try:
    from pymongo import MongoClient
    try:
        import certifi
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=8000)
    except ImportError:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)

    db = client["mathai"]
    interactions = db["analytics_interactions"]
    usage_logs   = db["usage_logs"]
    print("Connected to MongoDB ✓")
except Exception as e:
    print(f"ERROR: Could not connect to MongoDB: {e}")
    sys.exit(1)

# ── Pricing ────────────────────────────────────────────────────────────────────

INPUT_COST_PER_1M  = 3.00   # Claude Sonnet 4.5 input
OUTPUT_COST_PER_1M = 15.00  # Claude Sonnet 4.5 output


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, len(text) // 4)


# ── Backfill ───────────────────────────────────────────────────────────────────

all_interactions = list(interactions.find({}))
print(f"Found {len(all_interactions)} interactions to process")

skipped = inserted = 0

for item in all_interactions:
    question = item.get("student_question", "")
    answer   = item.get("model_answer", "")

    if not question and not answer:
        skipped += 1
        continue

    # Parse timestamp safely
    ts = item.get("timestamp")
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            ts = datetime.utcnow()
    elif not isinstance(ts, datetime):
        ts = datetime.utcnow()

    user_id = item.get("user_id", "guest")

    # Skip if already backfilled (match on timestamp + user_id + method)
    existing = usage_logs.find_one({
        "timestamp": ts,
        "user_id": user_id,
        "method": "backfilled",
    })
    if existing:
        skipped += 1
        continue

    input_tokens  = estimate_tokens(question)
    output_tokens = estimate_tokens(answer)
    total_tokens  = input_tokens + output_tokens
    cost_usd = round(
        (input_tokens  / 1_000_000) * INPUT_COST_PER_1M +
        (output_tokens / 1_000_000) * OUTPUT_COST_PER_1M,
        8,
    )

    usage_logs.insert_one({
        "timestamp":     ts,
        "provider":      "anthropic",
        "model":         "claude-sonnet-4-5",
        "input_tokens":  input_tokens,
        "output_tokens": output_tokens,
        "total_tokens":  total_tokens,
        "cost_usd":      cost_usd,
        "user_id":       user_id,
        "session_id":    None,
        "method":        "backfilled",
    })
    inserted += 1

print(f"\n✅ Done — inserted: {inserted}  skipped: {skipped}")
print(f"   Total usage_logs now: {usage_logs.count_documents({})}")
