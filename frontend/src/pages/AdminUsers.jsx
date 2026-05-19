import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { parseEgyptianNationalId } from '../utils/nationalIdParser';
import { ShieldCheck, UserPlus, Ban, CheckCircle } from 'lucide-react';
import './Admin.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ hospitalId: '', name: '', role: 'doctor', password: '', nationalId: '', phone: '' });
  const [parsedStaff, setParsedStaff] = useState(null);

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
      alert('Failed to load users');
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
      alert('Failed to update status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(formData) });
      setShowModal(false);
      setFormData({ hospitalId: '', name: '', role: 'doctor', password: '', nationalId: '', phone: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to add user');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1><ShieldCheck size={28} /> System Staff Management</h1>
        <button className="btn primary" onClick={() => setShowModal(true)}>
          <UserPlus size={18} /> Add Staff Member
        </button>
      </div>

      <div className="table-container fade-in">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Hospital ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Active Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.hospitalId}</td>
                <td>{u.name}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role}</span>
                </td>
                <td>
                  {u.isActive ? (
                    <span className="status-badge success"><CheckCircle size={14}/> Active</span>
                  ) : (
                    <span className="status-badge danger"><Ban size={14}/> Blocked</span>
                  )}
                </td>
                <td>
                  {u.role !== 'admin' && (
                    <button 
                      className={`btn small ${u.isActive ? 'danger' : 'success'}`} 
                      onClick={() => toggleStatus(u.id)}
                    >
                      {u.isActive ? 'Block User' : 'Unblock User'}
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
            <h2>Add New Staff</h2>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>Hospital ID</label>
                <input required value={formData.hospitalId} onChange={e => setFormData({...formData, hospitalId: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>National ID</label>
                <input required value={formData.nationalId} onChange={handleNationalIdChange} maxLength={14} minLength={14} placeholder="14 رقم" />
                {parsedStaff && (
                  <p className="field-hint">العمر: {parsedStaff.age} — {parsedStaff.gender === 'Male' ? 'ذكر' : 'أنثى'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 01012345678" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="technician">Technician</option>
                  <option value="reception">Reception</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn text" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
