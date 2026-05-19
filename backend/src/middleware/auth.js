const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, hospitalId: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account inactive or not found' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

const doctorOnly = requireRole('doctor', 'admin');
const adminOnly = requireRole('admin');

module.exports = { auth, requireRole, doctorOnly, adminOnly };
