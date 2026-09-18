const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  updateAppointmentStatus,
} = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');

// جميع مسارات المواعيد تتطلب توثيق المستخدم
router.use(authMiddleware);

// POST /api/appointments
router.post('/', createAppointment);

// GET /api/appointments/my-appointments
router.get('/my-appointments', getMyAppointments);

// PATCH /api/appointments/:id/status
router.patch('/:id/status', updateAppointmentStatus);

module.exports = router;
