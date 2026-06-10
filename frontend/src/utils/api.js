const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
    const error = new Error(data.message || 'API request failed');
    error.data = data;
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

export const getAssessmentQueue = () => {
  return apiFetch('/workflow/assessment-queue');
};

export const searchPatients = (query) => {
  return apiFetch(`/patients?q=${encodeURIComponent(query)}`);
};

export const updateUser = (id, data) => {
  return apiFetch(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
