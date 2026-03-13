import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()


def check_daily_threshold():
    try:
        alert_email = os.getenv("ALERT_EMAIL")
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = os.getenv("SMTP_PORT")
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        threshold = float(os.getenv("DAILY_COST_THRESHOLD", "5.0"))
        mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")

        if not all([alert_email, smtp_host, smtp_port, smtp_user, smtp_password, mongo_uri]):
            print("[COST ALERT] Missing config; skipping daily threshold check")
            return

        client = MongoClient(mongo_uri)
        db = client["mathai"]
        usage_logs = db["usage_logs"]
        alert_logs = db["cost_alert_logs"]

        today = datetime.utcnow().date()
        today_key = today.isoformat()

        already_sent = alert_logs.find_one(
            {
                "date": today_key,
                "threshold": threshold,
            }
        )
        if already_sent:
            print("[COST ALERT] Alert already sent today; skipping duplicate email")
            return

        pipeline = [
            {
                "$match": {
                    "timestamp": {
                        "$gte": datetime(today.year, today.month, today.day),
                        "$lt": datetime(today.year, today.month, today.day, 23, 59, 59, 999999),
                    }
                }
            },
            {
                "$group": {
                    "_id": "$provider",
                    "total_cost": {"$sum": "$cost_usd"},
                    "calls": {"$sum": 1},
                }
            },
        ]

        breakdown = list(usage_logs.aggregate(pipeline))
        total_cost = sum(float(item.get("total_cost", 0)) for item in breakdown)

        if total_cost <= threshold:
            print(f"[COST ALERT] Daily spend ${total_cost:.2f} below threshold ${threshold:.2f}")
            return

        breakdown_lines = "\n".join(
            f"- {item.get('_id', 'unknown')}: ${float(item.get('total_cost', 0)):.2f} ({int(item.get('calls', 0))} calls)"
            for item in breakdown
        )

        body = (
            "Daily cost threshold exceeded!\n\n"
            f"Today's total: ${total_cost:.2f}\n"
            f"Threshold: ${threshold:.2f}\n\n"
            "Breakdown by provider:\n"
            f"{breakdown_lines}\n\n"
            "Check admin dashboard for details."
        )

        message = MIMEText(body)
        message["Subject"] = f"⚠️ Math.AI Daily Cost Alert - ${total_cost:.2f}"
        message["From"] = smtp_user
        message["To"] = alert_email

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [alert_email], message.as_string())

        alert_logs.insert_one(
            {
                "date": today_key,
                "threshold": threshold,
                "total_cost": total_cost,
                "sent_to": alert_email,
                "timestamp": datetime.utcnow(),
                "breakdown": breakdown,
            }
        )

        print(f"[COST ALERT] Sent daily cost alert for ${total_cost:.2f}")
    except Exception as exc:
        print(f"[COST ALERT] Error while checking daily threshold: {exc}")
