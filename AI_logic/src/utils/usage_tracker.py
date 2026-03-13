import os
from datetime import datetime
from functools import wraps
from typing import Any

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
mongo_client = MongoClient(mongo_uri) if mongo_uri else None
mongo_db = mongo_client["mathai"] if mongo_client is not None else None
usage_col = mongo_db["usage_logs"] if mongo_db is not None else None
pricing_col = mongo_db["model_pricing"] if mongo_db is not None else None


def _extract_usage(provider: str, response: Any) -> tuple[int, int]:
    if provider == "anthropic":
        usage = getattr(response, "usage", None)
        return int(getattr(usage, "input_tokens", 0) or 0), int(getattr(usage, "output_tokens", 0) or 0)

    if provider == "cohere":
        meta = getattr(response, "meta", None)
        billed_units = getattr(meta, "billed_units", None)
        return int(getattr(billed_units, "input_tokens", 0) or 0), int(getattr(billed_units, "output_tokens", 0) or 0)

    return 0, 0


def _persist_usage(provider: str, model_name: str, response: Any, user_id: str | None, session_id: str | None) -> None:
    if usage_col is None or pricing_col is None:
        print("[USAGE] Warning: MongoDB not configured; skipping usage tracking")
        return

    input_tokens, output_tokens = _extract_usage(provider, response)
    pricing = pricing_col.find_one({"provider": provider, "model": model_name})

    if pricing:
        cost_usd = (
            (input_tokens / 1_000_000) * float(pricing.get("input_cost_per_1m", 0))
            + (output_tokens / 1_000_000) * float(pricing.get("output_cost_per_1m", 0))
        )
    else:
        cost_usd = 0
        print(f"[USAGE] Warning: pricing not found for {provider}/{model_name}")

    usage_col.insert_one(
        {
            "timestamp": datetime.utcnow(),
            "provider": provider,
            "model": model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost_usd": round(cost_usd, 6),
            "user_id": user_id,
            "session_id": session_id,
        }
    )


class _TrackedContextManager:
    def __init__(self, response: Any, provider: str, model_name: str, user_id: str | None, session_id: str | None):
        self._response = response
        self._provider = provider
        self._model_name = model_name
        self._user_id = user_id
        self._session_id = session_id

    def __enter__(self):
        return self._response.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        result = self._response.__exit__(exc_type, exc_val, exc_tb)
        try:
            final_response = self._response.get_final_message() if hasattr(self._response, "get_final_message") else None
            if final_response is not None:
                _persist_usage(self._provider, self._model_name, final_response, self._user_id, self._session_id)
        except Exception as exc:
            print(f"[USAGE] Warning: failed to track streaming usage: {exc}")
        return result

    def __getattr__(self, item: str):
        return getattr(self._response, item)


def track_usage(provider: str, model_name: str):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = kwargs.get("user_id", None)
            session_id = kwargs.get("session_id", None)
            response = func(*args, **kwargs)

            try:
                if hasattr(response, "__enter__") and hasattr(response, "__exit__"):
                    return _TrackedContextManager(response, provider, model_name, user_id, session_id)

                _persist_usage(provider, model_name, response, user_id, session_id)
            except Exception as exc:
                print(f"[USAGE] Warning: failed to track usage: {exc}")

            return response

        return wrapper

    return decorator
