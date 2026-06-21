import React, { useState, useEffect } from 'react';

/**
 * ============================================================================
 * ADMIN PAGE (Admin.jsx)
 * ============================================================================
 * Purpose:
 * This page is only for administrators. It acts as a user management portal 
 * where the admin can see everyone registered on the site, add new users 
 * (like new doctors), or delete users.
 * 
 * Security Note:
 * Notice the 'role !== admin' check at the bottom. If a normal user tries 
 * to hack the website and open this page, it will just show "Access Denied".
 * ============================================================================
 */
export default function Admin({ username, role }) {
  // --------------------------------------------------------------------------
  // 1. PAGE STATE (Memory)
  // --------------------------------------------------------------------------
  const [users, setUsers] = useState([]); // List of all registered users downloaded from the database
  const [loading, setLoading] = useState(true); // Is the page currently downloading?
  const [searchQuery, setSearchQuery] = useState(''); // What the admin typed in the Search Box
  
  // Variables for the "Add New User" form at the bottom of the page
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user'); // Default role is 'user'
  
  // Variables to show success (green box) or error (red box) when adding a user
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  /**
   * --------------------------------------------------------------------------
   * 2. AUTOMATIC DATA FETCHING
   * --------------------------------------------------------------------------
   * Runs when the page opens. Tells the app to download the user list.
   */
  useEffect(() => {
    fetchUsers();
  }, [username, role]);

  // ==========================================================================
  // 3. API FUNCTIONS (Talking to the Python Server)
  // ==========================================================================

  /**
   * Action: Download the list of users
   * Purpose: Asks the backend for everyone registered. The backend will ONLY 
   * reply if we send 'role=admin' in the URL.
   */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users?role=${role}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data); // Save the downloaded list to memory
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false); // Turn off loading spinner
    }
  };

  /**
   * Action: Submit the "Add New User" form
   * Purpose: Tells the backend to create a new account in 'users.json'
   */
  const handleAddUser = async (e) => {
    e.preventDefault(); // Stop the page from refreshing when we click Submit
    setFormError('');
    setFormSuccess('');
    
    // Basic check: did they forget to type something?
    if (!newUsername || !newEmail || !newPassword) {
      setFormError('All fields are required.');
      return;
    }

    try {
      // Send the new user data to the backend
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users?role=${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess(`User '${newUsername}' added successfully!`);
        
        // Clear the form boxes so they can add another person
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('user');
        
        // Re-download the list so the new person shows up on the screen
        fetchUsers();
      } else {
        setFormError(data.detail || 'Failed to add user.');
      }
    } catch (err) {
      setFormError('Network connection error.');
    }
  };

  /**
   * Action: Delete a user account
   * Purpose: Tells the backend to erase a user from 'users.json'
   */
  const handleDeleteUser = async (uname) => {
    // Safety check: Prevent deleting the main admin so we don't lock ourselves out
    if (uname === 'admin') {
      alert('Cannot delete default admin user account.');
      return;
    }
    
    // Browser pop-up to double check
    if (!window.confirm(`Are you sure you want to delete user account '${uname}'?`)) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/users/${uname}?role=${role}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers(); // Re-download the list so the deleted person disappears
      } else {
        alert(data.detail || 'Failed to delete user.');
      }
    } catch (err) {
      alert('Network connection error.');
    }
  };

  // ==========================================================================
  // 4. DATA PROCESSING (Crunching numbers)
  // ==========================================================================

  /**
   * Function: getKPIs (Key Performance Indicators)
   * Purpose: Counts how many total users we have, and how many of them are 
   * admins, doctors, or regular users. Used for the Top Boxes.
   */
  const getKPIs = () => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const doctors = users.filter(u => u.role === 'doctor').length;
    const regular = total - admins - doctors;
    return { total, admins, doctors, regular };
  };

  // ==========================================================================
  // 5. DRAWING THE SCREEN (THE HTML / JSX)
  // ==========================================================================

  // HARD SECURITY CHECK: Prevent rendering entirely if not admin
  if (role !== 'admin') {
    return <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '4rem', fontWeight: 700 }}>🚫 Access Denied. Admin privileges required.</div>;
  }

  // Show a loading message while downloading data
  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '4rem' }}>Loading user directory...</div>;
  }

  const kpis = getKPIs();
  
  // Specific colors for the different roles
  const roleColors = { admin: '#D97706', doctor: '#0891B2', user: '#059669' };

  return (
    <div className="animate-fade-in-up">
      {/* HEADER */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="hero-title">⚙️ Admin Panel — User Management</h1>
        <p className="hero-sub">View, manage and delete registered accounts</p>
      </div>

      {/* 
        ----------------------------------------------------
        SUMMARY BOXES (Total Users, Admins, etc.)
        ----------------------------------------------------
      */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-value" style={{ color: '#DB2777' }}>{kpis.total}</div>
          <div className="metric-label">Total Users</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: '#D97706' }}>{kpis.admins}</div>
          <div className="metric-label">Admins</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: '#2563EB' }}>{kpis.doctors}</div>
          <div className="metric-label">Doctors</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: '#059669' }}>{kpis.regular}</div>
          <div className="metric-label">Regular Users</div>
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
            placeholder="🔍 Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} // Update memory when they type
          />
        </div>
      </div>

      {/* 
        ----------------------------------------------------
        THE USER LIST
        ----------------------------------------------------
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2.5rem' }}>
        {users.map((u) => {
          
          // If the search box isn't empty, and the username AND email don't match, hide this user.
          if (searchQuery && 
              !u.username.toLowerCase().includes(searchQuery.toLowerCase()) && 
              !u.email.toLowerCase().includes(searchQuery.toLowerCase())) {
            return null;
          }
          
          const roleCol = roleColors[u.role] || '#64748B';
          
          return (
            <div key={u.username} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
              
              {/* User Info Box */}
              <div className="patient-row" style={{ margin: 0, padding: '0.85rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>👤 {u.username}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '1rem', fontSize: '0.85rem' }}>{u.email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    {/* Role Badge (Colored differently based on admin/doctor/user) */}
                    <span style={{
                      background: 'rgba(15,23,42,0.04)',
                      borderRadius: '50px',
                      padding: '0.2rem 0.8rem',
                      color: roleCol,
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {u.role.toUpperCase()}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '0.8rem' }}>Joined {u.joined}</span>
                  </div>
                </div>
              </div>
              
              {/* Delete Button (Hidden for the main 'admin' account so we can't delete it) */}
              {u.username !== 'admin' ? (
                <button className="btn btn-danger" style={{ width: '40px', height: '40px', padding: 0 }} onClick={() => handleDeleteUser(u.username)}>
                  🗑️
                </button>
              ) : (
                <div style={{ width: '40px' }} /> // Empty spacer so the alignment doesn't break
              )}
            </div>
          );
        })}
      </div>

      {/* 
        ----------------------------------------------------
        ADD NEW USER FORM
        ----------------------------------------------------
      */}
      <div className="card">
        <div className="section-title"><span className="dot"></span> Add New User</div>
        
        {/* Error / Success Boxes */}
        {formError && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '0.75rem', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
            {formError}
          </div>
        )}
        {formSuccess && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#059669', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
            {formSuccess}
          </div>
        )}

        {/* The Form Fields */}
        <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Username</label>
            <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
              <input
                type="email"
                className="input-control"
                placeholder="email@x.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div className="input-wrapper" style={{ background: '#E5E7EB' }}>
              <input
                type="password"
                className="input-control"
                placeholder="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role</label>
            <select
              className="select-control"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="user">user</option>
              <option value="doctor">doctor</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" className="btn">➕ Add User</button>
        </form>
      </div>
    </div>
  );
}
