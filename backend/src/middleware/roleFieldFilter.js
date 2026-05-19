const { filterBodyByRole, CLINICAL_PREP_FIELDS } = require('../utils/scanFields');

/** Strip clinical fields the current role is not allowed to write on scan/workflow updates. */
const roleFieldFilter = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();
  const role = req.user?.role || 'guest';
  const allowed = filterBodyByRole(req.body, role);
  for (const key of CLINICAL_PREP_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, key) && !Object.prototype.hasOwnProperty.call(allowed, key)) {
      delete req.body[key];
    }
  }
  Object.assign(req.body, allowed);
  next();
};

module.exports = { roleFieldFilter };
