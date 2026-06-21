import React, { useState, useEffect } from 'react';
import heartLogo from '../assets/heart_logo.png';

/**
 * ============================================================================
 * LOGIN, REGISTER, & PASSWORD RESET PAGE (Login.jsx)
 * ============================================================================
 * Purpose:
 * This page acts as the security gate for the application. It handles 
 * everything related to letting users in, creating new accounts, and 
 * helping them recover lost passwords.
 * 
 * How it works:
 * Because all these forms happen on the same screen, we use a variable 
 * called 'fpStep' to swap between them without refreshing the web page.
 * ============================================================================
 */
export default function Login({ onLoginSuccess }) {
  
  // --------------------------------------------------------------------------
  // 1. PAGE TOGGLING STATE (Which form are we looking at?)
  // --------------------------------------------------------------------------
  // fpStep can be:
  // 'login'    -> Shows the normal Sign In form
  // 'register' -> Shows the Create Account form
  // 'otp'      -> Shows the "Enter Username for Forgot Password" form
  // 'reset'    -> Shows the "Enter 6-digit OTP and New Password" form
  const [fpStep, setFpStep] = useState('login'); 
  
  // --------------------------------------------------------------------------
  // 2. FORM MEMORY (Variables to store what the user types in the boxes)
  // --------------------------------------------------------------------------
  
  // Variables for the Login Form
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false); // Used to toggle the "eye" icon to see password
  const [loginError, setLoginError] = useState(''); // Stores error messages (e.g. "Wrong password")
  
  // Variables for the Register (Create Account) Form
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConf, setRegConf] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConf, setShowRegConf] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  
  // Variables for the Forgot Password (OTP) Flow
  const [fpUsername, setFpUsername] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null); 
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(300); // Countdown timer: 300 seconds = 5 minutes

  /**
   * --------------------------------------------------------------------------
   * 3. AUTOMATIC COUNTDOWN TIMER (For Password Reset)
   * --------------------------------------------------------------------------
   * What this does: When you are on the 'reset' step (entering your OTP), 
   * this piece of code automatically counts down by 1 every second. 
   * Once it hits 0, the OTP is useless and the boxes are disabled.
   */
  useEffect(() => {
    let interval = null;
    if (fpStep === 'reset' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval); // Stops the timer if we change pages
  }, [fpStep, otpTimer]);

  // ==========================================================================
  // 4. ACTION FUNCTIONS (What happens when buttons are clicked)
  // ==========================================================================

  /**
   * Action: "Sign In" Button Clicked
   * Purpose: Sends the username and password to the backend (/api/auth/login).
   * If correct, the backend says "success: True", and we log them in!
   */
  const handleLogin = async (e) => {
    e.preventDefault(); // Stops the page from refreshing
    setLoginError('');
    try {
      // Send data to the Python Backend
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      
      // If the backend approves, tell the App.jsx file we are successful
      if (res.ok) {
        onLoginSuccess(data.username, data.role, data.email);
      } else {
        // If the password was wrong, show the error on screen
        setLoginError(data.detail || 'Invalid username or password.');
      }
    } catch (err) {
      setLoginError('Could not connect to backend server. Make sure FastAPI is running on port 8000.');
    }
  };

  /**
   * Action: "Create Account" Button Clicked
   * Purpose: Sends new user details to the backend (/api/auth/register).
   * If successful, it switches them back to the Login tab.
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUser,
          email: regEmail,
          password: regPass,
          confirm_password: regConf
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(data.detail || 'Registration successful! Please sign in.');
        setFpStep('login'); // Swap the view to the login tab
        setLoginUser(regUser); // Automatically fill in their new username to be nice
      } else {
        setRegError(data.detail || 'Registration failed.');
      }
    } catch (err) {
      setRegError('Could not connect to backend server.');
    }
  };

  /**
   * Action: "Send OTP" Button Clicked (on the Forgot Password screen)
   * Purpose: Asks the backend to generate a 6-digit code and email it to the user.
   */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/forgot-password/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fpUsername })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpInfo({ email: data.email, demo_otp: data.demo_otp });
        setOtpTimer(300); // Reset the countdown timer to 5 minutes
        setFpStep('reset'); // Swap the view so they can type in the code
      } else {
        setOtpError(data.detail || 'Username not found.');
      }
    } catch (err) {
      setOtpError('Could not connect to backend server.');
    }
  };

  /**
   * Action: "Reset Password" Button Clicked
   * Purpose: Sends the 6-digit code they typed AND their new password to the backend.
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setOtpError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fpUsername,
          otp: enteredOtp,
          new_password: newPassword,
          confirm_password: confirmPass
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(data.detail || 'Password reset successfully! Please sign in.');
        setFpStep('login'); // Swap back to login
        setLoginUser(fpUsername); 
      } else {
        setOtpError(data.detail || 'Password reset failed.');
      }
    } catch (err) {
      setOtpError('Could not connect to backend server.');
    }
  };

  // --------------------------------------------------------------------------
  // Helper: Converts seconds (e.g. 150) into a nice minute/second text (2m 30s)
  // --------------------------------------------------------------------------
  const formatTimer = () => {
    const mins = Math.floor(otpTimer / 60);
    const secs = otpTimer % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // ==========================================================================
  // 5. DRAWING THE SCREEN (THE HTML / JSX)
  // ==========================================================================
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1.2fr 480px 0.8fr', // Layout with 3 columns
      alignItems: 'center',
      padding: '2rem',
      backgroundColor: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 
        ----------------------------------------------------
        AESTHETICS: BACKGROUND BUBBLES AND WAVES
        These are just floating circles to make the page look pretty.
        ----------------------------------------------------
      */}
      <div className="orb orb-1" style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'float 8s ease-in-out infinite', width: '300px', height: '300px', top: '-80px', right: '15%', background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent)' }} />
      <div className="orb orb-2" style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'float 8s ease-in-out infinite', width: '200px', height: '200px', bottom: '10%', left: '5%', background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent)', animationDelay: '-3s' }} />
      <div className="orb orb-3" style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'float 8s ease-in-out infinite', width: '150px', height: '150px', top: '40%', left: '30%', background: 'radial-gradient(circle, rgba(6,182,212,0.1), transparent)', animationDelay: '-5s' }} />

      {/* ECG Background Line */}
      <div className="ecg-bg" style={{ position: 'fixed', bottom: '60px', left: 0, right: 0, opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}>
        <svg viewBox="0 0 1200 80" xmlns="http://www.w3.org/2000/svg" width="100%">
          <polyline points="0,40 100,40 120,40 130,10 140,70 150,5 165,75 175,40 300,40 320,40 330,15 340,65 350,8 365,72 375,40 500,40 520,40 530,15 540,65 550,8 565,72 575,40 700,40 720,40 730,15 740,65 750,8 765,72 775,40 900,40 920,40 930,15 940,65 950,8 965,72 975,40 1100,40 1120,40 1130,15 1140,65 1150,8 1165,72 1175,40 1200,40"
            fill="none" stroke="#0891B2" strokeWidth="2"/>
        </svg>
      </div>

      {/* 
        ----------------------------------------------------
        LEFT COLUMN: WELCOME TEXT
        ----------------------------------------------------
      */}
      <div style={{ gridColumn: 1, padding: '2rem 3rem', zIndex: 1, animation: 'fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.18)', borderRadius: '24px', padding: '0.5rem 1.25rem', fontSize: '1.1rem', fontWeight: 700, color: '#0891B2', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
          HEART-IQ  ◆  AI Powered
        </div>
        <div className="hero-headline" style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '1.25rem' }}>
          Predict.<br />Prevent.<br /><em style={{ fontStyle: 'normal', color: '#0891B2' }}>Protect.</em>
        </div>
        <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.7, maxWidth: '420px', marginBottom: '2rem' }}>
          Advanced cardiac risk assessment powered by ensemble machine learning.
          Built for clinicians who demand precision, speed, and trust.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {[
            '98.5% model accuracy on clinical datasets',
            'Real-time AI-powered risk stratification',
            'Secure patient record management',
            'Intelligent CardioBot assistant'
          ].map((feat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem' }}>✓</span>
              {feat}
            </div>
          ))}
        </div>
      </div>

      {/* 
        ----------------------------------------------------
        MIDDLE COLUMN: THE LOGIN/REGISTER CARDS
        ----------------------------------------------------
      */}
      <div style={{
        gridColumn: 2,
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(15,23,42,0.08)',
        borderRadius: '24px',
        padding: '2.5rem 2.25rem',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        boxShadow: '0 20px 50px rgba(15,23,42,0.06), 0 0 0 1px rgba(255,255,255,0.6) inset',
        zIndex: 1,
        animation: 'scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both'
      }}>
        {/* Logo Icon inside the white box */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={heartLogo} alt="HEART-IQ Logo" style={{ width: '100%', height: 'auto', maxHeight: '220px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }} />
        </div>

        {/* If registration succeeded, show a green success box */}
        {regSuccess && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', marginBottom: '1rem' }}>
            {regSuccess}
          </div>
        )}

        {/* If we are on the Login OR Register screen, show the Top Tabs */}
        {(fpStep === 'login' || fpStep === 'register') && (
          <>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginTop: '0.5rem', marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.6rem' }}>
              {fpStep === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h3>
            
            {/* Tab switch buttons (Sign In | Create Account) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button
                className={`btn ${fpStep === 'login' ? '' : 'btn-secondary'}`}
                style={{ height: '40px', padding: 0 }}
                onClick={() => { setFpStep('login'); setLoginError(''); setRegError(''); }}
              >
                Sign In
              </button>
              <button
                className={`btn ${fpStep === 'register' ? '' : 'btn-secondary'}`}
                style={{ height: '40px', padding: 0 }}
                onClick={() => { setFpStep('register'); setLoginError(''); setRegError(''); }}
              >
                Create Account
              </button>
            </div>
          </>
        )}

        {/* 
        ----------------------------------------------------
        FORM 1: LOGIN
        ----------------------------------------------------
        */}
        {fpStep === 'login' && (
          <form onSubmit={handleLogin}>
            {/* Shows a red box if password was wrong */}
            {loginError && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input
                  type="text"
                  className="input-control"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label className="form-label">Password</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                {/* Notice the type toggles between 'text' and 'password' so you can see what you type */}
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  className="input-control"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
                <button type="button" className="btn-eye" onClick={() => setShowLoginPass(!showLoginPass)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showLoginPass ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Forgot Password Button */}
            <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#0891B2', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                onClick={() => setFpStep('otp')} // This swaps to the Forgot Password form
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="btn">Sign In →</button>
          </form>
        )}

        {/* 
        ----------------------------------------------------
        FORM 2: REGISTER
        ----------------------------------------------------
        */}
        {fpStep === 'register' && (
          <form onSubmit={handleRegister}>
            {regError && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                {regError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type="text" className="input-control" value={regUser} onChange={(e) => setRegUser(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type="email" className="input-control" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type={showRegPass ? 'text' : 'password'} className="input-control" value={regPass} onChange={(e) => setRegPass(e.target.value)} required />
                <button type="button" className="btn-eye" onClick={() => setShowRegPass(!showRegPass)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type={showRegConf ? 'text' : 'password'} className="input-control" value={regConf} onChange={(e) => setRegConf(e.target.value)} required />
                <button type="button" className="btn-eye" onClick={() => setShowRegConf(!showRegConf)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <button type="submit" className="btn">Create Account →</button>
          </form>
        )}

        {/* 
        ----------------------------------------------------
        FORM 3: FORGOT PASSWORD (REQUEST OTP)
        ----------------------------------------------------
        */}
        {fpStep === 'otp' && (
          <form onSubmit={handleSendOtp}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginTop: '0.5rem', marginBottom: '1rem', fontWeight: 800, fontSize: '1.3rem' }}>
              Reset Password
            </h3>
            <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.5 }}>
              Enter your username and we'll send an OTP verification to your registered email.
            </p>
            {otpError && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                {otpError}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Username</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type="text" className="input-control" value={fpUsername} onChange={(e) => setFpUsername(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn" style={{ marginBottom: '1rem' }}>Send OTP →</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setFpStep('login'); setOtpError(''); }}>
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* 
        ----------------------------------------------------
        FORM 4: FORGOT PASSWORD (ENTER OTP)
        ----------------------------------------------------
        */}
        {fpStep === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <h3 style={{ textAlign: 'center', color: '#0F172A', marginTop: '0.5rem', marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.3rem' }}>
              Reset Password
            </h3>
            
            {/* The Countdown Timer */}
            {otpTimer > 0 ? (
              <p style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', marginBottom: '1rem' }}>
                ⏱ OTP expires in <b style={{ color: '#0891B2' }}>{formatTimer()}</b>
              </p>
            ) : (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                OTP expired. Please request a new one.
              </div>
            )}

            {/* If email wasn't configured, we print the OTP directly on the screen for demo purposes */}
            {otpInfo && otpInfo.demo_otp && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#B45309', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                Demo SMTP fallback: OTP is <b>{otpInfo.demo_otp}</b>
              </div>
            )}

            {otpError && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
                {otpError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">6-Digit OTP</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                {/* Note the disabled={otpTimer === 0} which grays out the box if the timer ran out */}
                <input type="text" className="input-control" maxLength={6} value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} disabled={otpTimer === 0} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type={showNewPass ? 'text' : 'password'} className="input-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={otpTimer === 0} required />
                <button type="button" className="btn-eye" onClick={() => setShowNewPass(!showNewPass)} disabled={otpTimer === 0}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Confirm New Password</label>
              <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                <input type={showConfirmPass ? 'text' : 'password'} className="input-control" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} disabled={otpTimer === 0} required />
                <button type="button" className="btn-eye" onClick={() => setShowConfirmPass(!showConfirmPass)} disabled={otpTimer === 0}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <button type="submit" className="btn" style={{ marginBottom: '1rem' }} disabled={otpTimer === 0}>Reset Password →</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setFpStep('otp'); setOtpError(''); setOtpInfo(null); }}>
              Request New OTP
            </button>
          </form>
        )}
      </div>

      {/* Creator Footer */}
      <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.85rem', color: '#64748B', zIndex: 10 }}>
        Created by Umang Pandey | <a href="https://umangpandey.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#0891B2', textDecoration: 'none', fontWeight: 600 }}>🌐 Portfolio</a>
      </div>
    </div>
  );
}
