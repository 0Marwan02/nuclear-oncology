const { filterBodyByRole, pickClinicalFields, TYPE_TO_MODEL } = require('../utils/scanFields');

/** Strip clinical scan columns the current role is not allowed to write. */
const roleFieldFilter = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') return next();
  const role = req.user?.role || 'guest';
  const modelName = TYPE_TO_MODEL[req.params.type];
  if (!modelName) return next();

  const allowed = filterBodyByRole(req.body, role, modelName);
  // Remove any real model column present in the body that this role may not write.
  const present = pickClinicalFields(req.body, modelName);
  for (const key of Object.keys(present)) {
    if (!Object.prototype.hasOwnProperty.call(allowed, key)) {
      delete req.body[key];
    }
  }
  Object.assign(req.body, allowed);
  next();
};

module.exports = { roleFieldFilter };
