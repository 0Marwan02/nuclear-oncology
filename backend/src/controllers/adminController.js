const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const { parseEgyptianNationalId } = require('../utils/nationalIdParser');

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

module.exports = { getUsers, createUser, toggleUserStatus, getAuditLogs };
