"""
Simple cost tracker using Claude's token counting formula.
Counts tokens manually and stores usage logs directly in MongoDB.

Pricing for Claude Sonnet 4.5 (March 2026):
  Input:  $3.00 per 1M tokens
  Output: $15.00 per 1M tokens
"""

import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── Pricing ────────────────────────────────────────────────────────────────────

PRICING = {
    "claude-sonnet-4-5": {
        "input_per_1m": 3.00,
        "output_per_1m": 15.00,
    },
    "claude-sonnet-4-5-stream": {
        "input_per_1m": 3.00,
        "output_per_1m": 15.00,
    },
}

DEFAULT_PRICING = {"input_per_1m": 3.00, "output_per_1m": 15.00}

# ── MongoDB setup ──────────────────────────────────────────────────────────────

_usage_collection = None


def _get_collection():
    """Lazy-init MongoDB collection so import never crashes."""
    global _usage_collection
    if _usage_collection is not None:
        return _usage_collection

    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("[COST TRACKER] No MONGODB_URI — cost tracking disabled")
        return None

    try:
        from pymongo import MongoClient
        try:
            import certifi
            client = MongoClient(mongo_uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
        except ImportError:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

        db = client["mathai"]
        _usage_collection = db["usage_logs"]

        # Ensure indexes for fast dashboard queries
        _usage_collection.create_index([("timestamp", -1)])
        _usage_collection.create_index([("user_id", 1), ("timestamp", -1)])
        _usage_collection.create_index([("provider", 1), ("timestamp", -1)])

        print("[COST TRACKER] Connected to MongoDB — usage_logs ready")
    except Exception as e:
        print(f"[COST TRACKER] MongoDB connection failed: {e}")
        _usage_collection = None

    return _usage_collection


# ── Token estimation ───────────────────────────────────────────────────────────

def estimate_tokens(text: str) -> int:
    """
    Estimate token count using Claude's approximation:
    ~4 characters per token (English prose / math text).
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


# ── Public API ─────────────────────────────────────────────────────────────────

def log_claude_usage(
    input_text: str,
    output_text: str,
    model: str = "claude-sonnet-4-5",
    user_id: str = None,
    session_id: str = None,
    method: str = "estimated",
) -> dict | None:
    """
    Estimate tokens, calculate cost, and persist to MongoDB usage_logs.

    Returns the inserted document (without _id) or None on failure.
    """
    col = _get_collection()

    pricing = PRICING.get(model, DEFAULT_PRICING)
    input_tokens = estimate_tokens(input_text)
    output_tokens = estimate_tokens(output_text)
    total_tokens = input_tokens + output_tokens

    input_cost  = (input_tokens  / 1_000_000) * pricing["input_per_1m"]
    output_cost = (output_tokens / 1_000_000) * pricing["output_per_1m"]
    total_cost  = round(input_cost + output_cost, 8)

    record = {
        "timestamp":     datetime.utcnow(),
        "provider":      "anthropic",
        "model":         model,
        "input_tokens":  input_tokens,
        "output_tokens": output_tokens,
        "total_tokens":  total_tokens,
        "cost_usd":      total_cost,
        "user_id":       user_id or "guest",
        "session_id":    session_id,
        "method":        method,
    }

    print(
        f"[COST TRACKER] {model} | "
        f"in={input_tokens} out={output_tokens} tokens | "
        f"cost=${total_cost:.6f} | user={user_id or 'guest'}"
    )

    if col is not None:
        try:
            col.insert_one({**record})   # insert a copy (keeps _id out of record)
            print(f"[COST TRACKER] Saved to MongoDB ✓")
        except Exception as e:
            print(f"[COST TRACKER] MongoDB insert failed: {e}")

    return record
