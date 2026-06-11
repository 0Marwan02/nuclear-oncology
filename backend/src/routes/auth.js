const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, register, getMe, updateMe } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validators');
const { auth, adminOnly } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, try again later' },
});

router.post('/login', loginLimiter, validateLogin, login);
// Internal HIS: only an admin can register new staff accounts.
router.post('/register', auth, adminOnly, validateRegister, register);
router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);

module.exports = router;
