import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Plot from 'react-plotly.js';

const STEPS = [
  { icon: '👤', label: 'Patient Info' },
  { icon: '🩺', label: 'Clinical Data' },
  { icon: '📈', label: 'Advanced' },
  { icon: '🔮', label: 'AI Analysis' }
];

/**
 * ============================================================================
 * PREDICT & AI ANALYSIS PAGE (Predict.jsx)
 * ============================================================================
 * Purpose:
 * This is the heart of the application. It provides a step-by-step form 
 * (a wizard) for doctors or users to enter clinical patient data (like 
 * blood pressure, cholesterol, etc.). 
 * 
 * Once all the data is entered, it asks the backend AI model to predict the 
 * risk of heart disease and displays the results in a beautiful dashboard.
 * It also includes the "CardioBot" AI assistant that pops up to answer questions.
 * ============================================================================
 */
export default function Predict({ username }) {
  // --------------------------------------------------------------------------
  // 1. PAGE STATE (Variables to remember what is happening on screen)
  // --------------------------------------------------------------------------
  
  // 'step' controls which part of the form we are looking at (0, 1, 2, or 3)
  const [step, setStep] = useState(0);
  
  // 'formData' is a memory box that stores all 13 medical inputs from the user
  const [formData, setFormData] = useState({
    patient_name: '',
    age: 50,
    sex: 'Male',
    cp: 0,
    trestbps: 120,
    chol: 240,
    fbs: 0,
    restecg: 0,
    thalach: 150,
    exang: 0,
    slope: 0,
    ca: 0,
    thal: 3
  });

  // 'loading' shows a spinner when we are waiting for the AI to think
  const [loading, setLoading] = useState(false);
  
  // 'result' stores the final answer from the AI (High/Low risk, Percentage, etc.)
  const [result, setResult] = useState(null); 
  
  const [saveStatus, setSaveStatus] = useState(''); // E.g., "Saving..." or "Saved!"
  
  // Variables to show error messages if the user types a number that doesn't make sense (like Age = 500)
  const [ageError, setAgeError] = useState('');
  const [bpError, setBpError] = useState('');
  const [cholError, setCholError] = useState('');
  const [hrError, setHrError] = useState('');
  
  // --------------------------------------------------------------------------
  // 2. CARDIOBOT CHAT STATE (Variables for the pop-up AI assistant)
  // --------------------------------------------------------------------------
  const [chatOpen, setChatOpen] = useState(false); // Is the chat window open or closed?
  const [chatInput, setChatInput] = useState('');  // What is the user currently typing?
  const [chatHistory, setChatHistory] = useState([]); // A list of all past messages in the conversation
  const [chatLoading, setChatLoading] = useState(false); // Is CardioBot thinking?
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const MAX_CHARS = 500;

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (chatOpen && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 120); // Small delay to allow CSS transitions
    }
  }, [chatOpen]);

  // --- UTILITY FUNCTIONS ---

  /**
   * Lightweight markdown to HTML converter.
   * CardioBot returns markdown. This converts bold, italic, and bullet lists
   * into safe HTML elements without requiring a heavy library like `react-markdown`.
   */
  const renderMarkdown = useCallback((text) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Bullet lists (lines starting with - or •)
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    for (const line of lines) {
      const listMatch = line.match(/^[\-•]\s+(.*)/);
      if (listMatch) {
        if (!inList) { result.push('<ul>'); inList = true; }
        result.push(`<li>${listMatch[1]}</li>`);
      } else {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(line ? `<p>${line}</p>` : '');
      }
    }
    if (inList) result.push('</ul>');
    return result.join('');
  }, []);

  /**
   * Formats a standard timestamp (HH:MM AM/PM) for the chat interface.
   */
  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --------------------------------------------------------------------------
  // 3. API FUNCTIONS (Talking to the Python Server)
  // --------------------------------------------------------------------------

  /**
   * Action: "Run AI Analysis" Button Clicked
   * Purpose: Sends all 13 medical inputs to the FastAPI server. The server runs 
   * the Random Forest ML model and sends back the prediction (High or Low Risk).
   */
  const handlePredict = async () => {
    setLoading(true);
    setSaveStatus('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep(3);
        
        // Initialize CardioBot chat history
        setChatHistory([
          {
            role: 'assistant',
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `Hello! I'm **CardioBot**, your AI cardiology assistant. I've reviewed the assessment for **${formData.patient_name || 'your patient'}** — **${data.result} RISK** at **${data.risk_pct}%** probability.\n\nI have access to all clinical parameters from this assessment. Feel free to ask me anything about the results, risk factors, lifestyle recommendations, or heart health!`
          }
        ]);
      } else {
        alert(data.detail || 'Prediction failed.');
      }
    } catch (err) {
      alert('Could not connect to prediction server.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action: "Save Patient Record" Button Clicked
   * Purpose: Takes the patient's data and the AI's prediction, and tells the 
   * backend to save it permanently into the database (MongoDB or JSON).
   */
  const handleSaveRecord = async () => {
    if (!result) return;
    setSaveStatus('Saving...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            name: formData.patient_name || 'Unknown',
            age: formData.age,
            sex: formData.sex,
            result: result.result,
            risk_pct: result.risk_pct,
            date: result.date,
            saved_by: username,
            inputs: {
              cp: formData.cp,
              trestbps: formData.trestbps,
              chol: formData.chol,
              fbs: formData.fbs,
              restecg: formData.restecg,
              thalach: formData.thalach,
              exang: formData.exang,
              oldpeak: 1.0,
              slope: formData.slope,
              ca: formData.ca,
              thal: formData.thal
            }
          }
        })
      });
      if (res.ok) {
        setSaveStatus('Saved successfully!');
      } else {
        setSaveStatus('Failed to save.');
      }
    } catch (err) {
      setSaveStatus('Network error.');
    }
  };

  /**
   * Action: Sending a message to CardioBot
   * Purpose: Sends the user's chat message, the entire chat history, AND the 
   * patient's medical data to the backend. The backend forwards this to Google's 
   * Llama 3 AI so it can answer the question intelligently.
   */
  const handleChatSubmit = async (e, overridePrompt) => {
    if (e) e.preventDefault();
    const userPrompt = (overridePrompt || chatInput).trim();
    if (!userPrompt || chatLoading) return;
    setChatInput('');
    setChatLoading(true);

    const ts = formatTime();
    const updatedHistory = [...chatHistory, { role: 'user', content: userPrompt, ts }];
    setChatHistory(updatedHistory);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: updatedHistory,
          prompt: userPrompt,
          patient_info: {
            age: formData.age,
            sex: formData.sex,
            result: result?.result,
            risk_pct: result?.risk_pct,
            inputs: {
              cp: formData.cp,
              trestbps: formData.trestbps,
              chol: formData.chol,
              fbs: formData.fbs,
              restecg: formData.restecg,
              thalach: formData.thalach,
              exang: formData.exang,
              slope: formData.slope,
              ca: formData.ca,
              thal: formData.thal
            }
          }
        })
      });
      const data = await res.json();
      const replyTs = formatTime();
      if (res.ok) {
        setChatHistory([...updatedHistory, { role: 'assistant', content: data.reply, ts: replyTs }]);
      } else {
        setChatHistory([...updatedHistory, { role: 'assistant', content: '⚠️ Error communicating with CardioBot.', ts: replyTs }]);
      }
    } catch (err) {
      setChatHistory([...updatedHistory, { role: 'assistant', content: '⚠️ Network connection error. Please try again.', ts: formatTime() }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  };

  // ==========================================================================
  // 4. DRAWING THE SCREEN (THE HTML / JSX)
  // ==========================================================================

  /**
   * Helper Function: Draws the progress bar at the top (e.g., Step 1 -> Step 2)
   */
  const renderProgress = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEPS.length * 2 - 1}, 1fr)`, alignItems: 'center', marginBottom: '2rem' }}>
        {STEPS.map((s, i) => {
          const isActive = step === i;
          const isDone = step > i;
          return (
            <React.Fragment key={i}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                color: isDone ? '#10B981' : (isActive ? '#06B6D4' : '#64748B'),
                background: isDone ? 'rgba(16,185,129,0.08)' : (isActive ? 'rgba(6,182,212,0.1)' : 'rgba(15,23,42,0.04)'),
                border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : (isActive ? 'rgba(6,182,212,0.35)' : 'rgba(15,23,42,0.08)')}`,
                justifyContent: 'center',
                boxShadow: isActive ? '0 0 12px rgba(6,182,212,0.15)' : 'none'
              }}>
                <span style={{ fontSize: '1rem' }}>{isDone ? '✓' : (isActive ? '●' : '○')}</span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  height: '1px',
                  background: step > i ? '#06B6D4' : 'rgba(15,23,42,0.08)',
                  transition: 'background 0.3s ease'
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const generateFactors = () => {
    const factors = [];
    if (formData.cp > 0) factors.push(`Presence of clinically significant chest pain (Type ${formData.cp}), which is strongly correlated with ischemic heart disease.`);
    if (formData.trestbps > 130) factors.push(`Elevated resting blood pressure (${formData.trestbps} mmHg), indicating potential systemic hypertension and increased cardiovascular strain.`);
    if (formData.chol > 200) factors.push(`Hypercholesterolemia (${formData.chol} mg/dl), a primary risk factor for atherosclerotic plaque buildup.`);
    if (formData.thalach < 100) factors.push(`Chronotropic incompetence or low maximum heart rate (${formData.thalach} bpm) during exercise, suggesting impaired autonomic response.`);
    if (formData.exang === 1) factors.push('Exercise-induced angina, indicative of reversible myocardial ischemia during physical exertion.');
    if (formData.ca < 3) factors.push('Fluoroscopy abnormalities revealing significant stenosis in one or more major coronary vessels.');
    if (formData.fbs === 1) factors.push('Elevated fasting blood sugar (>120 mg/dl), pointing toward metabolic syndrome or pre-diabetes, escalating vascular risks.');
    if (formData.slope === 2) factors.push('Downsloping ST segment during peak exercise, a highly specific marker for myocardial ischemia.');
    return factors;
  };

  const renderSuggestions = () => {
    const isHigh = result?.result === 'HIGH';
    const suggestions = [];
    
    if (isHigh) {
      suggestions.push({ icon: '🚨', color: '#EF4444', title: 'Immediate Cardiologist Consultation', desc: 'Your comprehensive risk score is critically elevated. Schedule an in-depth cardiac evaluation (e.g., stress echocardiography or angiography) without delay to formulate a preventive treatment protocol.' });
      suggestions.push({ icon: '💊', color: '#DC2626', title: 'Medication Adherence & Review', desc: 'Strict adherence to prescribed cardioprotective medications (statins, beta-blockers, antiplatelets) is vital. Review your current regimen with your primary physician.' });
    } else {
      suggestions.push({ icon: '✅', color: '#10B981', title: 'Maintain Cardiovascular Wellness', desc: 'Your predictive risk profile is currently low. Continue prioritizing routine annual physicals, cardiovascular screenings, and a heart-healthy lifestyle to sustain these baseline metrics.' });
    }
    
    if (formData.trestbps > 130) {
      suggestions.push({ icon: '🩸', color: '#F59E0B', title: 'Intensive Blood Pressure Management', desc: 'Adopt the DASH diet (Dietary Approaches to Stop Hypertension), strictly limit daily sodium intake to <1,500mg, monitor blood pressure dynamically at home, and adhere to any antihypertensive therapies.' });
    }
    if (formData.chol > 200) {
      suggestions.push({ icon: '🥗', color: '#06B6D4', title: 'Aggressive Lipid Lowering Strategy', desc: 'Transition to a Mediterranean-style diet emphasizing soluble fibers, omega-3 fatty acids, and minimal saturated/trans fats. Discuss statin therapy or lipid-lowering alternatives with your doctor.' });
    }
    if (formData.cp > 0) {
      suggestions.push({ icon: '🫀', color: '#F472B6', title: 'Anginal Symptom Monitoring', desc: 'Keep a detailed log of chest pain episodes—noting duration, triggers, and severity. Seek immediate emergency medical care if pain radiates, intensifies, or is accompanied by shortness of breath.' });
    }
    if (formData.fbs === 1 || formData.age > 60) {
      suggestions.push({ icon: '🏃', color: '#8B5CF6', title: 'Structured Aerobic Conditioning', desc: 'Engage in at least 150 minutes of moderate-intensity aerobic exercise weekly. Consider a professionally supervised cardiac rehabilitation program to safely enhance your cardiovascular endurance.' });
    }

    return suggestions;
  };

  const vesselBadge = (caVal) => {
    const maps = {
      0: { cls: 'vessel-0', label: '🟢 0 (Normal)' },
      1: { cls: 'vessel-1', label: '🔵 1 (Mild)' },
      2: { cls: 'vessel-2', label: '🟠 2 (Moderate)' },
      3: { cls: 'vessel-3', label: '🔴 3 (Severe)' }
    };
    const currentVes = maps[3 - caVal] || maps[0];
    return <span className={`vessel-badge ${currentVes.cls}`} style={{ marginTop: '0.4rem' }}>{currentVes.label}</span>;
  };

  // --------------------------------------------------------------------------
  // THE ACTUAL VISUAL OUTPUT
  // --------------------------------------------------------------------------
  return (
    <div className="animate-fade-in-up">
      {/* 
        The "no-print" class means this top part won't show up if the user 
        presses CTRL+P to print the page. 
      */}
      <div className="no-print">
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 className="hero-title">🔮 Risk <span className="accent">Assessment</span></h1>
          <p className="hero-sub">Complete the wizard to generate a comprehensive cardiac risk report</p>
        </div>

        {renderProgress()}

        {/* 
          ========================================
          STEP 0 - Patient Information 
          ========================================
          This is the first screen. We ask for Name, Age, and Sex.
        */}
        {step === 0 && (
          <div className="card animate-fade-in-up">
            <div className="section-title"><span className="dot"></span> Patient Information</div>
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder=""
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <div className="input-wrapper" style={{ background: '#E5E7EB', borderColor: ageError ? '#EF4444' : 'var(--border)' }}>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.age}
                    min={1}
                    max={120}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, age: isNaN(val) ? '' : val });
                      if (!isNaN(val) && (val < 1 || val > 120)) {
                        setAgeError('Age must be between 1 and 120.');
                      } else {
                        setAgeError('');
                      }
                    }}
                    onBlur={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 50;
                      if (val < 1) val = 1;
                      if (val > 120) val = 120;
                      setFormData({ ...formData, age: val });
                      setAgeError('');
                    }}
                  />
                </div>
                {ageError && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>⚠️ {ageError}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Biological Sex</label>
                <select
                  className="select-control"
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button className="btn" style={{ width: 'auto' }} onClick={() => {
                const val = parseInt(formData.age);
                if (isNaN(val) || val < 1 || val > 120) {
                  setAgeError('Age must be between 1 and 120.');
                  return;
                }
                setAgeError('');
                setStep(1);
              }}>
                Continue to Clinical Data →
              </button>
            </div>
          </div>
        )}

        {/* 
          ========================================
          STEP 1 - Clinical Parameters 
          ========================================
          This screen asks for basic medical data like Blood Pressure and Cholesterol.
        */}
        {step === 1 && (
          <div className="card animate-fade-in-up">
            <div className="section-title"><span className="dot"></span> Clinical Parameters</div>
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Chest Pain Type</label>
                <select
                  className="select-control"
                  value={formData.cp}
                  onChange={(e) => setFormData({ ...formData, cp: parseInt(e.target.value) })}
                >
                  <option value={0}>Asymptomatic</option>
                  <option value={1}>Non-Anginal</option>
                  <option value={2}>Atypical Angina</option>
                  <option value={3}>Typical Angina</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Resting BP (mmHg)</label>
                <div className="input-wrapper" style={{ background: '#E5E7EB', borderColor: bpError ? '#EF4444' : 'var(--border)' }}>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.trestbps}
                    min={80}
                    max={200}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, trestbps: isNaN(val) ? '' : val });
                      if (!isNaN(val) && (val < 80 || val > 200)) {
                        setBpError('Resting BP must be between 80 and 200 mmHg.');
                      } else {
                        setBpError('');
                      }
                    }}
                    onBlur={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 120;
                      if (val < 80) val = 80;
                      if (val > 200) val = 200;
                      setFormData({ ...formData, trestbps: val });
                      setBpError('');
                    }}
                  />
                </div>
                {bpError && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>⚠️ {bpError}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Cholesterol (mg/dl)</label>
                <div className="input-wrapper" style={{ background: '#E5E7EB', borderColor: cholError ? '#EF4444' : 'var(--border)' }}>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.chol}
                    min={100}
                    max={600}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, chol: isNaN(val) ? '' : val });
                      if (!isNaN(val) && (val < 100 || val > 600)) {
                        setCholError('Cholesterol must be between 100 and 600 mg/dl.');
                      } else {
                        setCholError('');
                      }
                    }}
                    onBlur={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 240;
                      if (val < 100) val = 100;
                      if (val > 600) val = 600;
                      setFormData({ ...formData, chol: val });
                      setCholError('');
                    }}
                  />
                </div>
                {cholError && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>⚠️ {cholError}</div>}
              </div>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Fasting Blood Sugar &gt; 120</label>
                <select
                  className="select-control"
                  value={formData.fbs}
                  onChange={(e) => setFormData({ ...formData, fbs: parseInt(e.target.value) })}
                >
                  <option value={0}>No (≤120)</option>
                  <option value={1}>Yes (&gt;120)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Resting ECG</label>
                <select
                  className="select-control"
                  value={formData.restecg}
                  onChange={(e) => setFormData({ ...formData, restecg: parseInt(e.target.value) })}
                >
                  <option value={0}>Normal</option>
                  <option value={1}>ST-T Abnormality</option>
                  <option value={2}>LV Hypertrophy</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Heart Rate (bpm)</label>
                <div className="input-wrapper" style={{ background: '#E5E7EB', borderColor: hrError ? '#EF4444' : 'var(--border)' }}>
                  <input
                    type="number"
                    className="input-control"
                    value={formData.thalach}
                    min={60}
                    max={220}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({ ...formData, thalach: isNaN(val) ? '' : val });
                      if (!isNaN(val) && (val < 60 || val > 220)) {
                        setHrError('Max heart rate must be between 60 and 220 bpm.');
                      } else {
                        setHrError('');
                      }
                    }}
                    onBlur={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 150;
                      if (val < 60) val = 60;
                      if (val > 220) val = 220;
                      setFormData({ ...formData, thalach: val });
                      setHrError('');
                    }}
                  />
                </div>
                {hrError && <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 600 }}>⚠️ {hrError}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setStep(0)}>
                ← Back
              </button>
              <button className="btn" style={{ width: 'auto' }} onClick={() => {
                const bp = parseInt(formData.trestbps);
                const chol = parseInt(formData.chol);
                const hr = parseInt(formData.thalach);
                
                let valid = true;
                if (isNaN(bp) || bp < 80 || bp > 200) {
                  setBpError('Resting BP must be between 80 and 200 mmHg.');
                  valid = false;
                }
                if (isNaN(chol) || chol < 100 || chol > 600) {
                  setCholError('Cholesterol must be between 100 and 600 mg/dl.');
                  valid = false;
                }
                if (isNaN(hr) || hr < 60 || hr > 220) {
                  setHrError('Max heart rate must be between 60 and 220 bpm.');
                  valid = false;
                }
                
                if (!valid) return;
                
                setBpError('');
                setCholError('');
                setHrError('');
                setStep(2);
              }}>
                Continue to Advanced →
              </button>
            </div>
          </div>
        )}

        {/* 
          ========================================
          STEP 2 - Advanced Indicators 
          ========================================
          This screen asks for advanced medical data (ECG results, Thalassemia).
        */}
        {step === 2 && (
          <div className="card animate-fade-in-up">
            <div className="section-title"><span className="dot"></span> Advanced Indicators</div>
            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Exercise-Induced Angina</label>
                <select
                  className="select-control"
                  value={formData.exang}
                  onChange={(e) => setFormData({ ...formData, exang: parseInt(e.target.value) })}
                >
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">ST Slope</label>
                <select
                  className="select-control"
                  value={formData.slope}
                  onChange={(e) => setFormData({ ...formData, slope: parseInt(e.target.value) })}
                >
                  <option value={0}>Upsloping (Healthy)</option>
                  <option value={1}>Flat (Moderate)</option>
                  <option value={2}>Downsloping (High Risk)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Major Vessels Colored</label>
                <select
                  className="select-control"
                  value={formData.ca}
                  onChange={(e) => setFormData({ ...formData, ca: parseInt(e.target.value) })}
                >
                  <option value={3}>0 (Normal)</option>
                  <option value={2}>1 (Mild)</option>
                  <option value={1}>2 (Moderate)</option>
                  <option value={0}>3 (Severe)</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Thalassemia</label>
                <select
                  className="select-control"
                  value={formData.thal}
                  onChange={(e) => setFormData({ ...formData, thal: parseInt(e.target.value) })}
                >
                  <option value={1}>Fixed Defect</option>
                  <option value={2}>Reversible Defect</option>
                  <option value={3}>Normal</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="btn" style={{ width: 'auto' }} onClick={handlePredict} disabled={loading}>
                {loading ? 'Analyzing...' : 'Run AI Analysis →'}
              </button>
            </div>
          </div>
        )}

        {/* 
          ========================================
          STEP 3 - AI Analysis Results 
          ========================================
          This is the final screen. We show the big risk gauge, the AI's explanation, 
          and buttons to Save or Print.
        */}
        {step === 3 && result && (
          <div className="animate-fade-in-up">
            <div className="grid-1-2" style={{ marginBottom: '1.5rem' }}>
              {/* Risk Gauge */}
              <div className="card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="section-title"><span className="dot"></span> Predictive Score</div>
                <div style={{ width: '100%', height: '240px', overflow: 'hidden' }}>
                  <Plot
                    data={[{
                      type: "indicator",
                      mode: "gauge+number",
                      value: result.risk_pct,
                      number: { suffix: "%", font: { size: 32, color: result.result === 'HIGH' ? '#EF4444' : '#10B981', family: 'Inter' } },
                      gauge: {
                        axis: { range: [0, 100], tickcolor: "#475569", tickwidth: 1, ticklen: 5, tickfont: { size: 10 } },
                        bar: { color: result.result === 'HIGH' ? '#EF4444' : '#10B981', thickness: 0.25 },
                        bgcolor: "#E5E7EB",
                        borderwidth: 0,
                        steps: [
                          { range: [0, 30], color: "rgba(16,185,129,0.15)" },
                          { range: [30, 70], color: "rgba(245,158,11,0.10)" },
                          { range: [70, 100], color: "rgba(239,68,68,0.15)" }
                        ],
                        threshold: {
                          line: { color: result.result === 'HIGH' ? '#EF4444' : '#10B981', width: 3 },
                          thickness: 0.8,
                          value: result.risk_pct
                        }
                      }
                    }]}
                    layout={{
                      width: undefined,
                      height: 240,
                      margin: { l: 30, r: 30, t: 30, b: 10 },
                      paper_bgcolor: "rgba(0,0,0,0)",
                      plot_bgcolor: "rgba(0,0,0,0)",
                      font: { family: "Inter, sans-serif", color: "#475569" }
                    }}
                    config={{ displayModeBar: false }}
                    style={{ width: '100%' }}
                    useResizeHandler
                  />
                </div>
              </div>

              {/* Results Banner & Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className={result.result === 'HIGH' ? 'risk-high' : 'risk-low'} style={{ margin: 0 }}>
                  {result.result === 'HIGH' ? '⚠️ HIGH CARDIAC RISK' : '✅ LOW CARDIAC RISK'}
                </div>

                <div className="card" style={{ padding: '1.25rem', flex: 1 }}>
                  <div className="section-title" style={{ marginBottom: '0.85rem' }}><span className="dot"></span> Patient Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{formData.patient_name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patient</div>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0891B2' }}>{formData.age} yrs</div>
                      <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Age</div>
                    </div>
                    <div style={{ background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{formData.sex}</div>
                      <div style={{ fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sex</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back to Advanced</button>
              
              <button className="btn" onClick={handleSaveRecord} disabled={!!saveStatus}>
                {saveStatus || '💾 Save Patient Record'}
              </button>
              
              <button className="btn" style={{ background: '#06B6D4', color: '#0F172A' }} onClick={() => window.print()}>
                🖨️ Print as PDF
              </button>
              
              <button className="btn btn-secondary" onClick={() => { setStep(0); setResult(null); setFormData({ ...formData, patient_name: '' }); }}>
                🔄 New Assessment
              </button>
            </div>

            {/* Explanation and Recommendations */}
            <div className="grid-2" style={{ alignItems: 'start' }}>
              {/* AI Explanation */}
              <div className="card" style={{ height: '100%' }}>
                <div className="section-title"><span className="dot"></span> AI Diagnostic Explanation</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.65,
                  background: result.result === 'HIGH' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  borderLeft: `3px solid ${result.result === 'HIGH' ? '#EF4444' : '#10B981'}`,
                  borderRadius: '0 8px 8px 0',
                  padding: '1.25rem'
                }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    Based on an advanced ensemble machine learning assessment of clinical and biometric parameters, the patient profile maps to a <b>{result.result} RISK</b> classification with a computed confidence probability of <b>{result.risk_pct}%</b>.
                  </div>
                  {generateFactors().length > 0 ? (
                    <div>
                      <div style={{ fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.4rem', color: result.result === 'HIGH' ? '#B91C1C' : '#047857' }}>
                        Primary Pathophysiological Contributors:
                      </div>
                      <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                        {generateFactors().map((factor, i) => (
                          <li key={i} style={{ marginBottom: '0.4rem' }}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                     <div style={{ marginTop: '0.75rem' }}>All monitored clinical parameters currently reside within nominal physiological thresholds. No immediate pathophysiological anomalies detected.</div>
                  )}
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: `1px solid ${result.result === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, fontWeight: 600 }}>
                    {result.result === 'HIGH' ? 'Prognosis: Elevated vulnerability to adverse cardiovascular events. Immediate clinical intervention and diagnostic corroboration is strongly advised.' : 'Prognosis: Favorable. Continue longitudinal monitoring and preventative care to maintain optimal cardiovascular health.'}
                  </div>
                </div>
              </div>

              {/* Health Recommendations */}
              <div className="card" style={{ height: '100%' }}>
                <div className="section-title"><span className="dot"></span> Health Recommendations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {renderSuggestions().map((s, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '0.75rem',
                      padding: '0.65rem',
                      background: '#FFFFFF',
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${s.color}`
                    }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>{s.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px', lineHeight: 1.5 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Creator Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '3rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(15,23,42,0.06)',
              fontSize: '0.85rem',
              color: '#64748B',
            }}>
              Created by Umang Pandey | <a href="https://umangpandey.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#0891B2', textDecoration: 'none', fontWeight: 600 }}>🌐 Portfolio</a>
            </div>
          </div>
        )}


        {/* 
          ========================================
          CARDIOBOT AI ASSISTANT (Chat Sidebar)
          ========================================
          This draws the floating robot button in the bottom right.
          When clicked, it opens a side panel where you can chat with the AI.
          We use "createPortal" so the chat slides in above everything else on the screen.
        */}
        {result && ReactDOM.createPortal(
          <>
            {/* FAB button */}
            {!chatOpen && (
              <button
                id="cardiobot-fab"
                className="fab-pulse no-print"
                onClick={() => setChatOpen(true)}
                style={{
                  position: 'fixed',
                  bottom: '28px',
                  right: '28px',
                  zIndex: 99999,
                  borderRadius: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0 1.4rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  letterSpacing: '0.01em',
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '1rem' }}>🤖</span>
                CardioBot
                <span style={{
                  background: 'rgba(255,255,255,0.22)',
                  borderRadius: '8px',
                  padding: '0.1rem 0.4rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>AI</span>
              </button>
            )}

            {/* Chat side panel */}
            {chatOpen && (
              <>
                {/* Backdrop (subtle, doesn't block page) */}
                <div
                  className="no-print"
                  onClick={() => setChatOpen(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99998,
                    background: 'rgba(15,23,42,0.04)',
                  }}
                />

                {/* Panel */}
                <div
                  id="cardiobot-panel"
                  className="no-print"
                  style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '400px',
                    height: '100dvh',
                    zIndex: 99999,
                    background: '#FFFFFF',
                    borderLeft: '1px solid rgba(15,23,42,0.1)',
                    boxShadow: '-8px 0 40px rgba(15,23,42,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Inter, sans-serif',
                    animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
                    overflow: 'hidden',
                  }}
                >
                  {/* ── Header ── */}
                  <div style={{
                    padding: '1rem 1.25rem 0.85rem',
                    borderBottom: '1px solid rgba(15,23,42,0.08)',
                    background: '#FAFAFA',
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#06B6D4,#0891B2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.05rem',
                          boxShadow: '0 2px 10px rgba(6,182,212,0.35)',
                          flexShrink: 0,
                        }}>🤖</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', lineHeight: 1.15 }}>CardioBot</div>
                          <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '1px' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                            Powered by Groq · Llama 3.3 70B
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          title="Clear chat"
                          onClick={() => {
                            const ts = formatTime();
                            setChatHistory([{ role: 'assistant', ts, content: `Hello! I'm **CardioBot**. I've reviewed the assessment for **${formData.patient_name || 'your patient'}** — **${result.result} RISK** at **${result.risk_pct}%**. What would you like to know?` }]);
                          }}
                          style={{ background: 'none', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '7px', padding: '0.28rem 0.55rem', cursor: 'pointer', fontSize: '0.72rem', color: '#64748B', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          🗑 Clear
                        </button>
                        <button
                          onClick={() => setChatOpen(false)}
                          style={{ background: 'none', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '7px', padding: '0.28rem 0.6rem', cursor: 'pointer', fontSize: '0.95rem', color: '#64748B', lineHeight: 1, fontFamily: 'inherit' }}
                        >✕</button>
                      </div>
                    </div>

                    {/* Patient context pill */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      background: result.result === 'HIGH' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                      border: `1px solid ${result.result === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                      color: result.result === 'HIGH' ? '#DC2626' : '#059669',
                    }}>
                      {result.result === 'HIGH' ? '⚠️' : '✅'}
                      {formData.patient_name || 'Patient'} · {result.result} RISK · {result.risk_pct}%
                    </div>
                  </div>

                  {/* ── Messages ── */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.7rem',
                    padding: '1rem 1.25rem',
                  }}>
                    {chatHistory.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.18rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.45rem', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                          {/* Avatar */}
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: m.role === 'user' ? '0.72rem' : '0.85rem', fontWeight: 700,
                            background: m.role === 'user' ? 'rgba(15,23,42,0.07)' : 'linear-gradient(135deg,#06B6D4,#0891B2)',
                            color: m.role === 'user' ? '#475569' : '#fff',
                            border: m.role === 'user' ? '1px solid rgba(15,23,42,0.1)' : 'none',
                            boxShadow: m.role === 'user' ? 'none' : '0 1px 6px rgba(6,182,212,0.3)',
                          }}>
                            {m.role === 'user' ? (username?.[0]?.toUpperCase() || 'U') : '🤖'}
                          </div>
                          {/* Bubble */}
                          {m.role === 'assistant' ? (
                            <div
                              className="chat-bubble-bot"
                              style={{ maxWidth: '82%' }}
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                            />
                          ) : (
                            <div className="chat-bubble-user" style={{ maxWidth: '82%' }}>{m.content}</div>
                          )}
                        </div>
                        {m.ts && (
                          <div style={{
                            fontSize: '0.65rem', color: '#94A3B8', marginTop: '1px',
                            marginLeft: m.role === 'assistant' ? '2.1rem' : 0,
                            marginRight: m.role === 'user' ? '2.1rem' : 0,
                            textAlign: m.role === 'user' ? 'right' : 'left',
                          }}>{m.ts}</div>
                        )}
                        {/* Quick chips after first bot message */}
                        {idx === 0 && m.role === 'assistant' && chatHistory.length <= 2 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem', marginLeft: '2.1rem', maxWidth: '88%' }}>
                            {[
                              { icon: '📊', text: 'What does my risk score mean?' },
                              { icon: '🥗', text: 'How can I lower my cholesterol?' },
                              { icon: '🏃', text: 'What exercise is safe for me?' },
                              { icon: '🩺', text: 'Should I see a cardiologist?' },
                            ].map((chip, ci) => (
                              <button key={ci} className="quick-chip" onClick={() => handleChatSubmit(null, chip.text)}>
                                {chip.icon} {chip.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {chatLoading && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.45rem' }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#06B6D4,#0891B2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', flexShrink: 0,
                          boxShadow: '0 1px 6px rgba(6,182,212,0.3)',
                        }}>🤖</div>
                        <div className="cardiobot-typing">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* ── Input Area ── */}
                  <div style={{
                    padding: '0.85rem 1.25rem 1rem',
                    borderTop: '1px solid rgba(15,23,42,0.08)',
                    background: '#FAFAFA',
                    flexShrink: 0,
                  }}>
                    <form onSubmit={handleChatSubmit}>
                      <div style={{
                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                        background: '#F1F5F9',
                        border: '1px solid rgba(15,23,42,0.12)',
                        borderRadius: '10px',
                        padding: '0.3rem 0.3rem 0.3rem 0.8rem',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}>
                        <input
                          id="cardiobot-input"
                          ref={chatInputRef}
                          type="text"
                          placeholder="Ask CardioBot anything..."
                          value={chatInput}
                          maxLength={MAX_CHARS}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleChatSubmit(e);
                            }
                          }}
                          disabled={chatLoading}
                          style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: '0.875rem', color: '#0F172A', fontFamily: 'inherit',
                            padding: '0.35rem 0',
                          }}
                        />
                        <button
                          type="submit"
                          disabled={chatLoading || !chatInput.trim()}
                          style={{
                            background: chatInput.trim() ? 'linear-gradient(135deg,#06B6D4,#0891B2)' : 'rgba(15,23,42,0.06)',
                            color: chatInput.trim() ? '#fff' : '#94A3B8',
                            border: 'none', borderRadius: '8px',
                            width: 36, height: 36, flexShrink: 0,
                            cursor: chatInput.trim() ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1rem', transition: 'all 0.2s ease',
                            fontFamily: 'inherit',
                          }}
                        >↑</button>
                      </div>
                      <div style={{
                        fontSize: '0.67rem', color: '#B0BAC8', textAlign: 'right', marginTop: '0.3rem',
                        ...(chatInput.length > MAX_CHARS * 0.9 ? { color: chatInput.length >= MAX_CHARS ? '#EF4444' : '#F59E0B', fontWeight: 600 } : {}),
                      }}>
                        {chatInput.length}/{MAX_CHARS} · Enter to send
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}
          </>,
          document.body
        )}
      </div>

      {/* PRINT-ONLY DIAGNOSTIC REPORT SECTION */}
      {result && (
        <div className="print-report-container">
          <div className="print-header">
            <h2>HEART-IQ CARDIAC RISK ASSESSMENT REPORT</h2>
            <div className="print-date">Date of Assessment: {result.date}</div>
          </div>

          
          <div className="print-section">
            <h3>1. Patient Information</h3>
            <table className="print-table">
              <tbody>
                <tr>
                  <td><strong>Patient Name:</strong></td>
                  <td>{formData.patient_name || 'Unknown'}</td>
                  <td><strong>Biological Sex:</strong></td>
                  <td>{formData.sex}</td>
                </tr>
                <tr>
                  <td><strong>Age:</strong></td>
                  <td>{formData.age} years</td>
                  <td><strong>Evaluated By:</strong></td>
                  <td>{username || 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>2. Clinical Data</h3>
            <table className="print-table">
              <tbody>
                <tr>
                  <td><strong>Chest Pain Type:</strong></td>
                  <td>
                    {formData.cp === 0 && "Asymptomatic"}
                    {formData.cp === 1 && "Non-Anginal"}
                    {formData.cp === 2 && "Atypical Angina"}
                    {formData.cp === 3 && "Typical Angina"}
                  </td>
                  <td><strong>Resting Blood Pressure:</strong></td>
                  <td>{formData.trestbps} mmHg</td>
                </tr>
                <tr>
                  <td><strong>Serum Cholesterol:</strong></td>
                  <td>{formData.chol} mg/dl</td>
                  <td><strong>Fasting Blood Sugar:</strong></td>
                  <td>{formData.fbs === 1 ? "Elevated (>120 mg/dl)" : "Normal (≤120 mg/dl)"}</td>
                </tr>
                <tr>
                  <td><strong>Resting ECG Results:</strong></td>
                  <td>
                    {formData.restecg === 0 && "Normal"}
                    {formData.restecg === 1 && "ST-T Wave Abnormality"}
                    {formData.restecg === 2 && "Left Ventricular Hypertrophy"}
                  </td>
                  <td><strong>Maximum Heart Rate:</strong></td>
                  <td>{formData.thalach} bpm</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>3. Advanced Parameters</h3>
            <table className="print-table">
              <tbody>
                <tr>
                  <td><strong>Exercise-Induced Angina:</strong></td>
                  <td>{formData.exang === 1 ? "Yes" : "No"}</td>
                  <td><strong>ST Slope:</strong></td>
                  <td>
                    {formData.slope === 0 && "Upsloping (Healthy)"}
                    {formData.slope === 1 && "Flat (Moderate)"}
                    {formData.slope === 2 && "Downsloping (High Risk)"}
                  </td>
                </tr>
                <tr>
                  <td><strong>Major Vessels Colored:</strong></td>
                  <td>
                    {formData.ca === 3 && "🟢 0 (Normal)"}
                    {formData.ca === 2 && "🔵 1 (Mild)"}
                    {formData.ca === 1 && "🟠 2 (Moderate)"}
                    {formData.ca === 0 && "🔴 3 (Severe)"}
                  </td>
                  <td><strong>Thalassemia:</strong></td>
                  <td>
                    {formData.thal === 1 && "Fixed Defect"}
                    {formData.thal === 2 && "Reversible Defect"}
                    {formData.thal === 3 && "Normal"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>4. AI Diagnostic Analysis</h3>
            <div className={`print-risk-banner ${result.result === 'HIGH' ? 'risk-high-text' : 'risk-low-text'}`}>
              PREDICTED RISK CATEGORY: {result.result} ({result.risk_pct}% Probability)
            </div>
            
            <div className="print-explanation-block">
              <strong>Advanced ML Diagnostic Evaluation:</strong>
              <div style={{ marginTop: '0.5rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
                <p>Based on an advanced ensemble machine learning assessment of clinical and biometric parameters, the patient profile maps to a <strong>{result.result} RISK</strong> classification with a computed confidence probability of <strong>{result.risk_pct}%</strong>.</p>
                {generateFactors().length > 0 ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <strong>Primary Pathophysiological Contributors:</strong>
                    <ul style={{ paddingLeft: '20px', marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                      {generateFactors().map((factor, i) => (
                        <li key={i} style={{ marginBottom: '0.2rem' }}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p style={{ marginTop: '0.75rem' }}>All monitored clinical parameters currently reside within nominal physiological thresholds. No immediate pathophysiological anomalies detected.</p>
                )}
                <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>
                  {result.result === 'HIGH' ? 'Prognosis: Elevated vulnerability to adverse cardiovascular events. Immediate clinical intervention and diagnostic corroboration is strongly advised.' : 'Prognosis: Favorable. Continue longitudinal monitoring and preventative care to maintain optimal cardiovascular health.'}
                </p>
              </div>
            </div>
            
            <div className="print-recommendations-block" style={{ marginTop: '1rem' }}>
              <strong>Clinical and Lifestyle Recommendations:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '20px' }}>
                {renderSuggestions().map((s, idx) => (
                  <li key={idx} style={{ marginBottom: '0.4rem' }}>
                    <strong>{s.title}:</strong> {s.desc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="print-footer">
            <p>This is a computer-generated medical analytics report from HEART-IQ AI model.</p>
            <p>Disclaimer: This prediction tool is for educational/analytical purposes only. Always consult a medical professional for clinical decisions.</p>
          </div>
        </div>
      )}
    </div>
  );
}
