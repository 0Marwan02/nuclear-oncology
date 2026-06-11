const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const VALID_ROLES = ['admin', 'doctor', 'nurse', 'technician', 'reception'];
const BCRYPT_ROUNDS = 12;

const login = async (req, res) => {
  const { hospitalId, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { hospitalId }
    });

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is blocked by administration' });


    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: user.id, hospitalId: user.hospitalId, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const register = async (req, res) => {
  const { hospitalId, name, role, password } = req.body;

  try {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { hospitalId, name, role, password: hashed }
    });

    res.json({ message: 'User created', user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Hospital ID already exists' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Logged-in user's own profile. hospitalId and role are read-only here —
// only an admin can change them via PUT /admin/users/:id.
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, hospitalId: true, name: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateMe = async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const data = {};

    if (name != null && name.trim() !== '' && name.trim() !== user.name) {
      data.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      data.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, hospitalId: true, name: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id, tableName: 'User', recordId: user.id,
        action: 'UPDATE',
        oldValues: JSON.stringify({ name: user.name, passwordChanged: false }),
        newValues: JSON.stringify({ name: updated.name, passwordChanged: Boolean(data.password) }),
      },
    });

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { login, register, getMe, updateMe };
