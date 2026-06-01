const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

const VALID_ROLE_ROOMS = ['physician', 'nurse', 'technician', 'reception', 'admin'];

// Map a user role to the socket room it should join.
const roomForRole = (role) => {
  if (role === 'doctor') return 'physician';
  if (role === 'receptionist') return 'reception';
  return role;
};

/** Attach a Socket.IO server to an existing HTTP server. Call once at boot. */
const initRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Authenticate every connection with the same JWT used by the REST API.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const room = roomForRole(socket.user?.role);
    if (room && VALID_ROLE_ROOMS.includes(room)) {
      socket.join(room);
    }
    // Admin observes every queue.
    if (socket.user?.role === 'admin') {
      VALID_ROLE_ROOMS.forEach((r) => socket.join(r));
    }
  });

  return io;
};

/**
 * Notify a station that its queue changed.
 * @param {string} role  target room: 'physician' | 'nurse' | 'technician' | 'reception'
 * @param {object} payload { event, record }
 */
const emitQueue = (role, payload = {}) => {
  if (!io || !role) return;
  const room = roomForRole(role);
  io.to(room).emit('queue:update', { room, ...payload });
  // Admin mirrors every room, so it already receives the emit above.
};

module.exports = { initRealtime, emitQueue };
