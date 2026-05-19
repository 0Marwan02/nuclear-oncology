const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validators');

router.post('/login', validateLogin, login);
router.post('/register', validateRegister, register);

module.exports = router;