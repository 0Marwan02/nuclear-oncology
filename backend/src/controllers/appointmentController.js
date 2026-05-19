const prisma = require('../prisma');

const listAppointments = async (req, res) => {
  try {
    const { date } = req.query;
    const where = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.appointmentDate = { gte: start, lte: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, nationalId: true, phone: true } },
        creator: { select: { name: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createAppointment = async (req, res) => {
  const { patientId, appointmentDate, appointmentType, notes } = req.body;
  if (!patientId || !appointmentDate || !appointmentType) {
    return res.status(400).json({ message: 'patientId, appointmentDate, and appointmentType are required' });
  }
  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: new Date(appointmentDate),
        appointmentType,
        notes: notes || null,
        createdBy: req.user.id,
      },
      include: { patient: { select: { id: true, name: true, nationalId: true } } },
    });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getFollowUpReminders = async (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: now, lte: end },
        status: { in: ['Scheduled', 'Pending'] },
      },
      include: {
        patient: { select: { id: true, name: true, nationalId: true, phone: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    const overdue = await prisma.appointment.findMany({
      where: {
        appointmentDate: { lt: now },
        status: { in: ['Scheduled', 'Pending'] },
      },
      include: {
        patient: { select: { id: true, name: true, nationalId: true, phone: true } },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 20,
    });

    res.json({ upcoming: appointments, overdue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { listAppointments, createAppointment, getFollowUpReminders };
