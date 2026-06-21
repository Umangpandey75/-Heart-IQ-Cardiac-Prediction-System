import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

/**
 * ============================================================================
 * PATIENTS PAGE (Patients.jsx)
 * ============================================================================
 * Purpose:
 * This page acts as a digital filing cabinet. It shows a list of all patients
 * that have been saved. 
 * 
 * If you click "View" on a patient, it opens a detailed "Patient File" showing 
 * line charts of how their risk, cholesterol, and blood pressure have changed 
 * over time (across multiple visits).
 * ============================================================================
 */
export default function Patients({ username, role }) {
  // --------------------------------------------------------------------------
  // 1. PAGE STATE (Memory)
  // --------------------------------------------------------------------------
  const [patients, setPatients] = useState([]); // List of all patients downloaded from the database
  const [loading, setLoading] = useState(true); // Is the page currently downloading?
  const [searchQuery, setSearchQuery] = useState(''); // What did the user type in the Search Box?
  
  // If this is NULL, we show the list. If this has a name (like "John Doe"), we show John's detailed chart view.
  const [selectedPatient, setSelectedPatient] = useState(null); 
  
  // Which patient are we about to delete? (Used to show the "Are you sure?" warning box)
  const [confirmDelete, setConfirmDelete] = useState(null);

  /**
   * --------------------------------------------------------------------------
   * 2. AUTOMATIC DATA FETCHING
   * --------------------------------------------------------------------------
   * Runs exactly once when the page loads. Tells the app to download the patients.
   */
  useEffect(() => {
    fetchPatients();
  }, [username, role]);

  // ==========================================================================
  // 3. API FUNCTIONS (Talking to the Python Server)
  // ==========================================================================

  /**
   * Action: Download patients from the database
   */
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/patients?username=${username}&role=${role}`);
      const data = await res.json();
      if (res.ok) {
        setPatients(data);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action: Delete a single patient
   * Purpose: Tells the backend to erase all records for a specific person.
   */
  const handleDeletePatient = async (name) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/patients?name=${name}&username=${username}&role=${role}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setConfirmDelete(null); // Hide the warning box
        
        // If we were looking at the person we just deleted, go back to the main list
        if (selectedPatient === name) {
          setSelectedPatient(null);
        }
        
        fetchPatients(); // Re-download the list so the deleted person disappears from the screen
      }
    } catch (err) {
      alert('Error deleting records.');
    }
  };

  /**
   * Action: Delete ALL patients (Admin Only)
   * Purpose: Acts as a factory reset. Erases the entire JSON database.
   */
  const handleClearAll = async () => {
    // Show a browser pop-up to double check
    if (!window.confirm('Are you sure you want to clear ALL patient records? This cannot be undone.')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/patients/clear?role=${role}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedPatient(null);
        fetchPatients();
      }
    } catch (err) {
      alert('Error clearing records.');
    }
  };

  // ==========================================================================
  // 4. DATA PROCESSING (Grouping by Name)
  // ==========================================================================

  /**
   * Function: getGroupedPatients
   * Purpose: A single patient might have visited the clinic 3 times. We don't 
   * want them to show up as 3 different people in the list. This function clumps 
   * all their visits together into one "folder" under their name.
   */
  const getGroupedPatients = () => {
    const grouped = {};
    patients.forEach(p => {
      const name = p.name || 'Unknown';
      if (!grouped[name]) grouped[name] = []; // Create a new folder if it doesn't exist
      grouped[name].push(p); // Put the visit record into their folder
    });
    return grouped;
  };

  // ==========================================================================
  // 5. DRAWING THE DETAILED VIEW (The Line Charts)
  // ==========================================================================

  /**
   * Function: renderDetailView
   * Purpose: This creates the screen you see when you click "View" on a patient.
   * It draws line charts tracking how their health changed over multiple visits.
   */
  const renderDetailView = (pname) => {
    const records = getGroupedPatients()[pname] || []; // Get all visits for this person
    if (!records.length) return null;

    const latest = records[records.length - 1]; // The most recent visit is the last one in the list
    const totalVisits = records.length;
    const highRiskVisits = records.filter(r => r.result === 'HIGH').length;
    const avgRisk = roundVal(records.reduce((acc, r) => acc + r.risk_pct, 0) / totalVisits, 1);

    // Extract lists of data so we can give them to the Line Charts
    const dates = records.map(r => r.date); // X-Axis (Time)
    const risks = records.map(r => r.risk_pct); // Y-Axis (Risk Percentage)
    const chols = records.map(r => r.inputs?.chol || 0); // Y-Axis (Cholesterol)
    const bps = records.map(r => r.inputs?.trestbps || 0); // Y-Axis (Blood Pressure)
    const hrs = records.map(r => r.inputs?.thalach || 0); // Y-Axis (Heart Rate)
    const oldpeaks = records.map(r => r.inputs?.oldpeak || 1.0); // Y-Axis (ST Depression)
    const results = records.map(r => r.result);

    // Standard styling for the charts
    const chartStyle = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(15,23,42,0.02)",
      font: { family: "Inter, sans-serif", color: "#475569" },
      xaxis: { gridcolor: "rgba(15,23,42,0.06)", showgrid: true, tickfont: { size: 10 } },
      yaxis: { gridcolor: "rgba(15,23,42,0.06)", showgrid: true, tickfont: { size: 10 } },
      margin: { l: 40, r: 10, t: 40, b: 30 }
    };

    return (
      <div className="animate-fade-in-up">
        {/* TOP ROW: Back button and Delete button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setSelectedPatient(null)}>
            ← Back to Patients
          </button>
          <button className="btn btn-danger" style={{ width: 'auto' }} onClick={() => setConfirmDelete(pname)}>
            🗑️ Delete Patient
          </button>
        </div>

        {/* The Red Warning Box (Only shows if they clicked Delete) */}
        {confirmDelete === pname && (
          <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', marginBottom: '1.5rem' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '0.75rem' }}>
              ⚠️ Delete all records for <b>{pname}</b>? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-danger" style={{ width: 'auto' }} onClick={() => handleDeletePatient(pname)}>
                Yes, Delete
              </button>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Patient Name and Info Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 className="hero-title">👤 {pname}</h1>
          <p className="hero-sub">{totalVisits} visit(s) · Age {latest.age} · {latest.sex}</p>
        </div>

        {/* QUICK STATS BOXES (Visits, Age, Average Risk) */}
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="metric-card" style={{ '--accent-color': '#06B6D4' }}>
            <span className="metric-icon">📅</span>
            <div className="metric-value">{totalVisits}</div>
            <div className="metric-label">Visits</div>
          </div>
          <div className="metric-card" style={{ '--accent-color': '#60A5FA' }}>
            <span className="metric-icon">👤</span>
            <div className="metric-value">{latest.age}</div>
            <div className="metric-label">Current Age</div>
          </div>
          <div className="metric-card" style={{ '--accent-color': '#F472B6' }}>
            <span className="metric-icon">⚕️</span>
            <div className="metric-value" style={{ fontSize: '1.4rem', lineHeight: '2.5rem' }}>{latest.sex}</div>
            <div className="metric-label">Sex</div>
          </div>
          <div className="metric-card" style={{ '--accent-color': '#F59E0B' }}>
            <span className="metric-icon">📊</span>
            <div className="metric-value">{avgRisk}%</div>
            <div className="metric-label">Avg Risk</div>
          </div>
          <div className="metric-card" style={{ '--accent-color': '#EF4444' }}>
            <span className="metric-icon">⚠️</span>
            <div className="metric-value">{highRiskVisits}</div>
            <div className="metric-label">High Risk Visits</div>
          </div>
        </div>

        {/* 
          ----------------------------------------------------
          CHART 1: Risk Over Time (Line Chart) 
          ----------------------------------------------------
        */}
        <div className="card">
          <div className="section-title"><span className="dot"></span> Cardiac Risk Over Time</div>
          <div style={{ width: '100%', height: '240px' }}>
            <Plot
              data={[{
                x: dates, // The dates of their visits
                y: risks, // The risk percentage at each visit
                mode: 'lines+markers',
                line: { color: '#06B6D4', width: 2.5 },
                marker: {
                  size: 9,
                  color: results.map(r => r === 'HIGH' ? '#EF4444' : '#10B981'), // Dots are red if high risk, green if low
                  line: { color: '#0F172A', width: 2 }
                },
                fill: 'tozeroy', // Colors the area under the line
                fillcolor: 'rgba(6,182,212,0.06)',
                name: 'Risk %',
                hovertemplate: '<b>%{x}</b><br>Risk: %{y}%<extra></extra>'
              }]}
              layout={{
                ...chartStyle,
                height: 240,
                shapes: [{
                  type: 'line',
                  xref: 'paper',
                  x0: 0,
                  x1: 1,
                  yref: 'y',
                  y0: 50, // Draws a dotted yellow line at the 50% mark
                  y1: 50,
                  line: { color: 'rgba(245,158,11,0.4)', width: 1.5, dash: 'dot' }
                }]
              }}
              config={{ displayModeBar: false }}
              style={{ width: '100%' }}
              useResizeHandler
            />
          </div>
        </div>

        {/* 
          ----------------------------------------------------
          CHART 2 & 3: Clinical Metrics over time (Cholesterol, BP, HR) 
          ----------------------------------------------------
        */}
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="section-title"><span className="dot"></span> Cholesterol & Blood Pressure</div>
            <div style={{ width: '100%', height: '220px' }}>
              <Plot
                data={[
                  { x: dates, y: chols, mode: 'lines+markers', line: { color: '#F59E0B', width: 2 }, name: 'Cholesterol' },
                  { x: dates, y: bps, mode: 'lines+markers', line: { color: '#60A5FA', width: 2 }, name: 'Resting BP' }
                ]}
                layout={{ ...chartStyle, height: 220, showlegend: true, legend: { orientation: 'h', y: 1.15 } }}
                config={{ displayModeBar: false }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>
          </div>
          <div className="card">
            <div className="section-title"><span className="dot"></span> Heart Rate & ST Depression</div>
            <div style={{ width: '100%', height: '220px' }}>
              <Plot
                data={[
                  { x: dates, y: hrs, mode: 'lines+markers', line: { color: '#10B981', width: 2 }, name: 'Max HR' },
                  { x: dates, y: oldpeaks, mode: 'lines+markers', line: { color: '#F472B6', width: 2 }, name: 'ST Depr.' }
                ]}
                layout={{ ...chartStyle, height: 220, showlegend: true, legend: { orientation: 'h', y: 1.15 } }}
                config={{ displayModeBar: false }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </div>
          </div>
        </div>

        {/* 
          ----------------------------------------------------
          THE LOG: A text list of every single visit
          ----------------------------------------------------
        */}
        <div className="card">
          <div className="section-title"><span className="dot"></span> Visit History</div>
          {/* We reverse the list so the newest visits are at the top */}
          {[...records].reverse().map((r, idx) => {
            const isHigh = r.result === 'HIGH';
            const badgeCls = isHigh ? 'badge-danger' : 'badge-success';
            const vesClass = `vessel-${Math.max(0, 3 - parseInt(r.inputs?.ca ?? 3))}`;
            const vesText = { 0: '✓ 0 (Normal)', 1: '🟡 1 (Mild)', 2: '🟠 2 (Moderate)', 3: '🔴 3 (Severe)' }[3 - parseInt(r.inputs?.ca ?? 3)] || '✓ 0 (Normal)';
            return (
              <div key={idx} style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.6rem', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>Visit #{totalVisits - idx}</span>
                  <span className={`badge ${badgeCls}`}>{isHigh ? '⚠️' : '✅'} {r.result} · {r.risk_pct}%</span>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>{r.date}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#475569', background: 'rgba(15,23,42,0.04)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>❤️ BP: {r.inputs?.trestbps} mmHg</span>
                  <span style={{ fontSize: '0.78rem', color: '#475569', background: 'rgba(15,23,42,0.04)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>🧪 Chol: {r.inputs?.chol} mg/dl</span>
                  <span style={{ fontSize: '0.78rem', color: '#475569', background: 'rgba(15,23,42,0.04)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>💓 HR: {r.inputs?.thalach} bpm</span>
                  <span className={`vessel-badge ${vesClass}`}>🫘 Vessels: {vesText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper function to round numbers nicely
  const roundVal = (val, dec) => {
    return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  // ==========================================================================
  // 6. DRAWING THE MAIN SCREEN (The List of Patients)
  // ==========================================================================

  // Show a loading screen while downloading
  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading patient logs...</div>;
  }

  // If a patient is selected, STOP drawing the list, and draw their Detailed View instead
  if (selectedPatient) {
    return renderDetailView(selectedPatient);
  }

  // Calculate totals for the little boxes at the top
  const grouped = getGroupedPatients();
  const totalRecords = patients.length;
  const highRiskCount = patients.filter(p => p.result === 'HIGH').length;
  const lowRiskCount = totalRecords - highRiskCount;

  return (
    <div className="animate-fade-in-up">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="hero-title">Patient <span className="accent">Records</span></h1>
          <p className="hero-sub">Click any patient to view full history, trends, and analytics</p>
        </div>
        {/* If Admin, show a yellow badge. Otherwise show their name in a blue badge. */}
        {role === 'admin' ? (
          <div style={{ background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.15)', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#B45309', fontWeight: 600 }}>
            ⚠️ Admin View
          </div>
        ) : (
          <div style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#0891B2', fontWeight: 600 }}>
            👤 {username}
          </div>
        )}
      </div>

      {/* If there are NO patients in the database yet, show a friendly message. */}
      {!patients.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '1rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.35 }}>📂</div>
          <div style={{ color: '#0F172A', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Patient Records</div>
          <div style={{ color: '#475569', fontSize: '0.88rem' }}>Run a prediction and save a record to see it here.</div>
        </div>
      ) : (
        <>
          {/* 
            ----------------------------------------------------
            SUMMARY BOXES
            ----------------------------------------------------
          */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: '500px' }}>
            <div className="metric-card" style={{ '--accent-color': '#06B6D4', padding: '0.85rem' }}>
              <div className="metric-value" style={{ fontSize: '1.5rem' }}>{totalRecords}</div>
              <div className="metric-label" style={{ fontSize: '0.62rem' }}>Total Records</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#EF4444', padding: '0.85rem' }}>
              <div className="metric-value" style={{ fontSize: '1.5rem', color: '#EF4444' }}>{highRiskCount}</div>
              <div className="metric-label" style={{ fontSize: '0.62rem' }}>High Risk</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#10B981', padding: '0.85rem' }}>
              <div className="metric-value" style={{ fontSize: '1.5rem', color: '#10B981' }}>{lowRiskCount}</div>
              <div className="metric-label" style={{ fontSize: '0.62rem' }}>Low Risk</div>
            </div>
          </div>

          {/* 
            ----------------------------------------------------
            SEARCH BAR
            ----------------------------------------------------
          */}
          <div className="form-group" style={{ margin: '1rem 0' }}>
            <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
              <input
                type="text"
                className="input-control"
                placeholder="🔍  Search patients by name..."
                value={searchQuery}
                // When they type, update the 'searchQuery' memory box
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>

          {/* 
            ----------------------------------------------------
            THE PATIENT LIST
            ----------------------------------------------------
          */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {/* We loop through every "folder" in our grouped list */}
            {Object.keys(grouped).map((name) => {
              
              // If there's something in the search box, and this person's name doesn't match, SKIP them.
              if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
              
              const recs = grouped[name];
              const latest = recs[recs.length - 1]; // Only show the most recent visit's data on the card
              const isHigh = latest.result === 'HIGH';
              const badgeCls = isHigh ? 'badge-danger' : 'badge-success';
              
              return (
                <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
                  {/* The Info Box */}
                  <div className="patient-row" style={{ margin: 0, padding: '0.75rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.97rem', color: '#0F172A' }}>{name}</span>
                        <span style={{ color: '#475569', marginLeft: '0.85rem', fontSize: '0.82rem' }}>
                          Age {latest.age} · {latest.sex} · {recs.length} visit(s)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className={`badge ${badgeCls}`}>{isHigh ? '⚠️' : '✅'} {latest.result} · {latest.risk_pct}%</span>
                        <span style={{ color: '#475569', fontSize: '0.78rem' }}>{latest.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* View Button */}
                  <button className="btn" style={{ width: '80px', height: '40px', padding: 0 }} onClick={() => setSelectedPatient(name)}>
                    👁️ View
                  </button>

                  {/* Delete Button */}
                  <button className="btn btn-danger" style={{ width: '40px', height: '40px', padding: 0 }} onClick={() => handleDeletePatient(name)}>
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>

          {/* 
            ----------------------------------------------------
            CLEAR ALL BUTTON (Admin Only)
            ----------------------------------------------------
          */}
          {role === 'admin' && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
              <button className="btn btn-danger" style={{ width: 'auto' }} onClick={handleClearAll}>
                🗑️ Clear All Records
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
