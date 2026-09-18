const pool = require('../config/db');

/**
 * GET /api/doctors
 * جلب الأطباء المعتمدين (is_verified = true) مع دعم البحث الجغرافي
 * query params:
 *   - city (اختياري): البلدية/المدينة، للبحث عن الأطباء فيها أولاً
 *   - lat, lng (اختياري): إحداثيات المستخدم، تُستخدم كخطة بديلة لجلب أقرب 10 أطباء
 */
async function getDoctors(req, res) {
  const { city, lat, lng } = req.query;

  const doctorFields = `
      doctors.id, doctors.specialty, doctors.address, doctors.city,
      doctors.phone, doctors.working_hours, doctors.latitude, doctors.longitude,
      users.full_name, users.email
  `;

  try {
    // 1) إن تم تمرير البلدية (city)، نبحث فيها أولاً
    if (city) {
      const cityResult = await pool.query(
        `SELECT ${doctorFields}
         FROM doctors
         JOIN users ON users.id = doctors.user_id
         WHERE doctors.is_verified = TRUE AND doctors.city ILIKE $1
         ORDER BY doctors.created_at DESC`,
        [city]
      );

      if (cityResult.rows.length > 0) {
        return res.status(200).json({
          source: 'city',
          count: cityResult.rows.length,
          doctors: cityResult.rows,
        });
      }
    }

    // 2) إن لم يتوفر أطباء في نفس البلدية (أو لم تُرسل)، نعتمد على الإحداثيات الجغرافية
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      if (Number.isNaN(userLat) || Number.isNaN(userLng)) {
        return res.status(400).json({ message: 'قيم lat/lng غير صالحة' });
      }

      // صيغة Haversine لحساب المسافة بالكيلومتر مباشرة عبر SQL بدون الحاجة لامتدادات إضافية
      const distanceResult = await pool.query(
        `SELECT ${doctorFields},
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(doctors.latitude)) *
                cos(radians(doctors.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(doctors.latitude))
              ))
            )
          ) AS distance_km
         FROM doctors
         JOIN users ON users.id = doctors.user_id
         WHERE doctors.is_verified = TRUE
           AND doctors.latitude IS NOT NULL
           AND doctors.longitude IS NOT NULL
         ORDER BY distance_km ASC
         LIMIT 10`,
        [userLat, userLng]
      );

      return res.status(200).json({
        source: 'distance',
        count: distanceResult.rows.length,
        doctors: distanceResult.rows,
      });
    }

    // 3) لا city ولا إحداثيات: نعيد قائمة عامة بالأطباء المعتمدين (مع حد أقصى للأمان)
    const fallbackResult = await pool.query(
      `SELECT ${doctorFields}
       FROM doctors
       JOIN users ON users.id = doctors.user_id
       WHERE doctors.is_verified = TRUE
       ORDER BY doctors.created_at DESC
       LIMIT 20`
    );

    return res.status(200).json({
      source: 'all',
      count: fallbackResult.rows.length,
      doctors: fallbackResult.rows,
    });
  } catch (err) {
    console.error('خطأ أثناء جلب الأطباء:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء جلب الأطباء' });
  }
}

/**
 * GET /api/doctors/:id
 * جلب تفاصيل طبيب معين عبر معرف doctors.id
 */
async function getDoctorById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
        doctors.id, doctors.specialty, doctors.address, doctors.city,
        doctors.phone, doctors.working_hours, doctors.is_verified,
        doctors.latitude, doctors.longitude,
        users.full_name, users.email
      FROM doctors
      JOIN users ON users.id = doctors.user_id
      WHERE doctors.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'الطبيب غير موجود' });
    }

    return res.status(200).json({ doctor: result.rows[0] });
  } catch (err) {
    console.error('خطأ أثناء جلب تفاصيل الطبيب:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء جلب تفاصيل الطبيب' });
  }
}

/**
 * PUT /api/doctors/profile
 * تحديث بيانات العيادة الخاصة بالطبيب الموثَّق (يُستخرج من req.user بعد authMiddleware)
 * body: { specialty?, address?, city?, phone?, working_hours?, latitude?, longitude? }
 */
async function updateProfile(req, res) {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'هذا المسار مخصص لحسابات الأطباء فقط' });
  }

  const { specialty, address, city, phone, working_hours, latitude, longitude } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على ملف الطبيب' });
    }

    const result = await pool.query(
      `UPDATE doctors SET
        specialty      = COALESCE($1, specialty),
        address        = COALESCE($2, address),
        city           = COALESCE($3, city),
        phone          = COALESCE($4, phone),
        working_hours  = COALESCE($5, working_hours),
        latitude       = COALESCE($6, latitude),
        longitude      = COALESCE($7, longitude)
      WHERE user_id = $8
      RETURNING *`,
      [
        specialty || null,
        address || null,
        city || null,
        phone || null,
        working_hours || null,
        latitude ?? null,
        longitude ?? null,
        req.user.id,
      ]
    );

    return res.status(200).json({
      message: 'تم تحديث بيانات العيادة بنجاح',
      doctor: result.rows[0],
    });
  } catch (err) {
    console.error('خطأ أثناء تحديث بيانات الطبيب:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تحديث البيانات' });
  }
}

module.exports = { getDoctors, getDoctorById, updateProfile };
