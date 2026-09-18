const pool = require('../config/db');

/**
 * PATCH /api/admin/doctors/:id/verify
 * اعتماد حساب طبيب بعد التأكد من وثائقه (id هنا هو doctors.id)
 */
async function verifyDoctor(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE doctors SET is_verified = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }

    return res.status(200).json({
      message: 'تم اعتماد حساب الطبيب بنجاح، سيظهر الآن في نتائج البحث',
      doctor: result.rows[0],
    });
  } catch (err) {
    console.error('خطأ أثناء اعتماد الطبيب:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء اعتماد الطبيب' });
  }
}

module.exports = { verifyDoctor };
