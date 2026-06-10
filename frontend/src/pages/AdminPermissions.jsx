import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';
import { useTranslation } from '../i18n/index';
import { ShieldCheck, RotateCcw, Check, X, AlertTriangle, Info, Lock, User, RefreshCw } from 'lucide-react';
import './AdminPermissions.css';

const ROLE_META = {
  doctor:     { color: '#16a34a' },
  nurse:      { color: '#9333ea' },
  technician: { color: '#ea580c' },
};

export default function AdminPermissions() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('roles');

  // ── Role permissions state ─────────────────────────────────────────
  const [catalog, setCatalog]   = useState([]);
  const [matrix, setMatrix]     = useState({});
  const [roles, setRoles]       = useState([]);
  const [saving, setSaving]     = useState({});
  const [resetting, setResetting] = useState(false);
  const [toast, setToast]       = useState(null);
  const [error, setError]       = useState('');

  // ── User overrides state ───────────────────────────────────────────
  const [users, setUsers]               = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPerms, setUserPerms]       = useState(null);   // { user, effective, overrides }
  const [userPermsLoading, setUserPermsLoading] = useState(false);
  const [userSaving, setUserSaving]     = useState({});     // { permKey: true }

  // ── Helpers ────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Role permissions data ──────────────────────────────────────────
  const loadMatrix = useCallback(async () => {
    try {
      const data = await apiFetch('/admin/permissions');
      setCatalog(data.catalog || []);
      setMatrix(data.matrix || {});
      setRoles(data.roles || []);
    } catch (err) {
      setError(err.message || 'Failed to load permissions');
    }
  }, []);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  const hasPermission = (role, permKey) =>
    Array.isArray(matrix[role]) && matrix[role].includes(permKey);

  const toggle = async (role, permKey, currentlyGranted) => {
    const key = `${role}:${permKey}`;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await apiFetch('/admin/permissions', {
        method: 'POST',
        body: JSON.stringify({ role, permission: permKey, granted: !currentlyGranted }),
      });
      setMatrix(prev => {
        const next = { ...prev };
        if (!currentlyGranted) {
          next[role] = [...(next[role] || []), permKey];
        } else {
          next[role] = (next[role] || []).filter(p => p !== permKey);
        }
        return next;
      });
    } catch (err) {
      showToast(err.message || 'Failed to update permission', 'error');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  const grantAll = async (role) => {
    const allKeys = catalog.map(p => p.key);
    setSaving(s => ({ ...s, [`${role}:__all`]: true }));
    try {
      await Promise.all(
        allKeys.map(permKey =>
          hasPermission(role, permKey)
            ? Promise.resolve()
            : apiFetch('/admin/permissions', {
                method: 'POST',
                body: JSON.stringify({ role, permission: permKey, granted: true }),
              })
        )
      );
      setMatrix(prev => ({ ...prev, [role]: [...allKeys] }));
      showToast(t('admin.permissions.grant_all'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(s => ({ ...s, [`${role}:__all`]: false }));
    }
  };

  const revokeAll = async (role) => {
    const allKeys = catalog.map(p => p.key);
    setSaving(s => ({ ...s, [`${role}:__all`]: true }));
    try {
      await Promise.all(
        allKeys.map(permKey =>
          !hasPermission(role, permKey)
            ? Promise.resolve()
            : apiFetch('/admin/permissions', {
                method: 'POST',
                body: JSON.stringify({ role, permission: permKey, granted: false }),
              })
        )
      );
      setMatrix(prev => ({ ...prev, [role]: [] }));
      showToast(t('admin.permissions.revoke_all'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(s => ({ ...s, [`${role}:__all`]: false }));
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm(t('admin.permissions.reset_confirm'))) return;
    setResetting(true);
    try {
      await apiFetch('/admin/permissions/reset', { method: 'POST' });
      await loadMatrix();
      showToast(t('admin.permissions.reset_done'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const categories = [...new Set(catalog.map(p => p.category))];

  // ── User overrides ─────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'users') {
      apiFetch('/admin/users')
        .then(data => setUsers(data.filter(u => u.role !== 'admin')))
        .catch(() => {});
    }
  }, [activeTab]);

  const loadUserPerms = useCallback(async (uid) => {
    if (!uid) return;
    setUserPermsLoading(true);
    try {
      const data = await apiFetch(`/admin/users/${uid}/permissions`);
      setUserPerms(data);
    } catch (err) {
      showToast(err.message || 'Failed to load user permissions', 'error');
      setUserPerms(null);
    } finally {
      setUserPermsLoading(false);
    }
  }, []);

  const handleUserSelect = (uid) => {
    setSelectedUserId(uid);
    setUserPerms(null);
    if (uid) loadUserPerms(uid);
  };

  const setUserPerm = async (permKey, granted) => {
    setUserSaving(s => ({ ...s, [permKey]: true }));
    try {
      await apiFetch(`/admin/users/${selectedUserId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permission: permKey, granted }),
      });
      await loadUserPerms(selectedUserId);
      showToast(granted ? t('admin.permissions.grant_all') : t('admin.permissions.revoke_all'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUserSaving(s => ({ ...s, [permKey]: false }));
    }
  };

  const resetUserPerm = async (permKey) => {
    setUserSaving(s => ({ ...s, [permKey]: true }));
    try {
      await apiFetch(`/admin/users/${selectedUserId}/permissions/${permKey}`, { method: 'DELETE' });
      await loadUserPerms(selectedUserId);
      showToast(t('admin.permissions.reset_done'));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUserSaving(s => ({ ...s, [permKey]: false }));
    }
  };

  const sourceStyle = (source) => {
    if (source === 'user_granted') return { bg: '#dcfce7', border: '#16a34a', color: '#15803d', label: '↑' };
    if (source === 'user_revoked') return { bg: '#fee2e2', border: '#ef4444', color: '#b91c1c', label: '↓' };
    return { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', label: '=' };
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="aperm-page">
      {toast && (
        <div className={`aperm-toast aperm-toast--${toast.type}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="aperm-header">
        <div className="aperm-title-block">
          <ShieldCheck size={28} />
          <div>
            <h1>{t('admin.permissions.title')}</h1>
            <p>{t('admin.permissions.subtitle')}</p>
          </div>
        </div>
        {activeTab === 'roles' && (
          <button className="aperm-reset-btn" onClick={resetDefaults} disabled={resetting}>
            <RotateCcw size={16} className={resetting ? 'spinning' : ''} />
            {resetting ? t('common.loading') : t('admin.permissions.reset_defaults')}
          </button>
        )}
      </div>

      {/* Page-level tab switcher */}
      <div className="aperm-tabs">
        <button
          className={`aperm-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <Lock size={15} />
          {t('admin.permissions.tab_roles')}
        </button>
        <button
          className={`aperm-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <User size={15} />
          {t('admin.permissions.tab_users')}
        </button>
      </div>

      {error && <div className="aperm-error"><AlertTriangle size={16} /> {error}</div>}

      {/* ── Role permissions tab ── */}
      {activeTab === 'roles' && (
        <>
          <div className="aperm-notice">
            <Info size={14} />
            <span><strong>{t('admin.users.role_admin')}</strong> — {t('admin.permissions.admin_locked')}</span>
          </div>

          <div className="aperm-table-wrapper">
            <table className="aperm-table">
              <thead>
                <tr>
                  <th className="aperm-perm-col">{t('admin.permissions.permission')}</th>
                  <th className="aperm-role-col">
                    <div className="aperm-role-header" style={{ color: '#64748b' }}>
                      <Lock size={14} />
                      <span>{t('admin.users.role_admin')}</span>
                    </div>
                  </th>
                  {roles.map(role => {
                    const meta = ROLE_META[role] || { color: '#64748b' };
                    const roleLabel = t(`admin.users.role_${role}`) || role;
                    const allGranted = catalog.every(p => hasPermission(role, p.key));
                    const noneGranted = catalog.every(p => !hasPermission(role, p.key));
                    return (
                      <th key={role} className="aperm-role-col">
                        <div className="aperm-role-header" style={{ color: meta.color }}>
                          <span>{roleLabel}</span>
                        </div>
                        <div className="aperm-role-actions">
                          <button
                            className="aperm-role-action-btn aperm-grant-all"
                            onClick={() => grantAll(role)}
                            disabled={allGranted || saving[`${role}:__all`]}
                            title={t('admin.permissions.grant_all')}
                          >{t('common.all')}</button>
                          <button
                            className="aperm-role-action-btn aperm-revoke-all"
                            onClick={() => revokeAll(role)}
                            disabled={noneGranted || saving[`${role}:__all`]}
                            title={t('admin.permissions.revoke_all')}
                          >{t('common.no')}</button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, ci) => {
                  const catPerms = catalog.filter(p => p.category === cat);
                  return catPerms.map((perm, pi) => (
                    <tr
                      key={perm.key}
                      className={`aperm-row ${pi === 0 ? 'aperm-row--first-in-cat' : ''}`}
                      style={{ '--stagger': `${(ci * 3 + pi) * 40}ms` }}
                    >
                      <td className="aperm-perm-cell">
                        {pi === 0 && <div className="aperm-cat-label">{t(`cat.${cat}`) || cat}</div>}
                        <div className="aperm-perm-label">{t(`perm.${perm.key}`) || perm.label}</div>
                        <div className="aperm-perm-desc">{perm.description}</div>
                      </td>
                      <td className="aperm-toggle-cell">
                        <div className="aperm-toggle aperm-toggle--locked aperm-toggle--on">
                          <Check size={13} />
                        </div>
                      </td>
                      {roles.map(role => {
                        const granted = hasPermission(role, perm.key);
                        const key = `${role}:${perm.key}`;
                        const busy = !!saving[key] || !!saving[`${role}:__all`];
                        const roleLabel = t(`admin.users.role_${role}`) || role;
                        return (
                          <td key={role} className="aperm-toggle-cell">
                            <button
                              className={`aperm-toggle ${granted ? 'aperm-toggle--on' : 'aperm-toggle--off'} ${busy ? 'aperm-toggle--busy' : ''}`}
                              onClick={() => !busy && toggle(role, perm.key, granted)}
                              disabled={busy}
                              title={granted ? `${t('admin.permissions.revoke_all')} — ${roleLabel}` : `${t('admin.permissions.grant_all')} — ${roleLabel}`}
                              aria-label={`${perm.label} for ${role}: ${granted ? 'granted' : 'denied'}`}
                            >
                              {busy ? <span className="aperm-spinner" /> : granted ? <Check size={13} /> : <X size={13} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── User overrides tab ── */}
      {activeTab === 'users' && (
        <div className="aperm-user-tab">
          <div className="aperm-user-select-row">
            <User size={16} className="aperm-user-icon" />
            <select
              className="aperm-user-select"
              value={selectedUserId}
              onChange={e => handleUserSelect(e.target.value)}
            >
              <option value="">{t('admin.permissions.select_user')}</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} — {t(`admin.users.role_${u.role}`) || u.role} ({u.hospitalId})
                </option>
              ))}
            </select>
            {selectedUserId && (
              <button className="aperm-reset-btn" onClick={() => loadUserPerms(selectedUserId)} disabled={userPermsLoading}>
                <RefreshCw size={15} className={userPermsLoading ? 'spinning' : ''} />
              </button>
            )}
          </div>

          {!selectedUserId && (
            <div className="aperm-user-empty">
              <User size={40} strokeWidth={1.2} />
              <p>{t('admin.permissions.choose_user_hint')}</p>
            </div>
          )}

          {selectedUserId && userPermsLoading && (
            <div className="aperm-user-empty">
              <span className="aperm-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          )}

          {selectedUserId && !userPermsLoading && userPerms && (
            <>
              <div className="aperm-user-legend">
                <span className="aperm-legend-item aperm-legend-role">{t('admin.permissions.legend_inherited')}</span>
                <span className="aperm-legend-item aperm-legend-granted">{t('admin.permissions.legend_granted')}</span>
                <span className="aperm-legend-item aperm-legend-revoked">{t('admin.permissions.legend_revoked')}</span>
              </div>

              <div className="aperm-table-wrapper">
                <table className="aperm-table">
                  <thead>
                    <tr>
                      <th className="aperm-perm-col">{t('admin.permissions.permission')}</th>
                      <th className="aperm-role-col" style={{ minWidth: 80 }}>{t('admin.permissions.effective')}</th>
                      <th className="aperm-role-col" style={{ minWidth: 80 }}>{t('admin.permissions.source')}</th>
                      <th className="aperm-role-col" style={{ minWidth: 140 }}>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const cats = [...new Set(userPerms.effective.map(p => p.category))];
                      return cats.map((cat, ci) => {
                        const catPerms = userPerms.effective.filter(p => p.category === cat);
                        return catPerms.map((perm, pi) => {
                          const style = sourceStyle(perm.source);
                          const busy = !!userSaving[perm.permission];
                          const hasOverride = perm.source !== 'role';
                          return (
                            <tr
                              key={perm.permission}
                              className={`aperm-row ${pi === 0 ? 'aperm-row--first-in-cat' : ''}`}
                              style={{ '--stagger': `${(ci * 3 + pi) * 30}ms` }}
                            >
                              <td className="aperm-perm-cell">
                                {pi === 0 && <div className="aperm-cat-label">{t(`cat.${cat}`) || cat}</div>}
                                <div className="aperm-perm-label">{t(`perm.${perm.permission}`) || perm.label}</div>
                              </td>
                              <td className="aperm-toggle-cell">
                                <div className={`aperm-toggle ${perm.granted ? 'aperm-toggle--on' : 'aperm-toggle--off'}`} style={{ cursor: 'default' }}>
                                  {perm.granted ? <Check size={13} /> : <X size={13} />}
                                </div>
                              </td>
                              <td className="aperm-toggle-cell">
                                <span className="aperm-source-badge" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
                                  {style.label} {t(`admin.permissions.source_${perm.source}`)}
                                </span>
                              </td>
                              <td className="aperm-toggle-cell">
                                <div className="aperm-user-actions">
                                  <button
                                    className="aperm-role-action-btn aperm-grant-all"
                                    onClick={() => !busy && setUserPerm(perm.permission, true)}
                                    disabled={busy || (perm.source === 'user_granted')}
                                    title={t('admin.permissions.grant_all')}
                                  >
                                    {busy ? <span className="aperm-spinner" style={{ width: 10, height: 10 }} /> : <Check size={11} />}
                                  </button>
                                  <button
                                    className="aperm-role-action-btn aperm-revoke-all"
                                    onClick={() => !busy && setUserPerm(perm.permission, false)}
                                    disabled={busy || (perm.source === 'user_revoked')}
                                    title={t('admin.permissions.revoke_all')}
                                  >
                                    {busy ? <span className="aperm-spinner" style={{ width: 10, height: 10 }} /> : <X size={11} />}
                                  </button>
                                  {hasOverride && (
                                    <button
                                      className="aperm-role-action-btn aperm-reset-override"
                                      onClick={() => !busy && resetUserPerm(perm.permission)}
                                      disabled={busy}
                                      title={t('admin.permissions.reset_override')}
                                    >
                                      <RotateCcw size={11} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
