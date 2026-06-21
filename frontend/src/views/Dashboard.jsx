import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

/**
 * ============================================================================
 * DASHBOARD PAGE (Dashboard.jsx)
 * ============================================================================
 * Purpose:
 * This page shows a beautiful bird's-eye view of all the patients using charts.
 * It calculates statistics (like average age, percentage of high-risk patients)
 * and draws Pie Charts and Bar Charts using a library called 'plotly'.
 * 
 * Note: If you are an 'admin', you see EVERYONE. If you are a normal user, 
 * you only see your own patients.
 * ============================================================================
 */
export default function Dashboard({ username, role }) {
  // --------------------------------------------------------------------------
  // 1. PAGE STATE (Memory)
  // --------------------------------------------------------------------------
  const [patients, setPatients] = useState([]); // A list of all patient records fetched from the database
  const [loading, setLoading] = useState(true); // Is the page still downloading data?

  /**
   * --------------------------------------------------------------------------
   * 2. AUTOMATIC DATA FETCHING
   * --------------------------------------------------------------------------
   * This 'useEffect' is like an alarm clock that goes off as soon as the page opens.
   * It tells the app: "Go download the patient data right now!"
   */
  useEffect(() => {
    fetchPatients();
  }, [username, role]);

  /**
   * Action: Download patient data from the Python Backend
   * Purpose: We ask the backend for the patient list. We tell it our username 
   * and role so it knows whether to give us all patients or just our own.
   */
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/patients?username=${username}&role=${role}`);
      const data = await res.json();
      if (res.ok) {
        setPatients(data); // Save the downloaded list into our 'patients' memory
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false); // Turn off the loading spinner
    }
  };

  // ==========================================================================
  // 3. MATH & DATA PROCESSING (Crunching the numbers for the charts)
  // ==========================================================================

  /**
   * Function: getKPIs (Key Performance Indicators)
   * Purpose: Counts how many total patients we have, how many are male/female, 
   * and how many are High vs Low risk.
   */
  const getKPIs = () => {
    const total = patients.length;
    const high = patients.filter(p => p.result === 'HIGH').length; // Count High Risk
    const low = total - high; // The rest are Low Risk
    const male = patients.filter(p => p.sex === 'Male').length;
    const female = total - male;
    
    // Add up all their ages and divide by the total number of patients to get the Average
    const avgAge = total ? roundVal(patients.reduce((acc, p) => acc + p.age, 0) / total, 1) : 0;
    
    // What percentage are High Risk?
    const highRiskPct = total ? Math.round((high / total) * 100) : 0;
    
    return { total, high, low, male, female, avgAge, highRiskPct };
  };

  /**
   * Function: getAgeDistributionData
   * Purpose: Sorts patients into age buckets (like "Under 40", "40 to 49", etc.)
   * This is used to draw the Bar Chart.
   */
  const getAgeDistributionData = () => {
    const buckets = { '<40': [0, 0], '40-49': [0, 0], '50-59': [0, 0], '60-69': [0, 0], '70+': [0, 0] };
    
    const getBucket = (age) => {
      if (age < 40) return '<40';
      if (age < 50) return '40-49';
      if (age < 60) return '50-59';
      if (age < 70) return '60-69';
      return '70+';
    };

    patients.forEach(p => {
      const b = getBucket(p.age);
      if (p.result === 'HIGH') buckets[b][0]++; // Count High Risk in this age group
      else buckets[b][1]++; // Count Low Risk in this age group
    });

    const labels = Object.keys(buckets);
    const highData = labels.map(l => buckets[l][0]);
    const lowData = labels.map(l => buckets[l][1]);

    return { labels, highData, lowData };
  };

  /**
   * Function: getClinicalAverages
   * Purpose: Calculates the average Blood Pressure and Cholesterol for High Risk 
   * patients vs Low Risk patients.
   */
  const getClinicalAverages = () => {
    const highPatients = patients.filter(p => p.result === 'HIGH');
    const lowPatients = patients.filter(p => p.result === 'LOW');

    const getAvg = (list, key, subkey = null) => {
      if (!list.length) return 0;
      const sum = list.reduce((acc, p) => {
        const val = subkey ? p.inputs?.[subkey] : p[key];
        return acc + (parseFloat(val) || 0);
      }, 0);
      return roundVal(sum / list.length, 1);
    };

    return {
      cholHigh: getAvg(highPatients, 'inputs', 'chol'),
      cholLow: getAvg(lowPatients, 'inputs', 'chol'),
      bpHigh: getAvg(highPatients, 'inputs', 'trestbps'),
      bpLow: getAvg(lowPatients, 'inputs', 'trestbps')
    };
  };

  // Helper function to round numbers nicely
  const roundVal = (val, dec) => {
    return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  // ==========================================================================
  // 4. DRAWING THE SCREEN (THE HTML / JSX)
  // ==========================================================================

  // If the page is still downloading data, just show a loading message
  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading dashboard analytics...</div>;
  }

  // Run the math functions from above right before we draw the screen
  const kpi = getKPIs();
  const ageDist = getAgeDistributionData();
  const clinAvg = getClinicalAverages();
  
  // Get the 8 most recently added patients to show at the bottom
  const recent = [...patients].reverse().slice(0, 8);

  const scopeLabel = role === 'admin' ? 'All patients · Global view' : `Dr. ${username}'s patients`;

  // Standard styling for all our charts so they look consistent
  const commonLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif", color: "#475569" },
    margin: { l: 30, r: 10, t: 40, b: 30 }
  };

  return (
    <div className="animate-fade-in-up">
      {/* 
        ----------------------------------------------------
        HEADER SECTION
        ----------------------------------------------------
      */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="hero-title">Analytics <span className="accent">Dashboard</span></h1>
          <p className="hero-sub">{scopeLabel}</p>
        </div>
        <div style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.2)', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.82rem', color: '#0891B2', fontWeight: 600 }}>
          🟢 Live Data
        </div>
      </div>

      {/* 
        If there are NO patients in the database yet, show a friendly message.
        Otherwise, show the charts. 
      */}
      {!patients.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.4 }}>📂</div>
          <div style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Records Yet</div>
          <div style={{ color: '#475569', fontSize: '0.9rem' }}>Run a prediction and save a patient record to see analytics here.</div>
        </div>
      ) : (
        <>
          {/* 
            ----------------------------------------------------
            THE TOP METRICS STRIP (Total, High Risk, Low Risk, etc.)
            ----------------------------------------------------
          */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            <div className="metric-card" style={{ '--accent-color': '#06B6D4' }}>
              <span className="metric-icon">👥</span>
              <div className="metric-value" style={{ color: '#06B6D4' }}>{kpi.total}</div>
              <div className="metric-label">Total Patients</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#EF4444' }}>
              <span className="metric-icon">⚠️</span>
              <div className="metric-value" style={{ color: '#EF4444' }}>{kpi.high}</div>
              <div className="metric-label">High Risk</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#10B981' }}>
              <span className="metric-icon">✅</span>
              <div className="metric-value" style={{ color: '#10B981' }}>{kpi.low}</div>
              <div className="metric-label">Low Risk</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#60A5FA' }}>
              <span className="metric-icon">👨</span>
              <div className="metric-value" style={{ color: '#60A5FA' }}>{kpi.male}</div>
              <div className="metric-label">Male</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#F472B6' }}>
              <span className="metric-icon">👩</span>
              <div className="metric-value" style={{ color: '#F472B6' }}>{kpi.female}</div>
              <div className="metric-label">Female</div>
            </div>
            <div className="metric-card" style={{ '--accent-color': '#F59E0B' }}>
              <span className="metric-icon">📅</span>
              <div className="metric-value" style={{ color: '#F59E0B' }}>{kpi.avgAge}</div>
              <div className="metric-label">Avg Age (yrs)</div>
            </div>
          </div>

          {/* 
            ----------------------------------------------------
            FIRST ROW OF CHARTS: Risk Donut & Age Bar Chart
            ----------------------------------------------------
          */}
          <div className="grid-2" style={{ gridTemplateColumns: '1.1fr 1.9fr', marginBottom: '1.25rem' }}>
            {/* Risk Distribution Donut Chart */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              <div className="section-title"><span className="dot"></span> Risk Distribution</div>
              <div style={{ width: '100%', height: '240px' }}>
                <Plot
                  data={[{
                    values: [kpi.high, kpi.low],
                    labels: ['High Risk', 'Low Risk'],
                    hole: 0.65,
                    type: 'pie',
                    marker: { colors: ['#EF4444', '#10B981'] },
                    textinfo: 'none',
                    hovertemplate: '<b>%{label}</b><br>%{value} patients (%{percent})<extra></extra>'
                  }]}
                  layout={{
                    ...commonLayout,
                    height: 240,
                    showlegend: true,
                    legend: { orientation: 'h', y: -0.1, x: 0.5, xanchor: 'center' },
                    annotations: [{
                      text: `<b>${kpi.highRiskPct}%</b><br><span style="font-size:10px;color:#94A3B8;">High Risk</span>`,
                      showarrow: false,
                      font: { size: 18, color: '#EF4444' }
                    }]
                  }}
                  config={{ displayModeBar: false }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            </div>

            {/* Age Distribution Bar Chart */}
            <div className="card">
              <div className="section-title"><span className="dot"></span> Age Distribution by Risk Level</div>
              <div style={{ width: '100%', height: '240px' }}>
                <Plot
                  data={[
                    { x: ageDist.labels, y: ageDist.highData, type: 'bar', name: 'High Risk', marker: { color: '#EF4444' }, opacity: 0.85, hovertemplate: '<b>%{x}</b><br>High Risk: %{y}<extra></extra>' },
                    { x: ageDist.labels, y: ageDist.lowData, type: 'bar', name: 'Low Risk', marker: { color: '#10B981' }, opacity: 0.85, hovertemplate: '<b>%{x}</b><br>Low Risk: %{y}<extra></extra>' }
                  ]}
                  layout={{
                    ...commonLayout,
                    barmode: 'group',
                    bargap: 0.25,
                    bargroupgap: 0.05,
                    height: 240,
                    showlegend: true,
                    legend: { orientation: 'h', y: 1.12, x: 1, xanchor: 'right' },
                    xaxis: { showgrid: false },
                    yaxis: { gridcolor: "rgba(15,23,42,0.06)" }
                  }}
                  config={{ displayModeBar: false }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            </div>
          </div>

          {/* 
            ----------------------------------------------------
            SECOND ROW OF CHARTS: Gender Pie Chart & Clinical Averages
            ----------------------------------------------------
          */}
          <div className="grid-2">
            {/* Gender Pie Chart */}
            <div className="card">
              <div className="section-title"><span className="dot"></span> Gender Split</div>
              <div style={{ width: '100%', height: '200px' }}>
                <Plot
                  data={[{
                    values: [kpi.male, kpi.female],
                    labels: ['Male', 'Female'],
                    hole: 0.55,
                    type: 'pie',
                    marker: { colors: ['#60A5FA', '#F472B6'] },
                    textinfo: 'none',
                    hovertemplate: '<b>%{label}</b><br>%{value} patients (%{percent})<extra></extra>'
                  }]}
                  layout={{
                    ...commonLayout,
                    height: 200,
                    showlegend: true,
                    legend: { orientation: 'h', y: -0.08, x: 0.5, xanchor: 'center' }
                  }}
                  config={{ displayModeBar: false }}
                  style={{ width: '100%' }}
                  useResizeHandler
                />
              </div>
            </div>

            {/* Clinical Averages (Boxes showing numbers) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div className="section-title"><span className="dot"></span> Clinical Averages</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, alignContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(220,38,38,0.05)', borderRadius: '10px', border: '1px solid rgba(220,38,38,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>{clinAvg.cholHigh}</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '2px' }}>High Risk Chol.</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{clinAvg.cholLow}</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '2px' }}>Low Risk Chol.</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(220,38,38,0.05)', borderRadius: '10px', border: '1px solid rgba(220,38,38,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>{clinAvg.bpHigh}</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '2px' }}>High Risk BP</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{clinAvg.bpLow}</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '2px' }}>Low Risk BP</div>
                </div>
              </div>
            </div>
          </div>

          {/* 
            ----------------------------------------------------
            RECENT ACTIVITY LIST (Bottom Section)
            ----------------------------------------------------
          */}
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <div className="section-title"><span className="dot"></span> Recent Activity</div>
            {recent.map((p, idx) => {
              const isHigh = p.result === 'HIGH';
              const riskCol = isHigh ? '#DC2626' : '#059669';
              const badgeCls = isHigh ? 'badge-danger' : 'badge-success';
              const icon = isHigh ? '⚠️' : '✅';
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>{icon} {p.name || 'Unknown'}</div>
                    <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '2px' }}>Age {p.age} · {p.sex}</div>
                  </div>
                  <div><span className={`badge ${badgeCls}`}>{p.result}</span></div>
                  <div style={{ fontWeight: 700, color: riskCol, fontSize: '0.9rem' }}>{p.risk_pct}%</div>
                  <div style={{ color: '#64748B', fontSize: '0.78rem', textAlign: 'right' }}>{p.date}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
