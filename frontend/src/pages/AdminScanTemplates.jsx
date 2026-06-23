import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/index';
import {
  listScanTemplates, getScanTemplate, createScanTemplate, updateScanTemplate, setScanTemplateActive,
} from '../utils/api';
import { Plus, Trash2, Loader2, LayoutTemplate, CheckCircle, AlertCircle, Power, Pencil } from 'lucide-react';

const SECTIONS = [
  { value: 'doctor', key: 'tpl.section_doctor' },
  { value: 'nurse', key: 'tpl.section_nurse' },
  { value: 'tech', key: 'tpl.section_tech' },
  { value: 'results', key: 'tpl.section_results' },
];

const FIELD_TYPES = [
  'text', 'textarea', 'number', 'date', 'datetime',
  'checkbox', 'radio', 'select', 'multiselect', 'vitalsTable',
];

const emptyField = (section = 'doctor', order = 0) => ({
  section, key: '', label: '', labelAr: '', type: 'text',
  options: '', unit: '', required: false, order, conditional: '',
});

const emptyTemplate = () => ({
  key: '', name: '', nameAr: '', category: '', icon: '', color: '#3b82f6', isActive: true, fields: [],
});

// Normalize a template loaded from the API into the editable form shape
// (options stored as JSON array string → comma list; conditional JSON → "field=value").
const toForm = (tpl) => ({
  id: tpl.id,
  key: tpl.key || '',
  name: tpl.name || '',
  nameAr: tpl.nameAr || '',
  category: tpl.category || '',
  icon: tpl.icon || '',
  color: tpl.color || '#3b82f6',
  isActive: !!tpl.isActive,
  fields: (tpl.fields || []).map((f) => {
    let opts = '';
    try { opts = Array.isArray(JSON.parse(f.options)) ? JSON.parse(f.options).join(', ') : (f.options || ''); }
    catch { opts = f.options || ''; }
    let cond = '';
    try { const c = JSON.parse(f.conditional); if (c && c.field) cond = `${c.field}=${c.equals}`; } catch { /* */ }
    return {
      section: f.section, key: f.key, label: f.label, labelAr: f.labelAr || '',
      type: f.type, options: opts, unit: f.unit || '', required: !!f.required,
      order: f.order ?? 0, conditional: cond,
    };
  }),
});

// Convert the editable form back into the API payload.
const toPayload = (form) => ({
  key: form.key,
  name: form.name,
  nameAr: form.nameAr || null,
  category: form.category || null,
  icon: form.icon || null,
  color: form.color || null,
  isActive: form.isActive,
  fields: form.fields.map((f, i) => {
    const out = {
      section: f.section, key: f.key, label: f.label, labelAr: f.labelAr || null,
      type: f.type, unit: f.unit || null, required: !!f.required,
      order: Number.isFinite(+f.order) ? +f.order : i,
    };
    if (['radio', 'select', 'multiselect'].includes(f.type) && f.options) {
      out.options = JSON.stringify(f.options.split(',').map((s) => s.trim()).filter(Boolean));
    }
    if (f.conditional && f.conditional.includes('=')) {
      const [field, equals] = f.conditional.split('=');
      out.conditional = JSON.stringify({ field: field.trim(), equals: equals.trim() });
    }
    return out;
  }),
});

const AdminScanTemplates = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = list view; object = edit/create
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listScanTemplates(false);
      setTemplates(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(emptyTemplate()); setError(''); setSuccess(''); };
  const startEdit = async (tpl) => {
    setError(''); setSuccess('');
    try {
      const full = await getScanTemplate(tpl.id);
      setForm(toForm(full));
    } catch (e) {
      setError(e.message || 'Failed to load template');
    }
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setField = (idx, k, v) =>
    setForm((p) => ({ ...p, fields: p.fields.map((f, i) => (i === idx ? { ...f, [k]: v } : f)) }));
  const addField = () =>
    setForm((p) => ({ ...p, fields: [...p.fields, emptyField('doctor', p.fields.length)] }));
  const removeField = (idx) =>
    setForm((p) => ({ ...p, fields: p.fields.filter((_, i) => i !== idx) }));

  const save = async () => {
    setError(''); setSuccess('');
    if (!form.key || !form.name) { setError('Key and name are required'); return; }
    if (form.fields.some((f) => !f.key || !f.label)) { setError('Every field needs a key and label'); return; }
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (form.id) await updateScanTemplate(form.id, payload);
      else await createScanTemplate(payload);
      setSuccess(t('tpl.saved'));
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tpl) => {
    try {
      await setScanTemplateActive(tpl.id, !tpl.isActive);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update status');
    }
  };

  if (loading) return <div className="dashboard-loading"><Loader2 className="spin" /> {t('common.loading')}</div>;

  // ---------- Editor ----------
  if (form) {
    return (
      <div className="admin-templates fade-in" style={{ maxWidth: 980, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <h2><LayoutTemplate size={22} /> {form.id ? t('tpl.edit') : t('tpl.new')}</h2>
            <p className="text-muted">{t('tpl.subtitle')}</p>
          </div>
          <button className="btn" onClick={() => setForm(null)}>{t('tpl.cancel')}</button>
        </div>

        {error && <div className="notification notification-error fade-in"><AlertCircle size={18} /><span>{error}</span></div>}

        <div className="sheet-section" style={{ marginBottom: 16 }}>
          <div className="sheet-row">
            <div className="form-group"><label>{t('tpl.key')}</label>
              <input value={form.key} disabled={!!form.id} onChange={(e) => setF('key', e.target.value)} placeholder="lung_perfusion" />
            </div>
            <div className="form-group"><label>{t('tpl.name')}</label>
              <input value={form.name} onChange={(e) => setF('name', e.target.value)} placeholder="Lung Perfusion" />
            </div>
            <div className="form-group"><label>{t('tpl.name_ar')}</label>
              <input value={form.nameAr} onChange={(e) => setF('nameAr', e.target.value)} dir="rtl" />
            </div>
          </div>
          <div className="sheet-row">
            <div className="form-group"><label>{t('tpl.category')}</label>
              <input value={form.category} onChange={(e) => setF('category', e.target.value)} />
            </div>
            <div className="form-group"><label>{t('tpl.icon')}</label>
              <input value={form.icon} onChange={(e) => setF('icon', e.target.value)} placeholder="Activity" />
            </div>
            <div className="form-group"><label>{t('tpl.color')}</label>
              <input type="color" value={form.color} onChange={(e) => setF('color', e.target.value)} style={{ width: 60, padding: 2 }} />
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setF('isActive', e.target.checked)} />
                <span>{t('tpl.active')}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="sheet-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t('tpl.fields')} ({form.fields.length})</h3>
            <button type="button" className="btn btn-sm" onClick={addField}><Plus size={16} /> {t('tpl.add_field')}</button>
          </div>

          {form.fields.length === 0 && <div className="empty-state">{t('tpl.empty')}</div>}

          {form.fields.map((f, idx) => (
            <div key={idx} className="sheet-subsection" style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div className="sheet-row">
                <div className="form-group"><label>{t('tpl.section')}</label>
                  <select value={f.section} onChange={(e) => setField(idx, 'section', e.target.value)}>
                    {SECTIONS.map((s) => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>{t('tpl.field_type')}</label>
                  <select value={f.type} onChange={(e) => setField(idx, 'type', e.target.value)}>
                    {FIELD_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>{t('tpl.key')}</label>
                  <input value={f.key} onChange={(e) => setField(idx, 'key', e.target.value)} placeholder="fieldKey" />
                </div>
                <div className="form-group"><label>{t('tpl.order')}</label>
                  <input type="number" value={f.order} onChange={(e) => setField(idx, 'order', e.target.value)} style={{ width: 70 }} />
                </div>
              </div>
              <div className="sheet-row">
                <div className="form-group"><label>{t('tpl.label')}</label>
                  <input value={f.label} onChange={(e) => setField(idx, 'label', e.target.value)} />
                </div>
                <div className="form-group"><label>{t('tpl.label_ar')}</label>
                  <input value={f.labelAr} onChange={(e) => setField(idx, 'labelAr', e.target.value)} dir="rtl" />
                </div>
                <div className="form-group"><label>{t('tpl.unit')}</label>
                  <input value={f.unit} onChange={(e) => setField(idx, 'unit', e.target.value)} style={{ width: 90 }} />
                </div>
              </div>
              {['radio', 'select', 'multiselect'].includes(f.type) && (
                <div className="form-group"><label>{t('tpl.options')}</label>
                  <input value={f.options} onChange={(e) => setField(idx, 'options', e.target.value)} placeholder="option_a, option_b, option_c" />
                </div>
              )}
              <div className="sheet-row" style={{ alignItems: 'center' }}>
                <div className="form-group"><label>{t('tpl.conditional')}</label>
                  <input value={f.conditional} onChange={(e) => setField(idx, 'conditional', e.target.value)} placeholder="otherField=yes" />
                </div>
                <label className="checkbox-label" style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                  <input type="checkbox" checked={f.required} onChange={(e) => setField(idx, 'required', e.target.checked)} />
                  <span>{t('tpl.required')}</span>
                </label>
                <button type="button" className="btn-icon" style={{ alignSelf: 'flex-end', marginBottom: 6 }} onClick={() => removeField(idx)} title={t('tpl.remove')}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn-primary btn-lg" disabled={saving} onClick={save}>
            {saving ? <><Loader2 size={18} className="spin" /> {t('tpl.saving')}</> : t('tpl.save')}
          </button>
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className="admin-templates fade-in">
      <div className="page-header">
        <div>
          <h2><LayoutTemplate size={22} /> {t('tpl.title')}</h2>
          <p className="text-muted">{t('tpl.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={startNew}><Plus size={18} /> {t('tpl.new')}</button>
      </div>

      {success && <div className="notification notification-success fade-in"><CheckCircle size={18} /><span>{success}</span></div>}
      {error && <div className="notification notification-error fade-in"><AlertCircle size={18} /><span>{error}</span></div>}

      {templates.length === 0 ? (
        <div className="empty-state">{t('tpl.empty')}</div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead><tr><th>{t('tpl.name')}</th><th>{t('tpl.key')}</th><th>{t('tpl.category')}</th><th>{t('tpl.fields')}</th><th>{t('tpl.active')}</th><th></th></tr></thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id}>
                  <td><span style={{ borderInlineStart: `3px solid ${tpl.color || '#3b82f6'}`, paddingInlineStart: 8 }}>{tpl.name}</span></td>
                  <td><code>{tpl.key}</code></td>
                  <td>{tpl.category || '—'}</td>
                  <td>{tpl.fields?.length ?? 0}</td>
                  <td>{tpl.isActive
                    ? <span className="status-badge status-completed">{t('tpl.active')}</span>
                    : <span className="status-badge status-cancelled">{t('tpl.inactive')}</span>}
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" title={t('tpl.edit')} onClick={() => startEdit(tpl)}><Pencil size={16} /></button>
                    <button className="btn-icon" title={tpl.isActive ? t('tpl.deactivate') : t('tpl.activate')} onClick={() => toggleActive(tpl)}><Power size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminScanTemplates;
