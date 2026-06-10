const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const { parseEgyptianNationalId } = require('../utils/nationalIdParser');
const { PERMISSION_CATALOG, DEFAULT_ROLE_PERMISSIONS, ALL_ROLES } = require('../utils/permissions');
const { invalidateCache } = require('../utils/permissionCache');

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, hospitalId: true, name: true, role: true,
        nationalId: true, phone: true, gender: true, birthDate: true,
        isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createUser = async (req, res) => {
  const { hospitalId, name, role, password, nationalId, phone } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { hospitalId } });
    if (existing) return res.status(400).json({ message: 'Hospital ID already exists' });

    let gender = req.body.gender || null;
    let birthDate = req.body.birthDate ? new Date(req.body.birthDate) : null;

    if (nationalId) {
      const parsed = parseEgyptianNationalId(nationalId);
      if (parsed.isValid) {
        gender = parsed.gender;
        birthDate = parsed.birthDate;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        hospitalId, name, role, password: hashedPassword,
        nationalId: nationalId || null,
        phone: phone || null,
        gender,
        birthDate,
      },
    });

    res.json({
      message: 'User created successfully',
      user: {
        id: user.id, hospitalId: user.hospitalId, name: user.name,
        role: user.role, nationalId: user.nationalId, phone: user.phone,
        gender: user.gender, birthDate: user.birthDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot block admins' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { name: true, role: true, hospitalId: true } },
      },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ===== Permissions =====

const getPermissionMatrix = async (req, res) => {
  try {
    const rows = await prisma.rolePermission.findMany({
      select: { role: true, permission: true },
    });
    const matrix = {};
    for (const row of rows) {
      if (!matrix[row.role]) matrix[row.role] = [];
      matrix[row.role].push(row.permission);
    }
    res.json({ catalog: PERMISSION_CATALOG, matrix, roles: ALL_ROLES });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const setRolePermission = async (req, res) => {
  const { role, permission, granted } = req.body;
  if (!role || !permission) return res.status(400).json({ message: 'role and permission are required' });
  if (role === 'admin') return res.status(400).json({ message: 'Admin permissions cannot be modified' });
  if (!ALL_ROLES.includes(role)) return res.status(400).json({ message: `Unknown role: ${role}` });
  const validKey = PERMISSION_CATALOG.find(p => p.key === permission);
  if (!validKey) return res.status(400).json({ message: `Unknown permission: ${permission}` });

  try {
    if (granted) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        update: { grantedBy: req.user.id },
        create: { role, permission, grantedBy: req.user.id },
      });
    } else {
      await prisma.rolePermission.deleteMany({ where: { role, permission } });
    }
    invalidateCache();
    res.json({ ok: true, role, permission, granted });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resetRolePermissions = async (req, res) => {
  try {
    for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await prisma.rolePermission.deleteMany({ where: { role } });
      if (perms && perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map(permission => ({ role, permission, grantedBy: req.user.id })),
          skipDuplicates: true,
        });
      }
    }
    invalidateCache();
    res.json({ ok: true, message: 'All role permissions reset to system defaults' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ===== Per-User Permission Overrides =====

const getUserPermissions = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, hospitalId: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const overrides = await prisma.userPermission.findMany({ where: { userId } });

    const rolePerms = await prisma.rolePermission.findMany({
      where: { role: user.role },
      select: { permission: true },
    });
    const roleGranted = new Set(rolePerms.map(r => r.permission));

    const effective = PERMISSION_CATALOG.map(p => {
      const override = overrides.find(o => o.permission === p.key);
      const fromRole = roleGranted.has(p.key);
      let source = 'role';
      let finalGranted = fromRole;
      if (override) {
        finalGranted = override.granted;
        source = override.granted ? 'user_granted' : 'user_revoked';
      }
      return { permission: p.key, label: p.label, category: p.category, granted: finalGranted, source };
    });

    res.json({ user, effective, overrides });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const setUserPermission = async (req, res) => {
  const { userId } = req.params;
  const { permission, granted } = req.body;
  if (!permission || granted === undefined) return res.status(400).json({ message: 'permission and granted are required' });

  const validKey = PERMISSION_CATALOG.find(p => p.key === permission);
  if (!validKey) return res.status(400).json({ message: `Unknown permission: ${permission}` });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Admin permissions cannot be overridden' });

    await prisma.userPermission.upsert({
      where: { userId_permission: { userId, permission } },
      update: { granted, grantedBy: req.user.id, grantedAt: new Date() },
      create: { userId, permission, granted, grantedBy: req.user.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        tableName: 'UserPermission',
        recordId: userId,
        action: granted ? 'GRANT' : 'REVOKE',
        newValues: JSON.stringify({ userId, permission, granted }),
      },
    });

    invalidateCache();
    res.json({ ok: true, userId, permission, granted });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const removeUserPermission = async (req, res) => {
  const { userId, permission } = req.params;
  try {
    await prisma.userPermission.deleteMany({ where: { userId, permission } });
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        tableName: 'UserPermission',
        recordId: userId,
        action: 'DELETE',
        newValues: JSON.stringify({ userId, permission, action: 'override_removed' }),
      },
    });
    invalidateCache();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getUsers, createUser, toggleUserStatus, getAuditLogs, getPermissionMatrix, setRolePermission, resetRolePermissions, getUserPermissions, setUserPermission, removeUserPermission };
