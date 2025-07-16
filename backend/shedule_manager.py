import json
from datetime import datetime, timedelta
import os

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

def load_config():
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

def should_run_job():
    config = load_config()
    mode = config.get("trigger_mode", "internal")
    now = datetime.now()
    last_run = datetime.fromisoformat(config.get("last_run", "1970-01-01T00:00:00"))
    schedule = config.get("schedule", {})

    if mode == "api":
        return False  # Only runs via REST API

    # Check days of week
    days_of_week = schedule.get("days_of_week")
    if days_of_week and now.strftime("%A") in days_of_week:
        return True

    # Check every_x_days
    every_x_days = schedule.get("every_x_days")
    if every_x_days:
        days_since = (now - last_run).days
        if days_since >= every_x_days:
            return True

    return False

def update_last_run():
    config = load_config()
    config["last_run"] = datetime.now().isoformat()
    save_config(config)

def run_job():
    # Placeholder for the job logic
    print("Job executed!")
    update_last_run()
