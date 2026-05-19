const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { listAppointments, createAppointment, getFollowUpReminders } = require('../controllers/appointmentController');

router.use(auth);
router.get('/reminders', getFollowUpReminders);
router.get('/', listAppointments);
router.post('/', createAppointment);

module.exports = router;
