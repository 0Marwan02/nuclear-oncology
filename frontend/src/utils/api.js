const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Origin that serves static files (/uploads/...) — the API base minus trailing /api.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Session expired or token invalid — clear auth and return to login.
    if (response.status === 401 && !endpoint.startsWith('/auth/login') && window.location.pathname !== '/login') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    const error = new Error(data.message || 'API request failed');
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data;
};

export const getScans = (type, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/scans/${type}${qs ? '?' + qs : ''}`);
};

export const createScan = (type, data) => {
  return apiFetch(`/scans/${type}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateScan = (type, id, data) => {
  return apiFetch(`/scans/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getScanHistory = (type, patientId) => {
  return apiFetch(`/scans/${type}/patient/${patientId}`);
};

export const getScanStats = () => {
  return apiFetch('/scans/stats');
};

export const advanceWorkflow = (type, id, payload) => {
  return apiFetch(`/workflow/${type}/${id}/advance`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const updateWorkflowStatus = (type, id, workflowStatus, extra = {}) => {
  return advanceWorkflow(type, id, { workflowStatus, ...extra });
};

export const getWorkflowAll = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/workflow/all${qs ? '?' + qs : ''}`);
};

export const getRecordsByStatus = (type, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/workflow/${type}${qs ? '?' + qs : ''}`);
};

export const getPatientWorkflow = (patientId) => {
  return apiFetch(`/workflow/patient/${patientId}`);
};

export const getNurseQueue = () => {
  return apiFetch('/workflow/nurse-queue');
};

export const searchPatients = (query) => {
  return apiFetch(`/patients?q=${encodeURIComponent(query)}`);
};

// === Report export (WS3) ===
export const exportReport = (scanType, scanId, format = 'pdf') => {
  return apiFetch(`/reports/${scanType}/${scanId}?format=${format}`, { method: 'POST' });
};

export const getReportVersions = (scanType, scanId) => {
  return apiFetch(`/reports/${scanType}/${scanId}`);
};

// === Dynamic Sheet Engine (WS5) ===
export const listScanTemplates = (activeOnly = false) => {
  return apiFetch(`/dynamic-scans/templates${activeOnly ? '?active=1' : ''}`);
};

export const getScanTemplate = (keyOrId) => {
  return apiFetch(`/dynamic-scans/templates/${encodeURIComponent(keyOrId)}`);
};

export const createScanTemplate = (data) => {
  return apiFetch('/dynamic-scans/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateScanTemplate = (id, data) => {
  return apiFetch(`/dynamic-scans/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const setScanTemplateActive = (id, isActive) => {
  return apiFetch(`/dynamic-scans/templates/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
};

export const createDynamicScan = (data) => {
  return apiFetch('/dynamic-scans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateDynamicScan = (id, data) => {
  return apiFetch(`/dynamic-scans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getDynamicScanHistory = (patientId) => {
  return apiFetch(`/dynamic-scans/patient/${patientId}`);
};

export const getMe = () => apiFetch('/auth/me');

export const updateMe = (data) => {
  return apiFetch('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updateUser = (id, data) => {
  return apiFetch(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
