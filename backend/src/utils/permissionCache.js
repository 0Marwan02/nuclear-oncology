const prisma = require('../prisma');

let _cache = null;
let _cacheTime = 0;
const TTL_MS = 30_000;

const _load = async () => {
  const rows = await prisma.rolePermission.findMany({ select: { role: true, permission: true } });
  _cache = {};
  for (const { role, permission } of rows) {
    if (!_cache[role]) _cache[role] = new Set();
    _cache[role].add(permission);
  }
  _cacheTime = Date.now();
  return _cache;
};

const getPermissions = async () => {
  if (_cache && Date.now() - _cacheTime < TTL_MS) return _cache;
  return _load();
};

const invalidateCache = () => { _cache = null; };

const roleHasPermission = async (role, permKey) => {
  if (role === 'admin') return true;
  const cache = await getPermissions();
  return cache[role]?.has(permKey) ?? false;
};

const requirePermission = (permKey) => async (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  try {
    const allowed = await roleHasPermission(req.user?.role, permKey);
    if (!allowed) return res.status(403).json({ message: `Permission denied: ${permKey}` });
    next();
  } catch (err) {
    res.status(500).json({ message: 'Permission check failed', error: err.message });
  }
};

module.exports = { getPermissions, invalidateCache, roleHasPermission, requirePermission };
