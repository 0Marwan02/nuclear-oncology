import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, User, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import './GlobalSearch.css';

const RECENT_KEY = 'nuclear_oncology_recent_searches';

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecent(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecent = (term) => {
    const updated = [term, ...recent.filter(r => r !== term)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const searchPatients = useCallback(async (term) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/patients?q=${encodeURIComponent(term.trim())}`);
      setResults(data.patients || data || []);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (open && query) searchPatients(query);
      else if (!query) setResults([]);
    }, 300);
    return () => clearTimeout(delay);
  }, [query, open, searchPatients]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [open]);

  const handleSelect = (patient) => {
    saveRecent(query || patient.name);
    setOpen(false);
    navigate(`/patients/${patient._id || patient.id}`);
  };

  const handleViewHistory = (e, patient) => {
    e.stopPropagation();
    saveRecent(query || patient.name);
    setOpen(false);
    navigate(`/patients/${patient._id || patient.id}/history`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const allItems = query ? results : recent.map(r => ({ _recent: true, name: r }));

  return (
    <>
      {open && <div className="global-search-backdrop" onClick={() => setOpen(false)} />}
      <div className={`global-search-modal ${open ? 'open' : ''}`} ref={modalRef}>
        <div className="global-search-input-wrapper">
          <Search size={20} className="global-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="البحث عن مريض بالاسم أو رقم الهوية..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); }}
            onKeyDown={handleKeyDown}
            dir="rtl"
          />
          {query && (
            <button className="global-search-clear" onClick={() => { setQuery(''); setResults([]); }}>
              <X size={16} />
            </button>
          )}
          <kbd className="global-search-kbd">ESC</kbd>
        </div>

        <div className="global-search-results">
          {!query && recent.length > 0 && (
            <>
              <div className="global-search-section-header">
                <Clock size={14} />
                <span>عمليات بحث سابقة</span>
                <button className="clear-recent-btn" onClick={clearRecent}>مسح</button>
              </div>
              {recent.map((term, i) => (
                <div
                  key={`recent-${i}`}
                  className={`global-search-item ${selectedIndex === i ? 'selected' : ''}`}
                  onClick={() => { setQuery(term); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Clock size={16} className="item-icon recent" />
                  <span>{term}</span>
                </div>
              ))}
            </>
          )}

          {loading && (
            <div className="global-search-loading">
              <Loader2 size={20} className="spin" />
              <span>جاري البحث...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="global-search-empty">
              <Search size={24} />
              <p>لا توجد نتائج لـ "{query}"</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              {!query && <div className="global-search-section-header"><User size={14} /><span>نتائج البحث</span></div>}
              {results.map((patient, i) => (
                <div
                  key={patient._id || patient.id || i}
                  className={`global-search-item patient ${selectedIndex === i ? 'selected' : ''}`}
                  onClick={() => handleSelect(patient)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="patient-avatar">
                    {(patient.name || '?').charAt(0)}
                  </div>
                  <div className="patient-info">
                    <span className="patient-name">{patient.name}</span>
                    <span className="patient-id">
                      {patient.nationalId ? `رقم الهوية: ${patient.nationalId}` : patient.phone || ''}
                    </span>
                  </div>
                  <div className="patient-actions">
                    <button
                      className="patient-action-btn"
                      onClick={(e) => { e.stopPropagation(); handleSelect(patient); }}
                      title="عرض الملف"
                    >
                      <FileText size={14} /> ملف
                    </button>
                    <button
                      className="patient-action-btn"
                      onClick={(e) => handleViewHistory(e, patient)}
                      title="التاريخ الطبي"
                    >
                      <ArrowRight size={14} /> التاريخ
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default GlobalSearch;
