import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    ai_logic_dir = script_dir.parent
    project_root = ai_logic_dir.parent

    load_dotenv(ai_logic_dir / ".env")
    load_dotenv(project_root / ".env")

    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise ValueError("Missing MONGO_URI or MONGODB_URI environment variable")

    client = MongoClient(mongo_uri)
    db = client["mathai"]
    collection = db["model_pricing"]

    pricing_records = [
        {
            "provider": "anthropic",
            "model": "claude-sonnet-4-5",
            "input_cost_per_1m": 3.00,
            "output_cost_per_1m": 15.00,
            "updated_at": "2026-03-10",
        },
        {
            "provider": "cohere",
            "model": "command-r-plus",
            "input_cost_per_1m": 2.50,
            "output_cost_per_1m": 10.00,
            "updated_at": "2026-03-10",
        },
    ]

    collection.delete_many({})
    collection.insert_many(pricing_records)
    print("✅ Pricing data seeded successfully")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"❌ Failed to seed pricing data: {exc}")
