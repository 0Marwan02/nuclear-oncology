import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, User, LogOut, ShieldCheck, Activity, Building, Stethoscope, Syringe, UserCheck, FileText, ChevronDown, ChevronRight, Scan, Search, KeyRound, Languages, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../i18n/index';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();
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

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div>
            <h2>NuclOnco</h2>
            <span className="sidebar-subtitle">{t('app.subtitle')}</span>
          </div>
          <span className="role-badge">{t(`admin.users.role_${user.role}`) || user.role}</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <Home size={20} />
            <span>{t('nav.dashboard')}</span>
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>{t('nav.patients')}</span>
          </NavLink>

          {isNurse && (
            <>

              <NavLink to="/nurse" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCheck size={20} />
                <span>{t('nav.nurse')}</span>
              </NavLink>
            </>
          )}

          {isTechnician && (
            <NavLink to="/technician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Syringe size={20} />
              <span>{t('nav.technician')}</span>
            </NavLink>
          )}

          {isDoctor && (
            <>
              <NavLink to="/physician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Stethoscope size={20} />
                <span>{t('nav.physician')}</span>
              </NavLink>

            </>
          )}

          {isAdmin && (
            <>

              <NavLink to="/nurse" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCheck size={20} />
                <span>{t('nav.nurse')}</span>
              </NavLink>
              <NavLink to="/technician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Syringe size={20} />
                <span>{t('nav.technician')}</span>
              </NavLink>
              <NavLink to="/physician" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Stethoscope size={20} />
                <span>{t('nav.physician')}</span>
              </NavLink>

              <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShieldCheck size={20} />
                <span>{t('nav.admin_users')}</span>
              </NavLink>
              <NavLink to="/admin/permissions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <KeyRound size={20} />
                <span>{t('nav.permissions')}</span>
              </NavLink>
              <NavLink to="/admin/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Activity size={20} />
                <span>{t('nav.audit_logs')}</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <User size={20} />
            <span className="user-name">{user.name}</span>
          </div>
          <button
            className="lang-toggle-btn"
            onClick={() => navigate('/settings')}
            title={t('nav.settings')}
          >
            <SettingsIcon size={16} />
            <span>{t('nav.settings')}</span>
          </button>
          <button
            className="lang-toggle-btn"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            title={t('nav.language')}
          >
            <Languages size={16} />
            <span>{t('nav.language')}</span>
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1>{t('app.name')}</h1>
          <button
            type="button"
            className="header-search-hint"
            title={t('global_search.hint')}
            onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
          >
            <Search size={18} />
            <kbd className="header-kbd">Ctrl+K</kbd>
          </button>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
