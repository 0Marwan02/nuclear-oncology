import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, User, LogOut, ShieldCheck, Activity, Building, Stethoscope, Syringe, UserCheck, FileText, ChevronDown, ChevronRight, Scan, Search } from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const [clinicsOpen, setClinicsOpen] = useState(false);
  const [scansOpen, setScansOpen] = useState(false);
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    navigate('/login');
  };

  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'doctor';
  const isNurse = user.role === 'nurse';
  const isTechnician = user.role === 'technician';
  const isReception = user.role === 'reception';

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>NuclOnco</h2>
          <span className="role-badge">{user.role}</span>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>Patients</span>
          </NavLink>

          <div className="nav-submenu">
            <button
              className={`nav-item nav-submenu-toggle ${clinicsOpen ? 'open' : ''}`}
              onClick={() => setClinicsOpen(!clinicsOpen)}
            >
              <FileText size={20} />
              <span>Clinics</span>
              {clinicsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {clinicsOpen && (
              <div className="submenu-items">
                <NavLink to="/clinic/green" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot green-dot"></span>
                  <span>Green File (Thyroid Cancer)</span>
                </NavLink>
                <NavLink to="/clinic/red" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot red-dot"></span>
                  <span>Red File (Thyroid Diseases)</span>
                </NavLink>
              </div>
            )}
          </div>

          <div className="nav-submenu">
            <button
              className={`nav-item nav-submenu-toggle ${scansOpen ? 'open' : ''}`}
              onClick={() => setScansOpen(!scansOpen)}
            >
              <Scan size={20} />
              <span>Scans</span>
              {scansOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {scansOpen && (
              <div className="submenu-items">
                <NavLink to="/scans" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#2563eb' }}></span>
                  <span>All Scans</span>
                </NavLink>
                <NavLink to="/scans/petct" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#7c3aed' }}></span>
                  <span>PET/CT</span>
                </NavLink>
                <NavLink to="/scans/psma" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#ea580c' }}></span>
                  <span>PSMA PET/CT</span>
                </NavLink>
                <NavLink to="/scans/thyroid" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#16a34a' }}></span>
                  <span>Thyroid Scan</span>
                </NavLink>
                <NavLink to="/scans/bone" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#2563eb' }}></span>
                  <span>Bone Scan</span>
                </NavLink>
                <NavLink to="/scans/renal" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#0d9488' }}></span>
                  <span>Renal Scan</span>
                </NavLink>
                <NavLink to="/scans/gastric" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#d97706' }}></span>
                  <span>Gastric Emptying</span>
                </NavLink>
                <NavLink to="/scans/meckel" className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}>
                  <span className="submenu-dot" style={{ background: '#be185d' }}></span>
                  <span>Meckel&apos;s Scan</span>
                </NavLink>
              </div>
            )}
          </div>

          {isReception && (
            <NavLink to="/reception" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Building size={20} />
              <span>Reception</span>
            </NavLink>
          )}

          {isNurse && (
            <NavLink to="/nurse" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <UserCheck size={20} />
              <span>Nurse Dashboard</span>
            </NavLink>
          )}

          {isTechnician && (
            <NavLink to="/technician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Syringe size={20} />
              <span>Technician Dashboard</span>
            </NavLink>
          )}

          {isDoctor && (
            <NavLink to="/physician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Stethoscope size={20} />
              <span>Physician Dashboard</span>
            </NavLink>
          )}

          {isAdmin && (
            <>
              <NavLink to="/reception" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Building size={20} />
                <span>Reception</span>
              </NavLink>
              <NavLink to="/nurse" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCheck size={20} />
                <span>Nurse Dashboard</span>
              </NavLink>
              <NavLink to="/technician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Syringe size={20} />
                <span>Technician Dashboard</span>
              </NavLink>
              <NavLink to="/physician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Stethoscope size={20} />
                <span>Physician Dashboard</span>
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShieldCheck size={20} />
                <span>Admin Users</span>
              </NavLink>
              <NavLink to="/admin/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Activity size={20} />
                <span>Audit Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <User size={20} />
            <span className="user-name">{user.name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1>Nuclear Oncology Dept.</h1>
          <div className="header-search-hint" title="Search patients (Ctrl+K)">
            <Search size={18} />
            <kbd className="header-kbd">Ctrl+K</kbd>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
