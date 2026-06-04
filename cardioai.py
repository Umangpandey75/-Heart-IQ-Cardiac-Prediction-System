import streamlit as st
import numpy as np
import joblib
import json
import os
import random
import base64
import time
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from streamlit_geolocation import streamlit_geolocation
import requests
try:
    from streamlit_google_auth import Authenticate as GoogleAuthenticate
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="HEART-IQ – Heart Disease Prediction",
    page_icon="❤️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

#streamlit run cardioai.py

# ── Global CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

/* ─── Base ─── */
html, body, [class*="css"] { font-family: 'Outfit', sans-serif; }

/* Dark gradient background */
.stApp {
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
    min-height: 100vh;
}

/* Hide Streamlit chrome */
#MainMenu, footer, header { visibility: hidden; }
.block-container { padding-top: 2rem; padding-bottom: 2rem; overflow: visible !important; }
[data-testid="stVerticalBlock"] { overflow: visible !important; }

/* ─── Cards ─── */
.card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 2rem;
    backdrop-filter: blur(20px);
    margin-bottom: 1.5rem;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    animation: fadeInUp 0.5s ease-out forwards;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.45);
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ─── Hero / titles ─── */
.hero-title {
    font-size: 3rem;
    font-weight: 800;
    background: linear-gradient(90deg, #f953c6, #b91d73);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    margin-bottom: 0.3rem;
}
.hero-sub {
    color: rgba(255,255,255,0.55);
    text-align: center;
    font-size: 1.05rem;
    margin-bottom: 2rem;
}

/* ─── Section headers ─── */
.section-title {
    color: #f953c6;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 1rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid rgba(249,83,198,0.3);
}

/* ─── Inputs ─── */
.stTextInput > div > div > input,
.stNumberInput > div > div > input,
.stSelectbox > div > div {
    background: rgba(255,255,255,0.07) !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 10px !important;
    color: white !important;
    font-family: 'Outfit', sans-serif !important;
}
.stTextInput > label, .stNumberInput > label,
.stSelectbox > label, .stSlider > label {
    color: rgba(255,255,255,0.75) !important;
    font-weight: 500 !important;
}

/* ─── Buttons ─── */
.stButton > button {
    background: linear-gradient(135deg, #f953c6, #b91d73) !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    font-weight: 700 !important;
    font-size: 1rem !important;
    padding: 0.65rem 2rem !important;
    width: 100% !important;
    transition: transform 0.2s, box-shadow 0.2s !important;
    font-family: 'Outfit', sans-serif !important;
}
.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 25px rgba(249,83,198,0.45) !important;
}

/* Secondary button override */
.secondary-btn > button {
    background: rgba(255,255,255,0.08) !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
}
.secondary-btn > button:hover {
    background: rgba(255,255,255,0.15) !important;
    box-shadow: none !important;
}

/* ─── Alerts ─── */
.stAlert { border-radius: 12px !important; }

/* ─── Metric cards ─── */
.metric-card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 16px;
    padding: 1.2rem 1.5rem;
    text-align: center;
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    animation: fadeInUp 0.6s ease-out forwards;
}
.metric-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.35);
}
.metric-value { font-size: 2rem; font-weight: 800; color: #f953c6; }
.metric-label { font-size: 0.8rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }

/* ─── Risk badge ─── */
.risk-high {
    background: linear-gradient(135deg,#ff416c,#ff4b2b);
    border-radius: 50px; padding: 1rem 2rem;
    font-size: 1.4rem; font-weight: 800; color: white;
    text-align: center; margin: 1rem 0;
    box-shadow: 0 6px 30px rgba(255,65,108,0.5);
}
.risk-low {
    background: linear-gradient(135deg,#11998e,#38ef7d);
    border-radius: 50px; padding: 1rem 2rem;
    font-size: 1.4rem; font-weight: 800; color: white;
    text-align: center; margin: 1rem 0;
    box-shadow: 0 6px 30px rgba(56,239,125,0.4);
}

/* ─── Sticky Nav ─── */
.sticky-navbar {
    position: sticky !important;
    top: 0px !important;
    z-index: 9999 !important;
    background: rgba(15, 12, 41, 0.95) !important;
    backdrop-filter: blur(20px) !important;
    padding: 1rem 1.5rem !important;
    border-radius: 0 0 20px 20px !important;
    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
    margin-bottom: 1.5rem !important;
    margin-top: -2rem !important;
}

/* ─── Nav tabs ─── */
.nav-bar {
    display: flex; gap: 0.75rem;
    justify-content: center; margin-bottom: 2rem;
}
.nav-item {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 50px; padding: 0.5rem 1.4rem;
    color: rgba(255,255,255,0.65); cursor: pointer;
    font-weight: 500; font-size: 0.95rem;
    transition: all 0.2s;
}
.nav-item.active {
    background: linear-gradient(135deg,#f953c6,#b91d73);
    border-color: transparent; color: white;
}

/* ─── Patient record row ─── */
.patient-row {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px; padding: 1rem 1.5rem;
    margin-bottom: 0.75rem; color: rgba(255,255,255,0.85);
    transition: all 0.3s ease;
}
.patient-row:hover {
    background: rgba(255,255,255,0.1);
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

/* ─── Login card ─── */
.login-card {
    max-width: 430px; margin: 4rem auto;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 24px; padding: 3rem 2.5rem;
    backdrop-filter: blur(20px);
}

/* ─── Print Styles ─── */
@media print {
    .sticky-navbar, .stButton, [data-testid="stChatInputContainer"], iframe {
        display: none !important;
    }
    body, .stApp {
        background: #e6f7ff !important; /* light sky blue */
    }
    body, p, span, div, h1, h2, h3, h4, h5, h6, label, .stMarkdown {
        color: #000 !important;
        text-shadow: none !important;
        -webkit-text-fill-color: initial !important;
    }
    .hero-title, .section-title {
        background: none !important;
        -webkit-text-fill-color: #000 !important;
        color: #000 !important;
        border-bottom-color: #000 !important;
    }
    .card, .metric-card, .patient-row {
        background: white !important;
        border: 1px solid #ccc !important;
        box-shadow: none !important;
        break-inside: avoid;
    }
    .risk-high {
        background: white !important;
        color: #d32f2f !important;
        -webkit-text-fill-color: #d32f2f !important;
        border: 2px solid #d32f2f !important;
        box-shadow: none !important;
    }
    .risk-low {
        background: white !important;
        color: #2e7d32 !important;
        -webkit-text-fill-color: #2e7d32 !important;
        border: 2px solid #2e7d32 !important;
        box-shadow: none !important;
    }
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}
</style>
""", unsafe_allow_html=True)

# ── Constants ─────────────────────────────────────────────────────────────────
PATIENTS_FILE = os.path.join(os.path.dirname(__file__), "patients.json")
USERS_FILE    = os.path.join(os.path.dirname(__file__), "users.json")

# Default seed users (written to users.json on first run)
DEFAULT_USERS = {
    "admin":  {"password": "admin123",  "email": "admin@example.com",  "role": "admin",  "joined": "2024-01-01"},
    "doctor": {"password": "heart2024", "email": "doctor@example.com", "role": "doctor", "joined": "2024-01-01"},
    "demo":   {"password": "demo",      "email": "demo@example.com",   "role": "user",   "joined": "2024-01-01"},
}

# ── SMTP Config (Gmail) ───────────────────────────────────────────────────────
# To use real email: set SENDER_EMAIL and SENDER_APP_PASSWORD below.
# Generate a Gmail App Password at: https://myaccount.google.com/apppasswords
SMTP_CONFIG = {
    "sender_email":    "Umang593228@gmail.com",
    "sender_password": "afqchmoxlbqoncrg",
    "smtp_host":  "smtp.gmail.com",
    "smtp_port":  465,
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_users() -> dict:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    # First run: seed defaults
    save_users(DEFAULT_USERS)
    return dict(DEFAULT_USERS)

def save_users(users: dict):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def load_patients():
    if os.path.exists(PATIENTS_FILE):
        with open(PATIENTS_FILE, "r") as f:
            return json.load(f)
    return []

def save_patients(patients):
    with open(PATIENTS_FILE, "w") as f:
        json.dump(patients, f, indent=2)

def load_model():
    try:
        return joblib.load(os.path.join(os.path.dirname(__file__), "model.pkl"))
    except Exception:
        return None

def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP via Gmail SMTP. Returns True on success."""
    sender = SMTP_CONFIG["sender_email"]
    app_pw = SMTP_CONFIG["sender_password"]
    if not sender or not app_pw:
        return False  # SMTP not configured
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "HEART-IQ – Your Password Reset OTP"
        msg["From"]    = sender
        msg["To"]      = to_email
        html = f"""
        <div style='font-family:Inter,sans-serif;max-width:480px;margin:auto;
                    background:#0f0c29;border-radius:16px;padding:2rem;'>
            <h2 style='color:#f953c6;margin-bottom:0.5rem;'>❤️ HEART-IQ</h2>
            <p style='color:#ccc;'>Your one-time password reset code is:</p>
            <div style='font-size:2.5rem;font-weight:800;letter-spacing:0.3em;
                        color:white;background:rgba(255,255,255,0.08);
                        border-radius:12px;padding:1rem;text-align:center;
                        margin:1rem 0;'>{otp}</div>
            <p style='color:#aaa;font-size:0.85rem;'>This OTP expires in <b>5 minutes</b>.
            If you did not request this, ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_CONFIG["smtp_host"], SMTP_CONFIG["smtp_port"], context=ctx) as s:
            s.login(sender, app_pw)
            s.sendmail(sender, to_email, msg.as_string())
        return True
    except Exception:
        return False

def is_admin_user(username: str) -> bool:
    users = load_users()
    if username in users:
        return users[username].get("role") == "admin"
    return False

# ── Session state defaults ────────────────────────────────────────────────────
for key, default in {
    "logged_in": False, "username": "", "page": "predict", "last_result": None,
    "fp_step": "login",
    "fp_user": "",
    "fp_otp":  "",
    "fp_otp_ts": 0,
    "selected_patient": None,
}.items():
    if key not in st.session_state:
        st.session_state[key] = default

# ══════════════════════════════════════════════════════════════════════════════
# LOGIN PAGE
# ══════════════════════════════════════════════════════════════════════════════
def get_base64_image(image_path):
    try:
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode()
    except Exception:
        return ""

def show_login():
    img_path = os.path.join(os.path.dirname(__file__), "heart_logo.png")
    img_b64 = get_base64_image(img_path)
    
    img_html = f"<img src='data:image/png;base64,{img_b64}' style='width:240px; border-radius: 20px; box-shadow: 0 0 25px rgba(249,83,198,0.6); margin-bottom: 1rem;'>" if img_b64 else "<div style='font-size:4rem;'>❤️</div>"

    st.markdown(f"""
    <div style='text-align:center; padding-top:2rem;'>
        {img_html}
        <div class='hero-title'>HEART-IQ</div>
        <div class='hero-sub' style='font-size:1.5rem; font-weight:500; margin-top:0.5rem;'>Advanced Heart Disease Prediction System</div>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:

        # ══ STEP 1: Login / Register tabs ════════════════════════════════════
        if st.session_state.fp_step in ("login", "register"):
            # Tab switcher
            tc1, tc2 = st.columns(2)
            with tc1:
                login_active = "background:linear-gradient(135deg,#f953c6,#b91d73);color:white;" if st.session_state.fp_step == "login" else "background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.55);"
                if st.button("🔐 Sign In", key="tab_login"):
                    st.session_state.fp_step = "login"; st.rerun()
            with tc2:
                if st.button("✨ Create Account", key="tab_register"):
                    st.session_state.fp_step = "register"; st.rerun()

            st.markdown("<br>", unsafe_allow_html=True)

        # ── Login form ──────────────────────────────────────────────────────────
        if st.session_state.fp_step == "login":
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<div class='section-title'>🔐 Welcome Back</div>", unsafe_allow_html=True)

            username = st.text_input("Username", placeholder="Enter username", key="login_user")
            password = st.text_input("Password", type="password", placeholder="Enter password", key="login_pass")

            if st.button("Sign In →", key="btn_login"):
                users = load_users()
                if username in users and users[username]["password"] == password:
                    st.session_state.logged_in = True
                    st.session_state.username  = username
                    st.rerun()
                else:
                    st.error("❌ Invalid credentials.")

            st.markdown("""
            <div style='text-align:center; margin-top:0.8rem;'>
                <span style='color:rgba(255,255,255,0.35); font-size:0.85rem;'>Forgot your password?</span>
            </div>
            """, unsafe_allow_html=True)
            if st.button("🔑 Forgot Password", key="btn_forgot"):
                st.session_state.fp_step = "otp"; st.rerun()



            st.markdown("</div>", unsafe_allow_html=True)


        # ── Register form ───────────────────────────────────────────────────────
        elif st.session_state.fp_step == "register":
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<div class='section-title'>✨ Create New Account</div>", unsafe_allow_html=True)

            reg_user  = st.text_input("Choose Username", placeholder="e.g. dr_smith", key="reg_user")
            reg_email = st.text_input("Email Address",   placeholder="you@example.com", key="reg_email")
            reg_pass  = st.text_input("Password", type="password", placeholder="Min 6 characters", key="reg_pass")
            reg_conf  = st.text_input("Confirm Password", type="password", placeholder="Repeat password", key="reg_conf")

            if st.button("🚀 Create Account", key="btn_register"):
                users = load_users()
                if not reg_user or not reg_email or not reg_pass:
                    st.error("❌ All fields are required.")
                elif reg_user in users:
                    st.error(f"❌ Username **{reg_user}** is already taken.")
                elif len(reg_pass) < 6:
                    st.error("❌ Password must be at least 6 characters.")
                elif reg_pass != reg_conf:
                    st.error("❌ Passwords do not match.")
                elif "@" not in reg_email:
                    st.error("❌ Please enter a valid email address.")
                else:
                    users[reg_user] = {
                        "password": reg_pass,
                        "email":    reg_email,
                        "role":     "user",
                        "joined":   datetime.now().strftime("%Y-%m-%d"),
                    }
                    save_users(users)
                    st.success(f"✅ Account created! Welcome, **{reg_user}**. Please sign in.")
                    st.session_state.fp_step = "login"
                    st.rerun()

            st.markdown("</div>", unsafe_allow_html=True)

        # ══ STEP 2: Forgot Password → Send OTP ═════════════════════════════
        elif st.session_state.fp_step == "otp":
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<div class='section-title'>📧 Forgot Password</div>", unsafe_allow_html=True)
            st.markdown("<p style='color:rgba(255,255,255,0.6); font-size:0.9rem;margin-bottom:1rem;'>Enter your username and we'll send an OTP to your registered email.</p>", unsafe_allow_html=True)

            fp_username = st.text_input("Username", placeholder="Your username", key="fp_username")

            if st.button("📤 Send OTP", key="btn_send_otp"):
                users = load_users()
                if fp_username not in users:
                    st.error("❌ Username not found.")
                else:
                    otp = str(random.randint(100000, 999999))
                    st.session_state.fp_otp    = otp
                    st.session_state.fp_otp_ts = time.time()
                    st.session_state.fp_user   = fp_username

                    email = users[fp_username]["email"]
                    sent  = send_otp_email(email, otp)

                    if sent:
                        st.success(f"✅ OTP sent to **{email}**. Check your inbox!")
                    else:
                        st.warning(f"⚠️ Email not configured. **Demo OTP: `{otp}`** (visible for testing only)")

                    st.session_state.fp_step = "reset"
                    st.rerun()

            if st.button("← Back to Login", key="btn_back_otp"):
                st.session_state.fp_step = "login"
                st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)

        # ══ STEP 3: Enter OTP + New Password ═════════════════════════════════
        elif st.session_state.fp_step == "reset":
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<div class='section-title'>🔓 Reset Password</div>", unsafe_allow_html=True)

            # OTP expiry check
            elapsed     = time.time() - st.session_state.fp_otp_ts
            remaining   = max(0, int(300 - elapsed))
            mins, secs  = divmod(remaining, 60)

            if remaining > 0:
                st.markdown(f"<p style='color:rgba(255,255,255,0.5);font-size:0.85rem;'>⏱ OTP expires in <b style='color:#f953c6'>{mins}m {secs:02d}s</b></p>", unsafe_allow_html=True)
            else:
                st.error("⏰ OTP expired. Please request a new one.")
                if st.button("🔄 Request New OTP"):
                    st.session_state.fp_step = "otp"
                    st.rerun()
                st.markdown("</div>", unsafe_allow_html=True)
                return

            entered_otp  = st.text_input("Enter 6-digit OTP", placeholder="______", max_chars=6, key="entered_otp")
            new_password = st.text_input("New Password", type="password", placeholder="Min 6 characters", key="new_pass")
            confirm_pass = st.text_input("Confirm Password", type="password", placeholder="Repeat password", key="confirm_pass")

            if st.button("✅ Reset Password", key="btn_reset"):
                if entered_otp != st.session_state.fp_otp:
                    st.error("❌ Incorrect OTP. Please try again.")
                elif len(new_password) < 6:
                    st.error("❌ Password must be at least 6 characters.")
                elif new_password != confirm_pass:
                    st.error("❌ Passwords do not match.")
                else:
                    users = load_users()
                    users[st.session_state.fp_user]["password"] = new_password
                    save_users(users)
                    st.success(f"✅ Password reset for **{st.session_state.fp_user}**! You can now log in.")
                    st.session_state.fp_step = "login"
                    st.session_state.fp_otp  = ""
                    st.rerun()

            if st.button("← Back to Login", key="btn_back_reset"):
                st.session_state.fp_step = "login"
                st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# TOP NAV BAR
# ══════════════════════════════════════════════════════════════════════════════
def show_navbar():
    is_admin = is_admin_user(st.session_state.username)
    pages = [("🔮 Predict", "predict"), ("👥 Patients", "patients")]
    if is_admin:
        pages.append(("📊 Dashboard", "dashboard"))
        pages.append(("👑 Admin", "admin"))
    pages.append(("🚪 Logout", "logout"))

    st.markdown(f"""
    <div class='sticky-navbar'>
        <div style='display:flex; justify-content:space-between; align-items:center;
             background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
             border-radius:16px; padding:0.75rem 1.5rem; margin-bottom:1rem;'>
            <div style='font-size:1.3rem; font-weight:800;
                 background:linear-gradient(90deg,#f953c6,#b91d73);
                 -webkit-background-clip:text; -webkit-text-fill-color:transparent;'>
                ❤️ HEART-IQ
            </div>
            <div style='color:rgba(255,255,255,0.5); font-size:0.9rem;'>
                👤 Logged in as <b style='color:#f953c6'>{st.session_state.username}</b>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    cols = st.columns(len(pages))
    for col, (label, page) in zip(cols, pages):
        with col:
            if st.button(label, key=f"nav_{page}"):
                if page == "logout":
                    st.session_state.logged_in = False
                    st.session_state.username = ""
                    st.session_state.page = "predict"
                    st.rerun()
                else:
                    st.session_state.page = page
                    st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# PREDICT PAGE
# ══════════════════════════════════════════════════════════════════════════════
def show_predict():
    model = load_model()

    st.markdown("<div class='hero-title' style='font-size:2.2rem;'>🔮 Heart Disease Prediction</div>", unsafe_allow_html=True)
    st.markdown("<div class='hero-sub'>Enter patient vitals to generate a cardiac risk assessment</div>", unsafe_allow_html=True)

    if model is None:
        st.warning("⚠️ model.pkl not found. Please export your trained model from the notebook.")

    with st.form("prediction_form"):
        # ── Patient Info ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("<div class='section-title'>👤 Patient Information</div>", unsafe_allow_html=True)
        c1, c2, c3 = st.columns(3)
        patient_name = c1.text_input("Patient Name", placeholder="John Doe")
        age          = c2.number_input("Age", 1, 120, 50)
        sex          = c3.selectbox("Sex", ["Male", "Female"])
        st.markdown("</div>", unsafe_allow_html=True)

        # ── Clinical Data ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("<div class='section-title'>🩺 Clinical Parameters</div>", unsafe_allow_html=True)
        c1, c2, c3 = st.columns(3)
        cp       = c1.selectbox("Chest Pain Type", [0,1,2,3], format_func=lambda x: {0:"Asymptomatic (No Chest Pain)", 1:"Non-Anginal (Non-Heart Chest Pain)", 2:"Atypical Angina (Unusual Chest Pain)", 3:"Typical Angina Heart Pain (Severe)"}[x])
        trestbps = c2.number_input("Resting BP (mmHg)", 80, 200, 120)
        chol     = c3.number_input("Cholesterol (mg/dl)", 100, 600, 240)

        c1, c2, c3 = st.columns(3)
        fbs      = c1.selectbox("Fasting Blood Sugar >120", [0, 1], format_func=lambda x: {0:"Yes (1)", 1:"No (0)"}[x])
        restecg  = c2.selectbox("Resting ECG", [0,1,2], format_func=lambda x: {0:"Normal",1:"ST-T Abnormality",2:"LV Hypertrophy"}[x])
        thalach  = c3.number_input("Max Heart Rate", 60, 220, 150)
        st.markdown("</div>", unsafe_allow_html=True)

        # ── Advanced ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("<div class='section-title'>📈 Advanced Indicators</div>", unsafe_allow_html=True)
        c1, c2, c3 = st.columns(3)
        exang   = c1.selectbox("Exercise Angina", [0, 1], format_func=lambda x: {0:"Yes (1)", 1:"No (0)"}[x])
        slope   = c2.selectbox("ST Slope", [0,1,2], format_func=lambda x: {0:"Upsloping – Normal (Healthy)",1:"Flat – Moderate Risk",2:"Downsloping – High Risk"}[x])
        ca      = c3.selectbox("Major Vessels (0-3)", [0,1,2,3], format_func=lambda x: {0:"Severe (3 Vessels)", 1:"Moderate (2 Vessels)", 2:"Mild (1 Vessel)", 3:"Normal (No Vessels Affected)"}[x])
        oldpeak = 1.0  # Hardcoded default value since it was removed from the UI

        c1, c2 = st.columns(2)
        thal    = c1.selectbox("Thalassemia", [1,2,3], format_func=lambda x: {1:"Fixed Defect",2:"Reversible Defect",3:"Normal"}[x])
        st.markdown("</div>", unsafe_allow_html=True)

        submitted = st.form_submit_button("⚡ Run Prediction")

    if submitted:
        sex_val   = 1 if sex == "Male" else 0
        fbs_val   = fbs
        exang_val = exang

        input_arr = np.array([[age, sex_val, cp, trestbps, chol, fbs_val,
                               restecg, thalach, exang_val, oldpeak, slope, ca, thal]])

        if model is not None:
            prediction = model.predict(input_arr)[0]
            try:
                proba = model.predict_proba(input_arr)[0]
                risk_pct = round(proba[1] * 100, 1)
            except Exception:
                risk_pct = 85 if prediction == 1 else 15

            result = "HIGH" if prediction == 1 else "LOW"
            st.session_state.last_result = {
                "name": patient_name or "Unknown",
                "age": age, "sex": sex,
                "result": result, "risk_pct": risk_pct,
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "inputs": {
                    "cp": cp, "trestbps": trestbps, "chol": chol,
                    "fbs": fbs_val, "restecg": restecg, "thalach": thalach,
                    "exang": exang_val, "oldpeak": oldpeak, "slope": slope,
                    "ca": ca, "thal": thal
                }
            }
            st.session_state.patient_saved = False  # reset saved flag on new prediction
        else:
            st.error("Model not loaded. Cannot make a prediction.")

    # ── Show result + save button (outside if submitted, driven by session_state) ──
    if st.session_state.last_result is not None:
        r = st.session_state.last_result
        result   = r["result"]
        risk_pct = r["risk_pct"]

        col1, col2 = st.columns([2, 1])
        with col1:
            if result == "HIGH":
                st.markdown(f"<div class='risk-high'>⚠️ HIGH RISK — {risk_pct}% probability of heart disease</div>", unsafe_allow_html=True)
            else:
                st.markdown(f"<div class='risk-low'>✅ LOW RISK — {risk_pct}% probability of heart disease</div>", unsafe_allow_html=True)

        with col2:
            color = "#ff416c" if result == "HIGH" else "#38ef7d"
            st.markdown(f"""
            <div class='card' style='text-align:center;padding:1.2rem;'>
                <div class='metric-value' style='color:{color}'>{risk_pct}%</div>
                <div class='metric-label'>Risk Score</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("")
        
        # Action Buttons
        col_save, col_print = st.columns(2)
        
        with col_save:
            # Check if already saved to avoid duplicate saves
            if not st.session_state.get("patient_saved", False):
                if st.button("💾 Save Patient Record"):
                    patients = load_patients()
                    r["saved_by"] = st.session_state.username  # tag who saved it
                    patients.append(r)
                    save_patients(patients)
                    st.session_state.patient_saved = True
                    st.success(f"✅ Patient **{r['name']}** saved successfully!")
            else:
                st.success(f"✅ Patient **{r['name']}** already saved!")
                
        with col_print:
            st.components.v1.html(
                """
                <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap');
                body { margin: 0; padding: 0; }
                button {
                    background: linear-gradient(135deg, #f953c6, #b91d73);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1rem;
                    padding: 0.65rem 2rem;
                    width: 100%;
                    height: 44px; /* match Streamlit button height */
                    cursor: pointer;
                    font-family: 'Outfit', sans-serif;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(249,83,198,0.45);
                }
                </style>
                <button onclick="window.parent.print()">🖨️ Print as PDF</button>
                """,
                height=50
            )

        # ── AI Explanation & Health Suggestions ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        
        # Detail Explanation
        st.markdown("<div class='section-title'>🧠 AI Diagnostic Explanation</div>", unsafe_allow_html=True)
        inp = r["inputs"]
        factors = []
        if inp.get("cp", 0) > 0:
            factors.append(f"presence of chest pain (Type {inp.get('cp')})")
        if inp.get("trestbps", 0) > 130:
            factors.append(f"elevated resting blood pressure ({inp.get('trestbps')} mmHg)")
        if inp.get("chol", 0) > 200:
            factors.append(f"high cholesterol levels ({inp.get('chol')} mg/dl)")
        if inp.get("thalach", 0) < 100:
            factors.append(f"lower maximum heart rate achieved ({inp.get('thalach')} bpm)")
        if inp.get("exang", 0) == 1:
            factors.append("exercise-induced angina")
        if inp.get("oldpeak", 0) > 1.0:
            factors.append(f"ST depression ({inp.get('oldpeak')})")
        if inp.get("ca", 0) < 3: # 3 is Normal (No Vessels) in format_func
            factors.append(f"major vessel abnormalities")
            
        if result == "HIGH":
            explanation = f"Based on our ensemble machine learning model, the patient is at **HIGH RISK** ({risk_pct}% probability). "
            if factors:
                explanation += "This assessment is primarily driven by the following critical factors from the clinical profile: **" + "**, **".join(factors) + "**. "
            else:
                explanation += "This assessment is based on the complex multivariate interplay of the provided clinical vitals. "
            explanation += "Please review these indicators carefully."
        else:
            explanation = f"Based on our ensemble machine learning model, the patient is at **LOW RISK** ({risk_pct}% probability). The clinical parameters generally fall within safer ranges. "
            if factors:
                explanation += "However, there are still a few minor risk indicators to monitor: " + ", ".join(factors) + "."
                
        st.markdown(f"<div style='font-size:0.95rem; color:rgba(255,255,255,0.85); margin-bottom:1.8rem; line-height:1.6; background:rgba(255,255,255,0.03); padding:1rem; border-radius:10px; border-left:4px solid {'#ff416c' if result=='HIGH' else '#38ef7d'};'>{explanation}</div>", unsafe_allow_html=True)

        # Health Suggestions
        st.markdown("<div class='section-title'>💡 Actionable Health Suggestions</div>", unsafe_allow_html=True)
        
        suggestions = []
        if result == "HIGH":
            suggestions.append("🚨 **Consult a Cardiologist:** Your risk score is high. Please schedule a comprehensive checkup with a medical professional as soon as possible.")
        else:
            suggestions.append("✅ **Maintain Healthy Habits:** Your risk is low, but continue regular checkups and a healthy lifestyle to stay on track.")
            
        inp = r["inputs"]
        if inp.get("trestbps", 0) > 130:
            suggestions.append("🩸 **Manage Blood Pressure:** Your resting blood pressure is elevated. Consider reducing sodium intake, managing stress, and maintaining regular aerobic exercise.")
        if inp.get("chol", 0) > 200:
            suggestions.append("🍳 **Lower Cholesterol:** Your cholesterol level is elevated. Focus on a heart-healthy diet rich in fiber, omega-3s, and low in saturated fats.")
        if inp.get("cp", 0) > 0:
            suggestions.append("🫀 **Monitor Chest Pain:** You indicated experiencing some form of chest pain. Any chest pain should be evaluated by a healthcare provider.")
            
        for sug in suggestions:
            st.markdown(f"<div style='margin-bottom:0.6rem; color:rgba(255,255,255,0.85);'>• {sug}</div>", unsafe_allow_html=True)
            
        st.markdown("</div>", unsafe_allow_html=True)


        # ── CardioBot AI Chat (Sliding Panel) ──
        api_key = "AIzaSyBA4sy70ZmbLjKinVk3WcjP6T-AagszeW0" # Hidden from UI
        
        st.markdown("""
        <style>
        /* Move the chat input to the bottom of the floating panel */
        [data-testid="stVerticalBlock"]:has(> div > div > div > .cardiobot-panel-anchor) .stChatInputContainer { 
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 20px 2rem !important;
            background: rgba(15, 12, 41, 0.98) !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
            z-index: 10001 !important; 
        }
        
        /* Container for the FAB */
        [data-testid="stVerticalBlock"]:has(> div > div > div > .cardiobot-fab-anchor) {
            position: fixed; bottom: 30px; right: 30px; z-index: 9999; height: 60px; width: auto;
        }
        .cardiobot-fab-anchor { display: none; }
        [data-testid="stVerticalBlock"]:has(> div > div > div > .cardiobot-fab-anchor) [data-testid="stButton"] button {
            border-radius: 30px !important; width: auto !important; height: 60px !important;
            background: linear-gradient(135deg, #f953c6, #b91d73) !important;
            box-shadow: 0 4px 20px rgba(249,83,198,0.5) !important; border: none !important; padding: 0 24px !important;
        }
        [data-testid="stVerticalBlock"]:has(> div > div > div > .cardiobot-fab-anchor) [data-testid="stButton"] button p {
            font-size: 18px !important; color: white !important; margin: 0 !important; font-weight: 600 !important;
        }
        
        /* Container for the sliding panel */
        [data-testid="stVerticalBlock"]:has(> div > div > div > .cardiobot-panel-anchor) {
            position: fixed !important; top: 0 !important; right: 0 !important; width: 50vw !important; height: 100vh !important;
            background: rgba(15, 12, 41, 0.95) !important; backdrop-filter: blur(25px) !important;
            border-left: 1px solid rgba(255,255,255,0.1) !important; z-index: 10000 !important;
            padding: 2rem !important; padding-bottom: 100px !important; overflow-y: auto !important;
            box-shadow: -10px 0 40px rgba(0,0,0,0.6) !important; animation: slideIn 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        @media (max-width: 768px) { [data-testid="stVerticalBlock"]:has(> div > div > div > .cardiobot-panel-anchor) { width: 100vw !important; } }
        @keyframes slideIn { from { right: -50vw; } to { right: 0; } }
        </style>
        """, unsafe_allow_html=True)
        
        if "chat_open" not in st.session_state:
            st.session_state.chat_open = False
            
        if not st.session_state.chat_open:
            with st.container():
                st.markdown("<div class='cardiobot-fab-anchor'></div>", unsafe_allow_html=True)
                if st.button("💬 ChatBot", key="fab_open"):
                    st.session_state.chat_open = True
                    st.rerun()
                    
        if st.session_state.chat_open:
            with st.container():
                st.markdown("<div class='cardiobot-panel-anchor'></div>", unsafe_allow_html=True)
                
                col1, col2 = st.columns([5, 1])
                with col1:
                    st.markdown("<h2 style='margin-top:0;background:linear-gradient(90deg,#f953c6,#b91d73);-webkit-background-clip:text;-webkit-text-fill-color:transparent;'>💬 AI Assistant</h2>", unsafe_allow_html=True)
                with col2:
                    if st.button("✖", key="fab_close"):
                        st.session_state.chat_open = False
                        st.rerun()
                        
                if "chat_messages" not in st.session_state:
                    st.session_state.chat_messages = [
                        {"role": "assistant", "content": "Hello! I am CardioBot. I have analyzed your latest prediction. What would you like to know?"}
                    ]
                    
                # Display chat messages
                for message in st.session_state.chat_messages:
                    with st.chat_message(message["role"]):
                        st.markdown(message["content"])
                        
                # Chat input
                if prompt := st.chat_input("Ask CardioBot..."):
                    st.session_state.chat_messages.append({"role": "user", "content": prompt})
                    with st.chat_message("user"):
                        st.markdown(prompt)
                        
                    with st.chat_message("assistant"):
                        message_placeholder = st.empty()
                        full_response = ""
                        
                        if api_key and api_key.strip():
                            try:
                                import google.generativeai as genai
                                genai.configure(api_key=api_key.strip())
                                model = genai.GenerativeModel('gemini-2.5-flash')
                                
                                sys_prompt = f"You are CardioBot, an expert AI cardiology assistant. The patient's vitals: Age {r.get('age')}, Sex {r.get('sex')}, Cholesterol {inp.get('chol')}, BP {inp.get('trestbps')}, HR {inp.get('thalach')}. The model predicted a {'HIGH' if result=='HIGH' else 'LOW'} risk ({risk_pct}%). Answer their health queries concisely and professionally based on these vitals. Disclaimer: You are not a doctor, advise them to seek medical help for serious issues."
                                
                                prompt_with_context = f"{sys_prompt}\n\nRecent Chat History:\n"
                                for m in st.session_state.chat_messages[-4:-1]: # Last 3 messages for context
                                    prompt_with_context += f"{m['role'].capitalize()}: {m['content']}\n"
                                prompt_with_context += f"\nUser Question: {prompt}"
                                
                                response = model.generate_content(prompt_with_context, stream=True)
                                for chunk in response:
                                    full_response += chunk.text
                                    message_placeholder.markdown(full_response + "▌")
                                message_placeholder.markdown(full_response)
                                
                            except Exception as e:
                                full_response = f"⚠️ AI Error: {e}. Please check your API key or internet connection."
                                message_placeholder.markdown(full_response)
                        else:
                            prompt_lower = prompt.lower()
                            if "cholesterol" in prompt_lower or "chol" in prompt_lower:
                                ans = f"Your cholesterol is **{inp.get('chol')} mg/dl**. A level above 200 is considered borderline high, and above 240 is high. Consider limiting saturated fats and increasing soluble fiber intake."
                            elif "pressure" in prompt_lower or "bp" in prompt_lower:
                                ans = f"Your resting blood pressure is **{inp.get('trestbps')} mmHg**. Normal blood pressure is typically below 120/80. Managing stress and reducing sodium can help keep this in check."
                            elif "heart rate" in prompt_lower or "thalach" in prompt_lower:
                                ans = f"Your maximum achieved heart rate was **{inp.get('thalach')} bpm**. This indicates how hard your heart was working during the stress test."
                            elif "pain" in prompt_lower or "chest" in prompt_lower or "cp" in prompt_lower:
                                ans = f"You reported chest pain type **{inp.get('cp')}**. Any persistent chest pain, especially during physical activity, should be closely evaluated by a medical professional."
                            elif "risk" in prompt_lower or "result" in prompt_lower or "score" in prompt_lower:
                                ans = f"Based on the ensemble model, your risk is **{risk_pct}%** ({result}). This means you should {'definitely consult a doctor soon for a full evaluation' if result=='HIGH' else 'continue maintaining your healthy lifestyle and schedule regular checkups'}."
                            elif "exercise" in prompt_lower or "workout" in prompt_lower:
                                ans = "Aim for at least 150 minutes of moderate aerobic exercise (like brisk walking) a week, spread across multiple days. However, given your specific vitals, please get medical clearance before starting a strenuous new regimen."
                            elif "diet" in prompt_lower or "food" in prompt_lower or "eat" in prompt_lower:
                                ans = "A heart-healthy diet focuses on fruits, vegetables, whole grains, and lean proteins like fish. Try to avoid trans fats, heavily processed foods, and excess sodium."
                            else:
                                ans = "That's a great question. While I am a simulated AI for this demo without a full knowledge base, I strongly recommend discussing that specific concern with your cardiologist for personalized, medically sound advice! *(To unlock fully functional AI, enter a Gemini API Key above)*."
                            
                            for chunk in ans.split():
                                full_response += chunk + " "
                                time.sleep(0.04)
                                message_placeholder.markdown(full_response + "▌")
                            message_placeholder.markdown(full_response)
                            
                    st.session_state.chat_messages.append({"role": "assistant", "content": full_response})


# ══════════════════════════════════════════════════════════════════════════════
# PATIENTS PAGE
# ══════════════════════════════════════════════════════════════════════════════
def show_patients():
    all_patients = load_patients()
    is_admin = is_admin_user(st.session_state.username)

    # Role-based filter: regular users see only their own records
    if is_admin:
        patients = all_patients
    else:
        patients = [p for p in all_patients if p.get("saved_by", "") == st.session_state.username]

    def delete_patient_by_name(name):
        """Delete ALL records for a given patient name (respecting role)."""
        all_p = load_patients()
        if is_admin:
            updated = [p for p in all_p if p.get("name", "") != name]
        else:
            updated = [p for p in all_p if not (p.get("name", "") == name and p.get("saved_by", "") == st.session_state.username)]
        save_patients(updated)

    # ── Patient Detail View ─────────────────────────────────────────────────────
    if st.session_state.selected_patient:
        pname = st.session_state.selected_patient
        records = [p for p in patients if p.get("name","").lower() == pname.lower()]

        col_back, col_del = st.columns([5, 1])
        with col_back:
            if st.button("← Back to All Patients", key="btn_back_patients"):
                st.session_state.selected_patient = None
                st.rerun()
        with col_del:
            if st.button("🗑️ Delete Patient", key="btn_del_patient"):
                st.session_state["confirm_delete_patient"] = pname

        # Confirmation dialog
        if st.session_state.get("confirm_delete_patient") == pname:
            st.warning(f"⚠️ Are you sure you want to delete **all records** for **{pname}**? This cannot be undone.")
            cc1, cc2 = st.columns(2)
            with cc1:
                if st.button("✅ Yes, Delete", key="btn_confirm_del"):
                    delete_patient_by_name(pname)
                    st.session_state.selected_patient = None
                    st.session_state["confirm_delete_patient"] = None
                    st.success(f"✅ All records for **{pname}** deleted.")
                    st.rerun()
            with cc2:
                if st.button("❌ Cancel", key="btn_cancel_del"):
                    st.session_state["confirm_delete_patient"] = None
                    st.rerun()

        st.markdown(f"<div class='hero-title' style='font-size:2rem;'>👤 {pname}</div>", unsafe_allow_html=True)
        st.markdown(f"<div class='hero-sub'>{len(records)} visit(s) recorded</div>", unsafe_allow_html=True)

        if not records:
            st.info("No records found for this patient.")
            return

        latest = records[-1]
        total_visits = len(records)
        high_count   = sum(1 for r in records if r["result"] == "HIGH")
        avg_risk     = round(sum(r["risk_pct"] for r in records) / total_visits, 1)
        avg_chol     = round(sum(r["inputs"]["chol"] for r in records) / total_visits, 1)

        # Summary cards
        c1,c2,c3,c4,c5 = st.columns(5)
        for col, val, label, color in zip(
            [c1,c2,c3,c4,c5],
            [total_visits, latest["age"], latest["sex"], f"{avg_risk}%", high_count],
            ["Visits","Age","Sex","Avg Risk","High Risk Visits"],
            ["#f953c6","#60a5fa","#f472b6","#fbbf24","#ff416c"]
        ):
            with col:
                st.markdown(f"""
                <div class='metric-card'>
                    <div class='metric-value' style='color:{color};font-size:1.5rem'>{val}</div>
                    <div class='metric-label'>{label}</div>
                </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Build dataframe-like lists for charts
        dates     = [r["date"] for r in records]
        risks     = [r["risk_pct"] for r in records]
        chols     = [r["inputs"]["chol"] for r in records]
        bps       = [r["inputs"]["trestbps"] for r in records]
        hr        = [r["inputs"]["thalach"] for r in records]
        oldpeaks  = [r["inputs"]["oldpeak"] for r in records]
        results   = [r["result"] for r in records]

        CHART_STYLE = dict(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(255,255,255,0.03)",
            font_color="rgba(255,255,255,0.7)",
            xaxis=dict(gridcolor="rgba(255,255,255,0.06)", showgrid=True),
            yaxis=dict(gridcolor="rgba(255,255,255,0.06)", showgrid=True),
            margin=dict(l=10,r=10,t=40,b=10),
        )

        # ── Chart 1: Risk % over visits ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("<div class='section-title'>📊 Cardiac Risk Score Over Time</div>", unsafe_allow_html=True)
        fig1 = go.Figure()
        fig1.add_trace(go.Scatter(
            x=dates, y=risks, mode="lines+markers",
            line=dict(color="#f953c6", width=3),
            marker=dict(size=10, color=["#ff416c" if r=="HIGH" else "#38ef7d" for r in results],
                        line=dict(color="white",width=2)),
            name="Risk %",
            hovertemplate="<b>%{x}</b><br>Risk: %{y}%<extra></extra>"
        ))
        fig1.add_hline(y=50, line_dash="dash", line_color="rgba(255,255,255,0.2)",
                       annotation_text="50% threshold", annotation_font_color="rgba(255,255,255,0.4)")
        fig1.update_layout(height=260, **CHART_STYLE)
        st.plotly_chart(fig1, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

        # ── Chart 2: Clinical trend (3 lines) ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("<div class='section-title'>🫥 Clinical Parameters Trend</div>", unsafe_allow_html=True)
        col_a, col_b = st.columns(2)
        with col_a:
            fig2 = go.Figure()
            fig2.add_trace(go.Scatter(x=dates, y=chols, mode="lines+markers",
                line=dict(color="#fbbf24",width=2), name="Cholesterol",
                hovertemplate="Chol: %{y} mg/dl<extra></extra>"))
            fig2.add_trace(go.Scatter(x=dates, y=bps, mode="lines+markers",
                line=dict(color="#60a5fa",width=2), name="Blood Pressure",
                hovertemplate="BP: %{y} mmHg<extra></extra>"))
            fig2.update_layout(height=240, title="Cholesterol & Blood Pressure",
                title_font_color="rgba(255,255,255,0.6)", title_font_size=13, **CHART_STYLE)
            st.plotly_chart(fig2, use_container_width=True)
        with col_b:
            fig3 = go.Figure()
            fig3.add_trace(go.Scatter(x=dates, y=hr, mode="lines+markers",
                line=dict(color="#38ef7d",width=2), name="Max Heart Rate",
                hovertemplate="HR: %{y} bpm<extra></extra>"))
            fig3.add_trace(go.Scatter(x=dates, y=oldpeaks, mode="lines+markers",
                line=dict(color="#f472b6",width=2), name="Oldpeak",
                hovertemplate="Oldpeak: %{y}<extra></extra>"))
            fig3.update_layout(height=240, title="Heart Rate & ST Depression",
                title_font_color="rgba(255,255,255,0.6)", title_font_size=13, **CHART_STYLE)
            st.plotly_chart(fig3, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

        # ── Chart 3: Risk distribution bar ──
        if len(records) > 1:
            st.markdown("<div class='card'>", unsafe_allow_html=True)
            st.markdown("<div class='section-title'>🥧 Risk Distribution Across Visits</div>", unsafe_allow_html=True)
            fig4 = go.Figure(go.Bar(
                x=dates, y=risks,
                marker_color=["#ff416c" if r=="HIGH" else "#38ef7d" for r in results],
                hovertemplate="<b>%{x}</b><br>Risk: %{y}%<extra></extra>"
            ))
            fig4.update_layout(height=220, **CHART_STYLE)
            st.plotly_chart(fig4, use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)

        # ── Visit history table ──
        st.markdown("<div class='card'>", unsafe_allow_html=True)
        st.markdown("<div class='section-title'>🗓️ Visit History</div>", unsafe_allow_html=True)
        for i, r in enumerate(reversed(records), 1):
            rc = "#ff416c" if r["result"]=="HIGH" else "#38ef7d"
            ic = "⚠️" if r["result"]=="HIGH" else "✅"
            inp = r["inputs"]
            st.markdown(f"""
            <div style='border:1px solid rgba(255,255,255,0.08);border-radius:12px;
                 padding:1rem 1.2rem;margin-bottom:0.6rem;
                 background:rgba(255,255,255,0.03);'>
                <div style='display:flex;justify-content:space-between;margin-bottom:0.5rem;'>
                    <span style='font-weight:700;color:white;'>Visit #{len(records)-i+1}</span>
                    <span style='color:{rc};font-weight:700;'>{ic} {r['result']} · {r['risk_pct']}%</span>
                    <span style='color:rgba(255,255,255,0.35);font-size:0.82rem;'>{r['date']}</span>
                </div>
                <div style='display:flex;flex-wrap:wrap;gap:0.6rem;font-size:0.82rem;
                     color:rgba(255,255,255,0.55);'>
                    <span>🫘 BP: {inp['trestbps']} mmHg</span>
                    <span>🧪 Chol: {inp['chol']} mg/dl</span>
                    <span>❤️ HR: {inp['thalach']} bpm</span>
                    <span>📉 Oldpeak: {inp['oldpeak']}</span>
                    <span>🫙 Vessels: {inp['ca']}</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        return   # don't show the list view

    # ── Patient List View ──────────────────────────────────────────────────────
    st.markdown("<div class='hero-title' style='font-size:2.2rem;'>👥 Saved Patients</div>", unsafe_allow_html=True)
    st.markdown("<div class='hero-sub'>Click a patient to view full history and analysis</div>", unsafe_allow_html=True)

    if not patients:
        if is_admin:
            st.info("No patients saved yet. Run a prediction and click 'Save Patient Record'.")
        else:
            st.info("You have no saved records yet. Run a prediction and save your first patient.")
        return

    # Context badge
    if is_admin:
        st.markdown("<div style='background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:0.5rem 1rem;margin-bottom:1rem;font-size:0.85rem;color:#fbbf24;'>👑 Admin view — showing ALL patient records</div>", unsafe_allow_html=True)
    else:
        st.markdown(f"<div style='background:rgba(249,83,198,0.1);border:1px solid rgba(249,83,198,0.3);border-radius:10px;padding:0.5rem 1rem;margin-bottom:1rem;font-size:0.85rem;color:#f953c6;'>🔒 Showing only your records — logged in as <b>{st.session_state.username}</b></div>", unsafe_allow_html=True)

    total = len(patients)
    high  = sum(1 for p in patients if p["result"] == "HIGH")
    low   = total - high

    c1, c2, c3 = st.columns(3)
    for col, val, label, color in zip(
        [c1, c2, c3],
        [total, high, low],
        ["Total Records", "High Risk", "Low Risk"],
        ["#f953c6", "#ff416c", "#38ef7d"]
    ):
        with col:
            st.markdown(f"""
            <div class='metric-card'>
                <div class='metric-value' style='color:{color}'>{val}</div>
                <div class='metric-label'>{label}</div>
            </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    search = st.text_input("🔍 Search patient by name", placeholder="Type name...")

    # Group by patient name
    grouped = {}
    for p in patients:
        n = p.get("name","Unknown")
        grouped.setdefault(n, []).append(p)

    for pname, recs in grouped.items():
        if search and search.lower() not in pname.lower():
            continue
        latest    = recs[-1]
        visits    = len(recs)
        last_risk = latest["risk_pct"]
        last_res  = latest["result"]
        rc  = "#ff416c" if last_res=="HIGH" else "#38ef7d"
        ic  = "⚠️" if last_res=="HIGH" else "✅"

        col_info, col_btn, col_del = st.columns([5, 1, 1])
        with col_info:
            st.markdown(f"""
            <div class='patient-row'>
                <div style='display:flex;justify-content:space-between;align-items:center;'>
                    <div>
                        <span style='font-weight:700;font-size:1.05rem;'>{pname}</span>
                        <span style='color:rgba(255,255,255,0.4);margin-left:1rem;font-size:0.85rem;'>
                            Age {latest.get('age','—')} · {latest.get('sex','—')} · {visits} visit(s)
                        </span>
                    </div>
                    <div style='display:flex;gap:1rem;align-items:center;'>
                        <span style='color:{rc};font-weight:700;'>{ic} {last_res} · {last_risk}%</span>
                        <span style='color:rgba(255,255,255,0.3);font-size:0.8rem;'>{latest.get('date','—')}</span>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)
        with col_btn:
            if st.button("📈 View", key=f"view_{pname}"):
                st.session_state.selected_patient = pname
                st.rerun()
        with col_del:
            if st.button("🗑️", key=f"del_{pname}", help=f"Delete {pname}"):
                delete_patient_by_name(pname)
                st.success(f"✅ **{pname}** deleted.")
                st.rerun()

    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("🗑️ Clear All Records"):
        save_patients([])
        st.success("All records cleared.")
        st.rerun()

# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD PAGE
# ══════════════════════════════════════════════════════════════════════════════
def show_dashboard():
    all_patients = load_patients()
    is_admin = is_admin_user(st.session_state.username)

    # Role-based filter
    if is_admin:
        patients = all_patients
        dash_sub = "Population-level insights from all saved patient records"
    else:
        patients = [p for p in all_patients if p.get("saved_by", "") == st.session_state.username]
        dash_sub  = f"Your personal analytics — {st.session_state.username}'s records"

    st.markdown("<div class='hero-title' style='font-size:2.2rem;'>📊 Analytics Dashboard</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='hero-sub'>{dash_sub}</div>", unsafe_allow_html=True)

    if not patients:
        st.info("No data yet. Run a prediction and save a patient record first.")
        return

    total = len(patients)
    high  = sum(1 for p in patients if p["result"] == "HIGH")
    low   = total - high
    male  = sum(1 for p in patients if p.get("sex") == "Male")
    female = total - male
    avg_age = round(sum(p["age"] for p in patients) / total, 1)
    avg_chol = round(sum(p["inputs"]["chol"] for p in patients) / total, 1)

    # Top metrics
    cols = st.columns(6)
    stats = [
        (total, "Total Patients", "#f953c6"),
        (high, "High Risk", "#ff416c"),
        (low, "Low Risk", "#38ef7d"),
        (male, "Male", "#60a5fa"),
        (female, "Female", "#f472b6"),
        (avg_age, "Avg Age", "#fbbf24"),
    ]
    for col, (val, label, color) in zip(cols, stats):
        with col:
            st.markdown(f"""
            <div class='metric-card'>
                <div class='metric-value' style='color:{color}'>{val}</div>
                <div class='metric-label'>{label}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Risk breakdown bar
    if total > 0:
        high_pct = round(high / total * 100)
        low_pct  = 100 - high_pct
        st.markdown(f"""
        <div class='card'>
            <div class='section-title'>📊 Risk Distribution</div>
            <div style='display:flex; border-radius:12px; overflow:hidden; height:28px; margin-bottom:0.5rem;'>
                <div style='width:{high_pct}%; background:linear-gradient(90deg,#ff416c,#ff4b2b);
                     display:flex; align-items:center; justify-content:center;
                     color:white; font-weight:700; font-size:0.85rem;'>
                    {high_pct}% High
                </div>
                <div style='width:{low_pct}%; background:linear-gradient(90deg,#11998e,#38ef7d);
                     display:flex; align-items:center; justify-content:center;
                     color:white; font-weight:700; font-size:0.85rem;'>
                    {low_pct}% Low
                </div>
            </div>
            <div style='color:rgba(255,255,255,0.45); font-size:0.8rem;'>
                Based on {total} patients &nbsp;·&nbsp; Avg Cholesterol: {avg_chol} mg/dl
            </div>
        </div>
        """, unsafe_allow_html=True)

    # Recent 5
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.markdown("<div class='section-title'>🕐 Recent Activity</div>", unsafe_allow_html=True)
    for p in list(reversed(patients))[:5]:
        risk_color = "#ff416c" if p["result"] == "HIGH" else "#38ef7d"
        st.markdown(f"""
        <div style='display:flex; justify-content:space-between; padding:0.5rem 0;
             border-bottom:1px solid rgba(255,255,255,0.06);'>
            <span style='color:rgba(255,255,255,0.8);'>{p.get("name","Unknown")} · Age {p.get("age","—")}</span>
            <span style='color:{risk_color}; font-weight:600;'>{p["result"]} · {p.get("risk_pct","—")}%</span>
            <span style='color:rgba(255,255,255,0.3); font-size:0.8rem;'>{p.get("date","—")}</span>
        </div>
        """, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN USERS PAGE
# ══════════════════════════════════════════════════════════════════════════════
def show_admin_users():
    if not is_admin_user(st.session_state.username):
        st.error("⛔ Access denied. Admin only.")
        return

    st.markdown("<div class='hero-title' style='font-size:2.2rem;'>👑 Admin Panel — User Management</div>", unsafe_allow_html=True)
    st.markdown("<div class='hero-sub'>View, manage and delete registered accounts</div>", unsafe_allow_html=True)

    users = load_users()
    total = len(users)
    admins = sum(1 for u in users.values() if u.get("role") == "admin")
    doctors = sum(1 for u in users.values() if u.get("role") == "doctor")
    regular = total - admins - doctors

    c1, c2, c3, c4 = st.columns(4)
    for col, val, label, color in zip(
        [c1, c2, c3, c4],
        [total, admins, doctors, regular],
        ["Total Users", "Admins", "Doctors", "Regular Users"],
        ["#f953c6", "#fbbf24", "#60a5fa", "#38ef7d"]
    ):
        with col:
            st.markdown(f"""
            <div class='metric-card'>
                <div class='metric-value' style='color:{color}'>{val}</div>
                <div class='metric-label'>{label}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Search
    search = st.text_input("🔍 Search by username or email", placeholder="Type to filter...")
    st.markdown("<br>", unsafe_allow_html=True)

    role_colors = {"admin": "#fbbf24", "doctor": "#60a5fa", "user": "#38ef7d"}
    to_delete = None

    for uname, udata in users.items():
        if search and search.lower() not in uname.lower() and search.lower() not in udata.get("email","").lower():
            continue
        role  = udata.get("role", "user")
        color = role_colors.get(role, "#ccc")
        joined = udata.get("joined", "—")

        col_info, col_del = st.columns([5, 1])
        with col_info:
            st.markdown(f"""
            <div class='patient-row' style='display:flex; justify-content:space-between; align-items:center;'>
                <div>
                    <span style='font-weight:700; font-size:1rem; color:white;'>👤 {uname}</span>
                    <span style='color:rgba(255,255,255,0.4); margin-left:1rem; font-size:0.85rem;'>{udata.get("email","—")}</span>
                </div>
                <div style='display:flex; gap:1.5rem; align-items:center;'>
                    <span style='background:rgba(255,255,255,0.06); border-radius:50px; padding:0.2rem 0.8rem;
                                 color:{color}; font-size:0.8rem; font-weight:700;'>{role.upper()}</span>
                    <span style='color:rgba(255,255,255,0.3); font-size:0.8rem;'>Joined {joined}</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
        with col_del:
            if uname != "admin":  # protect admin from deletion
                if st.button("🗑️", key=f"del_{uname}", help=f"Delete {uname}"):
                    to_delete = uname

    if to_delete:
        users = load_users()
        del users[to_delete]
        save_users(users)
        st.success(f"✅ User **{to_delete}** deleted.")
        st.rerun()

    # ── Add user form ──
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.markdown("<div class='section-title'>➕ Add New User</div>", unsafe_allow_html=True)
    ac1, ac2, ac3, ac4, ac5 = st.columns(5)
    new_uname = ac1.text_input("Username", key="adm_uname", placeholder="Username")
    new_email = ac2.text_input("Email",    key="adm_email", placeholder="email@x.com")
    new_pass  = ac3.text_input("Password", key="adm_pass",  placeholder="password", type="password")
    new_role  = ac4.selectbox("Role",      ["user", "doctor", "admin"], key="adm_role")
    with ac5:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("➕ Add User", key="btn_add_user"):
            if not new_uname or not new_email or not new_pass:
                st.error("❌ All fields required.")
            else:
                users = load_users()
                if new_uname in users:
                    st.error(f"❌ Username **{new_uname}** already exists.")
                else:
                    users[new_uname] = {
                        "password": new_pass, "email": new_email,
                        "role": new_role, "joined": datetime.now().strftime("%Y-%m-%d")
                    }
                    save_users(users)
                    st.success(f"✅ User **{new_uname}** added as {new_role}!")
                    st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# ROUTER
# ══════════════════════════════════════════════════════════════════════════════
if not st.session_state.logged_in:
    show_login()
else:
    show_navbar()
    page = st.session_state.page
    if page == "predict":
        show_predict()
    elif page == "patients":
        show_patients()
    elif page == "dashboard":
        show_dashboard()
    elif page == "admin":
        show_admin_users()
