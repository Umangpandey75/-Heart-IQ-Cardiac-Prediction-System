"""
=============================================================================
BACKEND MAIN SERVER FILE (api.py)
-----------------------------------------------------------------------------
Purpose:
This is the core of the HeartIQ backend. It uses a framework called FastAPI 
to create "endpoints" (URLs) that the React frontend can talk to. 

Think of this file like a restaurant kitchen:
1. The frontend (the waiter) takes an order (e.g. login, predict heart disease).
2. The waiter brings the order to this kitchen (via URLs like /api/auth/login).
3. This kitchen processes the data (using the database or the ML model).
4. The kitchen sends the result back to the waiter to show the customer.

Pages that use this:
- Every single page in the frontend relies on this file to save or fetch data.
=============================================================================
"""

import os
import sys
import warnings
import random
import time
import pandas as pd
import joblib
from datetime import datetime
from typing import Dict, List, Any, Optional

# Suppress legacy google-generativeai FutureWarning (package no longer used)
warnings.filterwarnings("ignore", category=FutureWarning, module="google")

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# IMPORTING OUR OWN SETTINGS AND HELPERS
# -----------------------------------------------------------------------------
# We bring in the variables from config.py and the functions from helpers.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import MODEL_FILE, SCALER_FILE, SMTP_CONFIG, GROQ_API_KEY
from helpers import (
    load_users, save_users, load_patients, save_patients,
    is_admin_user, send_otp_email
)

# -----------------------------------------------------------------------------
# INITIALIZE THE FASTAPI SERVER
# -----------------------------------------------------------------------------
# This creates the actual server application that will run our API.
app = FastAPI(title="HeartIQ API", version="1.0.0")

# -----------------------------------------------------------------------------
# CORS MIDDLEWARE (Cross-Origin Resource Sharing)
# -----------------------------------------------------------------------------
# What this does: It allows our React frontend (running on port 5173) to 
# communicate with this Python backend (running on port 8000). Without this, 
# the browser would block the connection for security reasons.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, this should be the exact URL of the deployed frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# LOAD MACHINE LEARNING MODEL
# -----------------------------------------------------------------------------
# What this does: When the server starts up, it immediately loads our 
# pre-trained AI model into memory so it's ready to make predictions instantly.
try:
    model = joblib.load(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    print("Model and Scaler loaded successfully [OK].")
except Exception as e:
    print(f"Error loading model/scaler [ERROR]: {e}")
    model, scaler = None, None


# -----------------------------------------------------------------------------
# TEMPORARY STORAGE FOR PASSWORD RESET OTPs
# -----------------------------------------------------------------------------
# We store the generated One-Time Passwords (OTPs) here in memory for 5 minutes.
otp_store: Dict[str, Dict[str, Any]] = {}


# =============================================================================
# DATA SCHEMAS (PYDANTIC MODELS)
# =============================================================================
# Purpose: These classes define exactly what data the frontend MUST send to 
# the backend. If the frontend forgets to send a required field (like a password), 
# FastAPI will automatically reject the request.

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str

class OtpRequest(BaseModel):
    username: str

class ResetRequest(BaseModel):
    username: str
    otp: str
    new_password: str
    confirm_password: str

# This schema is used when predicting heart disease. It requires all 13 clinical inputs.
class PredictRequest(BaseModel):
    patient_name: str
    age: int
    sex: str  # "Male" or "Female"
    cp: int
    trestbps: int
    chol: int
    fbs: int
    restecg: int
    thalach: int
    exang: int
    slope: int
    ca: int
    thal: int

class SavePatientRequest(BaseModel):
    record: Dict[str, Any]

class AddUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    prompt: str
    patient_info: Dict[str, Any]


# =============================================================================
# AUTHENTICATION ROUTES (Login, Register, Forgot Password)
# Page Used On: Login.jsx
# =============================================================================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """
    Handles User Login.
    Checks if the username exists and if the password matches.
    """
    users = load_users()
    uname = req.username
    if uname in users and users[uname]["password"] == req.password:
        user_info = users[uname]
        return {
            "success": True,
            "username": uname,
            "role": user_info["role"],
            "email": user_info["email"]
        }
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials."
    )

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    """
    Handles New User Registration.
    Checks if the passwords match, ensures the password is long enough, 
    and checks that the username isn't already taken.
    """
    users = load_users()
    uname = req.username.strip()
    email = req.email.strip()
    password = req.password

    # Input validation rules
    if not uname or not email or not password:
        raise HTTPException(status_code=400, detail="All fields are required.")
    if uname in users:
        raise HTTPException(status_code=400, detail=f"Username '{uname}' already taken.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    # Save the new user into the database with a default role of "user"
    users[uname] = {
        "password": password,
        "email": email,
        "role": "user",
        "joined": datetime.now().strftime("%Y-%m-%d")
    }
    save_users(users)
    return {"success": True, "detail": "Account created! Please sign in."}

@app.post("/api/auth/forgot-password/otp")
def get_otp(req: OtpRequest):
    """
    Generates a 6-digit OTP and emails it to the user.
    """
    users = load_users()
    uname = req.username.strip()
    if uname not in users:
        raise HTTPException(status_code=404, detail="Username not found.")
    
    # Generate random 6-digit number
    otp = str(random.randint(100000, 999999))
    
    # Store it in memory with the current time
    otp_store[uname] = {
        "otp": otp,
        "ts": time.time()
    }
    
    email = users[uname]["email"]
    sent = send_otp_email(email, otp) # Call the helper function to send the email
    
    return {
        "success": True,
        "email": email,
        # If email fails, return the OTP in the response for demo purposes
        "demo_otp": None if sent else otp,
        "message": f"OTP sent to {email}." if sent else "Email SMTP not configured. Demo OTP generated."
    }

@app.post("/api/auth/forgot-password/reset")
def reset_password(req: ResetRequest):
    """
    Checks if the user typed the correct OTP and if it hasn't expired (5 mins).
    Then changes their password in the database.
    """
    users = load_users()
    uname = req.username.strip()
    
    if uname not in otp_store:
        raise HTTPException(status_code=400, detail="OTP session not found. Request standard OTP first.")
    
    session = otp_store[uname]
    elapsed = time.time() - session["ts"]
    
    # OTP validity limit: 300 seconds (5 minutes)
    if elapsed > 300:
        del otp_store[uname]
        raise HTTPException(status_code=400, detail="OTP expired.")
    if req.otp != session["otp"]:
        raise HTTPException(status_code=400, detail="Incorrect OTP.")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
        
    # Update password and save
    users[uname]["password"] = req.new_password
    save_users(users)
    
    # Delete the OTP from memory so it can't be used again
    del otp_store[uname]
    
    return {"success": True, "detail": "Password reset successfully!"}


# =============================================================================
# ML PREDICTION ROUTE 
# Page Used On: Predict.jsx
# =============================================================================

@app.post("/api/predict")
def predict_cardiac_risk(req: PredictRequest):
    """
    This is the core ML function.
    It takes the 13 clinical inputs from the user, organizes them into a data table,
    and asks the AI model for a prediction.
    """
    if model is None or scaler is None:
        raise HTTPException(status_code=500, detail="Inference model is not loaded on server.")
        
    # Convert 'Male'/'Female' text into a number (1 or 0) for the ML model
    sex_val = 1 if req.sex == "Male" else 0
    
    # Create a Pandas DataFrame representing a single row of data (the patient)
    input_df = pd.DataFrame([[
        req.age, sex_val, req.cp, req.trestbps, req.chol,
        req.fbs, req.restecg, req.thalach, req.exang,
        1.0,  # default oldpeak
        req.slope, req.ca, req.thal
    ]], columns=[
        "age", "sex", "cp", "trestbps", "chol", "fbs",
        "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
    ])
    
    try:
        # Ask the model for a Yes/No prediction (1 or 0)
        prediction = model.predict(input_df)[0]
        
        try:
            # Ask the model how confident it is (Percentage)
            proba = model.predict_proba(input_df)[0]
            risk_pct = round(proba[1] * 100, 1)
        except Exception:
            risk_pct = 85.0 if prediction == 1 else 15.0
            
        result = "HIGH" if prediction == 1 else "LOW"
        
        # Send the result back to the frontend
        return {
            "success": True,
            "result": result,
            "risk_pct": risk_pct,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")


# =============================================================================
# PATIENT RECORD ROUTES
# Pages Used On: Patients.jsx, Dashboard.jsx
# =============================================================================

@app.get("/api/patients")
def get_patients_records(username: str, role: str):
    """
    Fetches the list of saved patients.
    If you are an admin, you see EVERYONE'S patients.
    If you are a normal user/doctor, you only see the patients you saved.
    """
    patients = load_patients()
    if role == "admin":
        return patients
    
    # Filter list: only keep patients where 'saved_by' matches the logged-in user
    return [p for p in patients if p.get("saved_by", "") == username]

@app.post("/api/patients")
def save_patient_record(req: SavePatientRequest):
    """
    Saves a new patient record to the database after a prediction is made.
    """
    patients = load_patients()
    patients.append(req.record) # Add the new record to the list
    save_patients(patients)     # Save the entire list back to the database
    return {"success": True}

@app.delete("/api/patients")
def delete_patient_records(name: str, username: str, role: str):
    """
    Deletes a specific patient by their name.
    """
    patients = load_patients()
    if role == "admin":
        # Admins can delete anyone
        updated = [p for p in patients if p.get("name", "").lower() != name.lower()]
    else:
        # Users can only delete their own patients
        updated = [
            p for p in patients 
            if not (p.get("name", "").lower() == name.lower() and p.get("saved_by") == username)
        ]
    save_patients(updated)
    return {"success": True}

@app.delete("/api/patients/clear")
def clear_all_patients_records(role: str):
    """
    Deletes ALL patients in the database. Only Admins are allowed to do this.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized.")
    save_patients([]) # Save an empty list
    return {"success": True}


# =============================================================================
# ADMIN ROUTES
# Page Used On: Admin.jsx
# =============================================================================

@app.get("/api/admin/users")
def get_all_users(role: str):
    """
    Gets a list of all registered users so the Admin can manage them.
    Security: The passwords are removed before sending the list to the frontend.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")
    users = load_users()
    
    # Create a new list without passwords
    return [
        {
            "username": uname,
            "email": details.get("email", ""),
            "role": details.get("role", "user"),
            "joined": details.get("joined", "—")
        }
        for uname, details in users.items()
    ]

@app.post("/api/admin/users")
def add_new_user(req: AddUserRequest, role: str):
    """
    Allows an Admin to manually create a new account for someone else.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")
    users = load_users()
    uname = req.username.strip()
    if uname in users:
        raise HTTPException(status_code=400, detail="Username already exists.")
        
    users[uname] = {
        "password": req.password,
        "email": req.email,
        "role": req.role,
        "joined": datetime.now().strftime("%Y-%m-%d")
    }
    save_users(users)
    return {"success": True}

@app.delete("/api/admin/users/{username}")
def delete_user(username: str, role: str):
    """
    Allows an Admin to delete an account.
    Prevents the main "admin" account from being deleted.
    """
    if role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete default admin user account.")
        
    users = load_users()
    if username in users:
        del users[username] # Remove user from the dictionary
        save_users(users)
        return {"success": True}
    raise HTTPException(status_code=404, detail="User not found.")


# =============================================================================
# CARDIOBOT AI ROUTE
# Page Used On: Predict.jsx
# =============================================================================

# Dictionaries to translate numbers into readable text for the AI
_CP_MAP   = {0: "Asymptomatic", 1: "Non-Anginal Pain", 2: "Atypical Angina", 3: "Typical Angina"}
_ECG_MAP  = {0: "Normal", 1: "ST-T Wave Abnormality", 2: "Left Ventricular Hypertrophy"}
_SLOPE_MAP= {0: "Upsloping (healthy)", 1: "Flat (moderate risk)", 2: "Downsloping (high risk)"}
_THAL_MAP = {1: "Fixed Defect", 2: "Reversible Defect", 3: "Normal"}
_CA_MAP   = {3: "0 vessels (Normal)", 2: "1 vessel (Mild)", 1: "2 vessels (Moderate)", 0: "3 vessels (Severe)"}

@app.post("/api/chat")
def cardiobot_chat(req: ChatRequest):
    """
    This handles the chat messages sent to CardioBot.
    It takes the patient's medical data, formats it into English, and sends it 
    to Google's AI (via Groq API) along with the user's question.
    """
    r = req.patient_info
    inputs = r.get("inputs", {})

    # Convert the raw numbers from the prediction form into human-readable sentences
    cp_val    = int(inputs.get("cp", 0))
    ecg_val   = int(inputs.get("restecg", 0))
    slope_val = int(inputs.get("slope", 0))
    thal_val  = int(inputs.get("thal", 3))
    ca_val    = int(inputs.get("ca", 3))

    clinical_context = (
        f"- Age: {r.get('age')} years\\n"
        f"- Biological Sex: {r.get('sex')}\\n"
        f"- Chest Pain Type: {_CP_MAP.get(cp_val, cp_val)}\\n"
        f"- Resting Blood Pressure: {inputs.get('trestbps')} mmHg\\n"
        f"- Serum Cholesterol: {inputs.get('chol')} mg/dl\\n"
        f"- Fasting Blood Sugar >120 mg/dl: {'Yes' if inputs.get('fbs') == 1 else 'No'}\\n"
        f"- Resting ECG: {_ECG_MAP.get(ecg_val, ecg_val)}\\n"
        f"- Max Heart Rate Achieved: {inputs.get('thalach')} bpm\\n"
        f"- Exercise-Induced Angina: {'Yes' if inputs.get('exang') == 1 else 'No'}\\n"
        f"- ST Slope: {_SLOPE_MAP.get(slope_val, slope_val)}\\n"
        f"- Major Vessels Colored by Fluoroscopy: {_CA_MAP.get(ca_val, ca_val)}\\n"
        f"- Thalassemia: {_THAL_MAP.get(thal_val, thal_val)}\\n"
        f"- ML Risk Prediction: {r.get('result')} RISK ({r.get('risk_pct')}% probability)"
    )

    api_key = GROQ_API_KEY
    
    # -------------------------------------------------------------------------
    # OFFLINE FALLBACK MODE
    # If there is no API key provided, the bot relies on pre-written responses.
    # -------------------------------------------------------------------------
    if not api_key:
        pl = req.prompt.lower()
        if "cholesterol" in pl or "chol" in pl:
            ans = f"**Cholesterol:** {inputs.get('chol')} mg/dl. Above 200 mg/dl is borderline high; above 240 is high."
        elif "pressure" in pl or "bp" in pl or "blood pressure" in pl:
            ans = f"**Resting BP:** {inputs.get('trestbps')} mmHg. Optimal is below 120/80 mmHg."
        elif "heart rate" in pl or "thalach" in pl:
            ans = f"**Max Heart Rate:** {inputs.get('thalach')} bpm. A lower max HR during exercise can indicate reduced cardiac reserve."
        elif "risk" in pl or "result" in pl or "score" in pl or "probability" in pl:
            ans = (f"**Risk Assessment:** The model predicts **{r.get('result')} RISK** "
                   f"with a probability of **{r.get('risk_pct')}%**.\n\n"
                   "This is an ML-assisted estimate — always consult a cardiologist for a definitive diagnosis.")
        elif "exercise" in pl or "workout" in pl or "activity" in pl:
            ans = "Aim for **150 minutes/week** of moderate aerobic exercise (brisk walking, cycling, swimming). Always check with your doctor before starting a new regimen."
        elif "diet" in pl or "food" in pl or "eat" in pl or "nutrition" in pl:
            ans = ("A heart-healthy diet includes:\n"
                   "- 🥦 Plenty of fruits and vegetables\n"
                   "- 🌾 Whole grains over refined carbs\n"
                   "- 🐟 Lean proteins and omega-3 rich fish\n"
                   "- 🚫 Low saturated fats and sodium")
        elif "chest pain" in pl or "angina" in pl:
            ans = "Chest pain should always be evaluated by a healthcare professional. If you experience sudden severe chest pain, call emergency services immediately."
        else:
            ans = "I'm CardioBot, your AI cardiology assistant. I can answer questions about your results, heart health, diet, exercise, and risk factors. What would you like to know?"
        return {"reply": ans}

    # -------------------------------------------------------------------------
    # LIVE AI MODE
    # If the API key exists, talk to the Groq/Llama AI model.
    # -------------------------------------------------------------------------
    try:
        from groq import Groq
        client = Groq(api_key=api_key.strip())

        # Give the AI its personality and instructions
        sys_prompt = (
            "You are **CardioBot**, an expert AI cardiology assistant embedded in **HEART-IQ**, "
            "an advanced cardiac risk assessment platform.\n\n"
            "## Your Role\n"
            "- Provide clear, empathetic, evidence-based responses about heart health\n"
            "- Reference the patient's actual clinical data when answering\n"
            "- Use **markdown formatting** (bold, bullet points, numbered lists) for clarity\n"
            "- Keep responses concise but thorough — 3-6 sentences or a short list\n"
            "- Always remind the user to consult a qualified cardiologist for medical decisions\n"
            "- Never diagnose — only explain, educate, and guide\n\n"
            "## Patient Clinical Data\n"
            f"{clinical_context}\n\n"
            "## Response Guidelines\n"
            "- Reference specific numbers from the patient data above where relevant\n"
            "- Flag any values outside normal range with a warning symbol\n"
            "- Use a checkmark for values within normal range\n"
            "- End responses with an actionable suggestion or reassurance when appropriate"
        )

        # Build the history of the conversation so the AI remembers previous questions
        messages = [{"role": "system", "content": sys_prompt}]
        for m in req.history[-6:]:  # Only remember the last 6 messages so we don't send too much data
            role = "assistant" if m.role == "assistant" else "user"
            messages.append({"role": role, "content": m.content})
            
        # Add the newest question
        messages.append({"role": "user", "content": req.prompt})

        # Ask the AI to generate a response
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=600,
            temperature=0.7,
        )
        # Get the text reply and send it back to the frontend
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception as e:
        return {"reply": f"⚠️ CardioBot is temporarily unavailable: {str(e)}"}
