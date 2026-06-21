import React, { useState } from 'react';
import Login from './views/Login';
import heartLogo from './assets/heart_logo.png';
import Predict from './views/Predict';
import Patients from './views/Patients';
import Dashboard from './views/Dashboard';
import Admin from './views/Admin';

/**
 * ============================================================================
 * MAIN APPLICATION WRAPPER (App.jsx)
 * ============================================================================
 * Purpose:
 * This is the very first file that runs when someone opens the website. 
 * It acts as the "Traffic Controller" for the entire application. 
 * 
 * What it does:
 * 1. Checks if you are logged in.
 * 2. If you are NOT logged in, it forces you to look at the Login Page.
 * 3. If you ARE logged in, it shows the Top Navigation Bar.
 * 4. Based on what button you click in the Nav Bar, it decides which "Page" 
 *    (Predict, Patients, Dashboard, Admin) to show on the screen.
 * ============================================================================
 */
export default function App() {
  
  // --------------------------------------------------------------------------
  // 1. STATE: REMEMBERING WHO IS LOGGED IN
  // --------------------------------------------------------------------------
  // 'auth' is a memory box. It remembers if the user is logged in, their name, 
  // their role (like 'admin' or 'user'), and their email.
  // By default (when you first open the site), loggedIn is 'false'.
  const [auth, setAuth] = useState({
    loggedIn: false,
    username: '',
    role: '',
    email: ''
  });
  
  // --------------------------------------------------------------------------
  // 2. STATE: REMEMBERING WHICH PAGE WE ARE ON
  // --------------------------------------------------------------------------
  // 'currentPage' remembers what page to show in the middle of the screen.
  // By default, as soon as you log in, it shows the 'predict' page.
  const [currentPage, setCurrentPage] = useState('predict');

  // --------------------------------------------------------------------------
  // 3. FUNCTION: WHAT HAPPENS WHEN YOU LOG IN SUCCESSFULLY
  // --------------------------------------------------------------------------
  // The Login page calls this function when you type the right password.
  // It updates our 'auth' memory to say "Yes, this person is logged in!"
  const handleLoginSuccess = (username, role, email) => {
    setAuth({ loggedIn: true, username, role, email });
    setCurrentPage('predict'); // Always take them to the Predict page first
  };

  // --------------------------------------------------------------------------
  // 4. FUNCTION: WHAT HAPPENS WHEN YOU CLICK "SIGN OUT"
  // --------------------------------------------------------------------------
  // This erases the 'auth' memory and kicks the user back to the login screen.
  const handleSignOut = () => {
    setAuth({ loggedIn: false, username: '', role: '', email: '' });
    setCurrentPage('predict');
  };

  // --------------------------------------------------------------------------
  // 5. SECURITY CHECK (GATES)
  // --------------------------------------------------------------------------
  // If the user's memory says they are NOT logged in, stop right here.
  // Only show them the <Login /> screen. They cannot see the rest of the code.
  if (!auth.loggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // If they ARE logged in, we check if they are an 'admin'
  // Admins get to see extra buttons on the top bar.
  const isAdmin = auth.role === 'admin';
  const displayRole = auth.role.toUpperCase();

  // --------------------------------------------------------------------------
  // 6. DRAWING THE SCREEN (THE HTML / JSX)
  // --------------------------------------------------------------------------
  return (
    <div>
      {/* 
        ========================================
        TOP NAVIGATION BAR 
        ========================================
      */}
      <header className="navbar">
        {/* The Logo and Title */}
        <div className="navbar-brand">
          <img src={heartLogo} alt="HEART-IQ Logo" className="brand-logo-img" style={{ width: '32px', height: '32px', borderRadius: '8px', boxShadow: '0 0 12px rgba(6,182,212,0.35)' }} />
          <div className="brand-name">HEART<span>-IQ</span></div>
        </div>

        {/* The Page Buttons (Predict, Patients, Dashboard, Admin) */}
        <nav className="navbar-nav">
          {/* If the button is clicked, change 'currentPage' to 'predict' */}
          <button
            className={`nav-link ${currentPage === 'predict' ? 'active' : ''}`}
            onClick={() => setCurrentPage('predict')}
          >
            🔮 Predict
          </button>
          
          <button
            className={`nav-link ${currentPage === 'patients' ? 'active' : ''}`}
            onClick={() => setCurrentPage('patients')}
          >
            👥 Patients
          </button>
          
          {/* These buttons are ONLY drawn if the user is an 'admin' */}
          {isAdmin && (
            <>
              <button
                className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('dashboard')}
              >
                📊 Dashboard
              </button>
              <button
                className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
                onClick={() => setCurrentPage('admin')}
              >
                ⚙️ Admin
              </button>
            </>
          )}
        </nav>

        {/* The Right Side: User Name, Role Badge, and Sign Out Button */}
        <div className="navbar-user">
          <div>
            👤 <b>{auth.username}</b>
            <span className={`role-badge ${auth.role}`}>
              {displayRole}
            </span>
          </div>
          <button className="nav-link btn-secondary" style={{ padding: '0.35rem 0.75rem' }} onClick={handleSignOut}>
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* 
        ========================================
        MAIN PAGE CONTENT VIEWER
        ========================================
        This acts like a TV screen. Depending on what channel ('currentPage')
        the user selected, it shows the correct Component (Page).
        It also passes the username and role to the pages so they know who is looking at them.
      */}
      <main className="container">
        {currentPage === 'predict' && <Predict username={auth.username} />}
        {currentPage === 'patients' && <Patients username={auth.username} role={auth.role} />}
        {currentPage === 'dashboard' && <Dashboard username={auth.username} role={auth.role} />}
        {currentPage === 'admin' && <Admin username={auth.username} role={auth.role} />}
      </main>
    </div>
  );
}
