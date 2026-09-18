const pool = require('../config/db');

/**
 * دالة مساعدة: جلب معرف doctors.id انطلاقاً من user_id
 */
async function getDoctorIdByUserId(userId) {
  const result = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * POST /api/appointments
 * حجز موعد جديد (للمرضى فقط)
 * body: { doctor_id, appointment_date, appointment_time }
 */
async function createAppointment(req, res) {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ message: 'حجز المواعيد متاح للمرضى فقط' });
  }

  const { doctor_id, appointment_date, appointment_time } = req.body;

  if (!doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({
      message: 'الحقول doctor_id و appointment_date و appointment_time إلزامية',
    });
  }

  try {
    // التأكد من أن الطبيب موجود ومعتمد
    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE id = $1 AND is_verified = TRUE',
      [doctor_id]
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ message: 'الطبيب غير موجود أو غير معتمد بعد' });
    }

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [req.user.id, doctor_id, appointment_date, appointment_time]
    );

    return res.status(201).json({
      message: 'تم حجز الموعد بنجاح، بانتظار تأكيد الطبيب',
      appointment: result.rows[0],
    });
  } catch (err) {
    console.error('خطأ أثناء حجز الموعد:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء حجز الموعد' });
  }
}

/**
 * GET /api/appointments/my-appointments
 * عرض المواعيد الخاصة بالمستخدم الحالي (مريض أو طبيب)
 */
async function getMyAppointments(req, res) {
  try {
    let result;

    if (req.user.role === 'patient') {
      result = await pool.query(
        `SELECT appointments.*, 
                doctors.specialty, doctors.city,
                users.full_name AS doctor_name
         FROM appointments
         JOIN doctors ON doctors.id = appointments.doctor_id
         JOIN users ON users.id = doctors.user_id
         WHERE appointments.patient_id = $1
         ORDER BY appointments.appointment_date DESC, appointments.appointment_time DESC`,
        [req.user.id]
      );
    } else if (req.user.role === 'doctor') {
      const doctorId = await getDoctorIdByUserId(req.user.id);

      if (!doctorId) {
        return res.status(404).json({ message: 'لم يتم العثور على ملف الطبيب' });
      }

      result = await pool.query(
        `SELECT appointments.*,
                users.full_name AS patient_name, users.email AS patient_email
         FROM appointments
         JOIN users ON users.id = appointments.patient_id
         WHERE appointments.doctor_id = $1
         ORDER BY appointments.appointment_date DESC, appointments.appointment_time DESC`,
        [doctorId]
      );
    } else {
      // أدمن: يمكنه رؤية جميع المواعيد
      result = await pool.query(
        `SELECT appointments.* FROM appointments
         ORDER BY appointments.appointment_date DESC, appointments.appointment_time DESC`
      );
    }

    return res.status(200).json({ count: result.rows.length, appointments: result.rows });
  } catch (err) {
    console.error('خطأ أثناء جلب المواعيد:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء جلب المواعيد' });
  }
}

/**
 * PATCH /api/appointments/:id/status
 * تحديث حالة الموعد
 * body: { status } // 'confirmed' | 'cancelled' | 'completed'
 *
 * الصلاحيات:
 *  - admin: يمكنه تغيير أي حالة
 *  - doctor: يمكنه تأكيد/إلغاء/إنهاء المواعيد الخاصة به فقط
 *  - patient: يمكنه فقط إلغاء (cancelled) موعده الخاص
 */
async function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: `قيمة status يجب أن تكون إحدى: ${allowedStatuses.join(', ')}`,
    });
  }

  try {
    const appointmentResult = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    const appointment = appointmentResult.rows[0];

    if (req.user.role === 'patient') {
      if (appointment.patient_id !== req.user.id) {
        return res.status(403).json({ message: 'لا يمكنك تعديل موعد لا يخصك' });
      }
      if (status !== 'cancelled') {
        return res.status(403).json({ message: 'المريض يمكنه فقط إلغاء الموعد' });
      }
    } else if (req.user.role === 'doctor') {
      const doctorId = await getDoctorIdByUserId(req.user.id);
      if (!doctorId || appointment.doctor_id !== doctorId) {
        return res.status(403).json({ message: 'لا يمكنك تعديل موعد لا يخصك' });
      }
    }
    // الأدمن مسموح له بأي تعديل بدون قيود إضافية

    const updateResult = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    return res.status(200).json({
      message: 'تم تحديث حالة الموعد بنجاح',
      appointment: updateResult.rows[0],
    });
  } catch (err) {
    console.error('خطأ أثناء تحديث حالة الموعد:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تحديث حالة الموعد' });
  }
}

module.exports = { createAppointment, getMyAppointments, updateAppointmentStatus };
