const PERMISSION_CATALOG = [
  // Patient Management
  { key: 'patient:create',       label: 'Register Patients',        category: 'Patient Management', description: 'Create new patient records' },
  { key: 'patient:view',         label: 'View Patient List',         category: 'Patient Management', description: 'Browse the patient list' },
  { key: 'patient:view_profile', label: 'View Patient Profile',      category: 'Patient Management', description: 'Open a full patient profile and details' },
  { key: 'patient:view_history', label: 'View Patient History',      category: 'Patient Management', description: 'Access longitudinal scan and visit history' },
  // Clinical Data
  { key: 'clinical:view_diagnosis', label: 'View Diagnosis & Notes', category: 'Clinical Data', description: 'See physician diagnosis, impression, and clinical notes' },
  { key: 'clinical:write',          label: 'Write Clinical Assessment', category: 'Clinical Data', description: 'Create and edit clinical assessments and scan forms' },
  { key: 'clinical:view_scan_forms',label: 'View Scan Form Details', category: 'Clinical Data', description: 'Open and read full scan form data' },
  // Workflow Stages
  { key: 'workflow:assess',  label: 'Assess Patients (Doctor)',     category: 'Workflow Stages', description: 'Physician assessment — moves patient to nurse queue' },
  { key: 'workflow:prepare', label: 'Prepare Patients (Nurse)',     category: 'Workflow Stages', description: 'Nurse preparation — moves patient to technician queue' },
  { key: 'workflow:scan',    label: 'Record Scans (Technician)',    category: 'Workflow Stages', description: 'Technician injection and imaging data entry' },
  { key: 'workflow:report',  label: 'Sign Off Reports (Doctor)',    category: 'Workflow Stages', description: 'Physician final sign-off — locks and archives the visit' },
  // Clinic Files
  { key: 'clinic:view',  label: 'View Clinic Files',  category: 'Clinic Files', description: 'Access green/red clinic follow-up files' },
  { key: 'clinic:write', label: 'Write Clinic Entries', category: 'Clinic Files', description: 'Create and edit clinic follow-up entries' },
  // Scans
  { key: 'scan:view',   label: 'View Scan Records', category: 'Scans', description: 'Browse and open scan records' },
  { key: 'scan:create', label: 'Create Scans',       category: 'Scans', description: 'Create new scan records for any modality' },
  // Appointments
  { key: 'appointment:view',   label: 'View Appointments',   category: 'Appointments', description: 'View the appointment schedule' },
  { key: 'appointment:manage', label: 'Manage Appointments', category: 'Appointments', description: 'Create, edit, and delete appointments' },
  // Administration
  { key: 'admin:users',       label: 'Manage Users',        category: 'Administration', description: 'Create and block/unblock staff accounts' },
  { key: 'admin:logs',        label: 'View Audit Logs',     category: 'Administration', description: 'Access the full system audit trail' },
  { key: 'admin:permissions', label: 'Manage Permissions',  category: 'Administration', description: 'Grant and revoke role-level permissions' },
  { key: 'admin:dashboard',   label: 'View Admin Dashboard',category: 'Administration', description: 'Access the main clinic statistics dashboard' },
  { key: 'scan_template:manage', label: 'Manage Scan Templates', category: 'Administration', description: 'Create, edit, and activate admin-defined dynamic scan sheets' },
];

const DEFAULT_ROLE_PERMISSIONS = {
  doctor: [
    'patient:create', 'patient:view', 'patient:view_profile', 'patient:view_history',
    'clinical:view_diagnosis', 'clinical:write', 'clinical:view_scan_forms',
    'workflow:assess', 'workflow:prepare', 'workflow:scan', 'workflow:report',
    'clinic:view', 'clinic:write',
    'scan:view', 'scan:create',
    'appointment:view', 'appointment:manage',
  ],
  nurse: [
    'patient:create', 'patient:view', 'patient:view_profile',
    'workflow:prepare',
    'appointment:view', 'appointment:manage',
  ],
  technician: [
    'patient:view', 'patient:view_profile',
    'scan:view', 'workflow:scan',
  ],
};

const ALL_ROLES = ['doctor', 'nurse', 'technician'];

module.exports = { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS, ALL_ROLES };
