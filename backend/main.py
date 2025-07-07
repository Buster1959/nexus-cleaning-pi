
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from jose import JWTError, jwt
import time
import json
import asyncio
import os

try:
    import RPi.GPIO as GPIO
    HARDWARE = True
except ImportError:
    HARDWARE = False
    class GPIO:
        BCM = None
        OUT = None
        HIGH = 1
        LOW = 0
        def setmode(x): pass
        def setup(pin, mode): pass
        def output(pin, value): print(f"GPIO {pin} set to {'LOW' if value==0 else 'HIGH'}")

SECRET_KEY = "secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
RELAY_PINS = [17, 18, 27, 22]

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if HARDWARE:
    GPIO.setmode(GPIO.BCM)
    for pin in RELAY_PINS:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.HIGH)

class Action(BaseModel):
    relay: int
    state: str  # "on" or "off"

class Step(BaseModel):
    name: str
    actions: List[Action]
    duration: int

class Settings(BaseModel):
    steps: List[Step]

class Status(BaseModel):
    running: bool
    step: Optional[str]

CONFIG_FILE = "config.json"
USER = {"username": "admin", "password": "admin"}
status = {"running": False, "step": None}
cleaning_task = None

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {"steps": []}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

def authenticate_user(username: str, password: str):
    return username == USER["username"] and password == USER["password"]

def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

async def cleaning_process():
    global status
    config = load_config()
    status["running"] = True
    for step in config["steps"]:
        status["step"] = step["name"]
        for action in step.get("actions", []):
            pin = RELAY_PINS[action["relay"]]
            state = GPIO.LOW if action["state"] == "on" else GPIO.HIGH
            GPIO.output(pin, state)
        await asyncio.sleep(step["duration"])
    status["running"] = False
    status["step"] = None

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not authenticate_user(form_data.username, form_data.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/status", response_model=Status)
async def get_status():
    return status

@app.get("/settings", response_model=Settings)
async def get_settings(token: str = Depends(oauth2_scheme)):
    return load_config()

@app.post("/settings")
async def set_settings(new_config: Settings, token: str = Depends(oauth2_scheme)):
    save_config(new_config.dict())
    return {"ok": True}

@app.post("/run")
async def start_cleaning(token: str = Depends(oauth2_scheme)):
    global cleaning_task
    if not status["running"]:
        cleaning_task = asyncio.create_task(cleaning_process())
    return {"ok": True}

@app.post("/cancel")
async def cancel_cleaning(token: str = Depends(oauth2_scheme)):
    global cleaning_task
    if cleaning_task:
        cleaning_task.cancel()
    status["running"] = False
    status["step"] = None
    return {"ok": True}
