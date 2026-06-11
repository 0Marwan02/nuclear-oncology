import { useState, useEffect } from 'react';
import { User, Lock, BadgeCheck, Loader2, ShieldAlert } from 'lucide-react';
import { getMe, updateMe } from '../utils/api';
import { useTranslation } from '../i18n/index';
import './Settings.css';

const Settings = () => {
  const { t } = useTranslation();
  const [me, setMe] = useState(null);
  const [name, setName] = useState('');
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingName, setSavingName] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    getMe()
      .then((data) => { setMe(data); setName(data.name || ''); })
      .catch(() => setNotice({ type: 'error', text: t('settings.load_failed') }));
  }, []);

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const syncLocalUser = (user) => {
    try {
      const stored = JSON.parse(localStorage.getItem('auth_user') || '{}');
      localStorage.setItem('auth_user', JSON.stringify({ ...stored, name: user.name }));
    } catch {}
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === me?.name || savingName) return;
    setSavingName(true);
    try {
      const res = await updateMe({ name: name.trim() });
      setMe(res.user);
      syncLocalUser(res.user);
      flash('success', t('settings.name_saved'));
    } catch (err) {
      flash('error', err.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (savingPwd) return;
    if (pwd.next.length < 8) return flash('error', t('settings.pwd_too_short'));
    if (pwd.next !== pwd.confirm) return flash('error', t('settings.pwd_mismatch'));
    setSavingPwd(true);
    try {
      await updateMe({ currentPassword: pwd.current, newPassword: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      flash('success', t('settings.pwd_saved'));
    } catch (err) {
      flash('error', err.message);
    } finally {
      setSavingPwd(false);
    }
  };

  if (!me) {
    return <div className="settings-loading"><Loader2 size={22} className="spin" /> {t('common.loading')}</div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>{t('settings.title')}</h2>
        <p className="text-muted">{t('settings.subtitle')}</p>
      </div>

      {notice && (
        <div className={`settings-notice settings-notice--${notice.type} fade-in`}>{notice.text}</div>
      )}

      <div className="settings-grid">
        {/* Profile card */}
        <form className="settings-card" onSubmit={handleSaveName}>
          <div className="settings-card-title"><User size={16} /> {t('settings.profile')}</div>

          <div className="form-group">
            <label>{t('settings.hospital_id')}</label>
            <div className="settings-locked-field">
              <span>{me.hospitalId}</span>
              <span className="settings-locked-hint"><ShieldAlert size={13} /> {t('settings.id_locked')}</span>
            </div>
          </div>

          <div className="form-group">
            <label>{t('settings.role')}</label>
            <div className="settings-locked-field">
              <span className="settings-role-badge"><BadgeCheck size={14} /> {me.role}</span>
            </div>
          </div>

          <div className="form-group">
            <label>{t('settings.display_name')}</label>
            <input type="text" className="touch-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>

          <button type="submit" className="btn-primary" disabled={savingName || !name.trim() || name.trim() === me.name}>
            {savingName ? <><Loader2 size={15} className="spin" /> {t('common.saving')}</> : t('settings.save_name')}
          </button>
        </form>

        {/* Password card */}
        <form className="settings-card" onSubmit={handleSavePassword}>
          <div className="settings-card-title"><Lock size={16} /> {t('settings.change_password')}</div>

          <div className="form-group">
            <label>{t('settings.current_password')}</label>
            <input type="password" className="touch-input" value={pwd.current} autoComplete="current-password"
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} required />
          </div>

          <div className="form-group">
            <label>{t('settings.new_password')}</label>
            <input type="password" className="touch-input" value={pwd.next} autoComplete="new-password" minLength={8}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} required />
            <span className="settings-field-hint">{t('settings.pwd_hint')}</span>
          </div>

          <div className="form-group">
            <label>{t('settings.confirm_password')}</label>
            <input type="password" className="touch-input" value={pwd.confirm} autoComplete="new-password"
              onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} required />
          </div>

          <button type="submit" className="btn-primary" disabled={savingPwd || !pwd.current || !pwd.next}>
            {savingPwd ? <><Loader2 size={15} className="spin" /> {t('common.saving')}</> : t('settings.save_password')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
