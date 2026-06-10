const allowedRoles = new Set(['doctor', 'nurse', 'technician', 'technical', 'admin']);

const isValidDate = (value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const requireBodyFields = (fields) => (req, res, next) => {
  const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
  if (missing.length) {
    return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
  }
  return next();
};

const validateRegister = (req, res, next) => {
  const { hospitalId, name, role, password } = req.body;
  if (!hospitalId || !name || !role || !password) {
    return res.status(400).json({ message: 'hospitalId, name, role, and password are required' });
  }
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ message: 'Invalid role. Allowed roles: doctor, nurse, technician, admin' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  return next();
};

const validateLogin = (req, res, next) => {
  const { hospitalId, password } = req.body;
  if (!hospitalId || !password) {
    return res.status(400).json({ message: 'hospitalId and password are required' });
  }
  return next();
};

const validatePatientCreate = (req, res, next) => {
  const { gender, birthDate } = req.body;
  if (!['male', 'female'].includes(String(gender).toLowerCase())) {
    return res.status(400).json({ message: 'gender must be male or female' });
  }
  if (!isValidDate(birthDate)) {
    return res.status(400).json({ message: 'birthDate must be a valid date' });
  }
  return next();
};

const validateVisitCreate = (req, res, next) => {
  const { visitDate } = req.body;
  if (visitDate && !isValidDate(visitDate)) {
    return res.status(400).json({ message: 'visitDate must be a valid date' });
  }
  return next();
};

module.exports = {
  requireBodyFields,
  validateRegister,
  validateLogin,
  validatePatientCreate,
  validateVisitCreate
};
