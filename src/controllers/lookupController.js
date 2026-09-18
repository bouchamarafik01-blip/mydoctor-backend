const pool = require('../config/db');

/**
 * GET /api/specialties
 * جلب قائمة التخصصات الطبية (Public - لتغذية Dropdown list)
 */
async function getSpecialties(req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM specialties ORDER BY name ASC');
    return res.status(200).json({ count: result.rows.length, specialties: result.rows });
  } catch (err) {
    console.error('خطأ أثناء جلب التخصصات:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء جلب التخصصات' });
  }
}

/**
 * GET /api/municipalities
 * جلب قائمة البلديات (Public - لتغذية Dropdown list)
 * query params (اختياري):
 *   - wilaya: لتصفية البلديات حسب ولاية معينة
 */
async function getMunicipalities(req, res) {
  const { wilaya } = req.query;

  try {
    let result;

    if (wilaya) {
      result = await pool.query(
        'SELECT id, name, wilaya FROM municipalities WHERE wilaya ILIKE $1 ORDER BY name ASC',
        [wilaya]
      );
    } else {
      result = await pool.query(
        'SELECT id, name, wilaya FROM municipalities ORDER BY wilaya ASC, name ASC'
      );
    }

    return res.status(200).json({ count: result.rows.length, municipalities: result.rows });
  } catch (err) {
    console.error('خطأ أثناء جلب البلديات:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء جلب البلديات' });
  }
}

module.exports = { getSpecialties, getMunicipalities };
