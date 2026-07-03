import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useTranslation } from '../i18n/index';
import { parseEgyptianNationalId } from '../utils/nationalIdParser';
import { ShieldCheck, UserPlus, Ban, CheckCircle } from 'lucide-react';
import './Admin.css';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ hospitalId: '', name: '', role: 'doctor', password: '', nationalId: '', phone: '' });
  const [parsedStaff, setParsedStaff] = useState(null);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleNationalIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setFormData((prev) => ({ ...prev, nationalId: value }));
    setParsedStaff(null);
    if (value.length === 14) {
      const p = parseEgyptianNationalId(value);
      if (p.isValid) setParsedStaff(p);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiFetch('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
      alert(t('error.load_failed'));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (id) => {
    try {
      await apiFetch(`/admin/users/${id}/status`, { method: 'PUT' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(t('error.save_failed'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.hospitalId.trim()) errors.hospitalId = 'Hospital ID is required';
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.password || formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(formData) });
      setShowModal(false);
      setFormData({ hospitalId: '', name: '', role: 'doctor', password: '', nationalId: '', phone: '' });
      setFieldErrors({});
      setFormError('');
      fetchUsers();
    } catch (err) {
      setFormError(err.message || t('error.save_failed'));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><ShieldCheck size={28} /> {t('admin.users.title')}</h1>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <UserPlus size={18} /> {t('admin.users.create')}
        </button>
      </div>

      <div className="table-container fade-in">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.users.hospital_id')}</th>
              <th>{t('common.name')}</th>
              <th>{t('admin.users.role')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.hospitalId}</td>
                <td>{u.name}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>{t(`admin.users.role_${u.role}`) || u.role}</span>
                </td>
                <td>
                  {u.isActive ? (
                    <span className="status-badge success"><CheckCircle size={14}/> {t('admin.users.active')}</span>
                  ) : (
                    <span className="status-badge danger"><Ban size={14}/> {t('admin.users.inactive')}</span>
                  )}
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <button
                      className={`btn small ${u.isActive ? 'danger' : 'success'}`}
                      onClick={() => toggleStatus(u.id)}
                    >
                      {u.isActive ? t('common.inactive') : t('common.active')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card fade-in">
            <h2>{t('admin.users.create')}</h2>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>{t('admin.users.hospital_id')}</label>
                <input value={formData.hospitalId} onChange={e => setFormData({...formData, hospitalId: e.target.value})}
                  className={fieldErrors.hospitalId ? 'invalid-input' : ''} />
                {fieldErrors.hospitalId && <span className="field-error">{fieldErrors.hospitalId}</span>}
              </div>
              <div className="form-group">
                <label>{t('patient.name')}</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className={fieldErrors.name ? 'invalid-input' : ''} />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </div>
              <div className="form-group">
                <label>{t('admin.users.national_id')}</label>
                <input value={formData.nationalId} onChange={handleNationalIdChange} maxLength={14} minLength={14} placeholder="14 digits" />
                {parsedStaff && (
                  <p className="field-hint">{parsedStaff.age} — {parsedStaff.gender === 'Male' ? t('common.male') : t('common.female')}</p>
                )}
              </div>
              <div className="form-group">
                <label>{t('admin.users.phone')}</label>
                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 01012345678" inputMode="numeric" maxLength={11} />
              </div>
              <div className="form-group">
                <label>{t('admin.users.role')}</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="admin">{t('admin.users.role_admin')}</option>
                  <option value="doctor">{t('admin.users.role_doctor')}</option>
                  <option value="nurse">{t('admin.users.role_nurse')}</option>
                  <option value="technician">{t('admin.users.role_technician')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('admin.users.password')}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  className={fieldErrors.password ? 'invalid-input' : ''} />
                {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
              </div>
              {formError && <div className="error-banner" style={{ marginBottom: 8 }}>{formError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn text" onClick={() => { setShowModal(false); setFieldErrors({}); setFormError(''); }}>{t('common.cancel')}</button>
                <button type="submit" className="btn primary">{t('admin.users.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
