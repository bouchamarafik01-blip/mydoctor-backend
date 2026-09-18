const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * تسجيل حساب جديد (مريض أو طبيب أو أدمن)
 * body: { full_name, email, password, role, specialty?, address?, city?, phone?, working_hours? }
 */
async function register(req, res) {
  const {
    full_name,
    email,
    password,
    role,
    specialty,
    address,
    city,
    phone,
    working_hours,
    latitude,
    longitude,
  } = req.body;

  // التحقق من الحقول الأساسية
  if (!full_name || !email || !password) {
    return res.status(400).json({
      message: 'الحقول full_name و email و password إلزامية',
    });
  }

  const userRole = ['patient', 'doctor', 'admin'].includes(role) ? role : 'patient';

  if (userRole === 'doctor' && !specialty) {
    return res.status(400).json({
      message: 'حقل specialty إلزامي عند تسجيل حساب طبيب',
    });
  }

  const client = await pool.connect();

  try {
    // التحقق من عدم وجود البريد الإلكتروني مسبقاً
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'البريد الإلكتروني مستخدم مسبقاً' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await client.query('BEGIN');

    // إدخال المستخدم في جدول users
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, created_at`,
      [full_name, email, hashedPassword, userRole]
    );

    const newUser = userResult.rows[0];

    // إذا كان الحساب لطبيب، ندخل بياناته الإضافية في جدول doctors
    // ملاحظة: is_verified تبقى false افتراضياً حتى يعتمد الأدمن الحساب
    if (userRole === 'doctor') {
      await client.query(
        `INSERT INTO doctors (user_id, specialty, address, city, phone, working_hours, latitude, longitude, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
        [
          newUser.id,
          specialty,
          address || null,
          city || null,
          phone || null,
          working_hours || null,
          latitude || null,
          longitude || null,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message:
        userRole === 'doctor'
          ? 'تم إنشاء حساب الطبيب بنجاح، بانتظار اعتماد الأدمن قبل الظهور في نتائج البحث'
          : 'تم إنشاء الحساب بنجاح',
      user: newUser,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('خطأ أثناء التسجيل:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء إنشاء الحساب' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/auth/login
 * تسجيل الدخول والتحقق من البيانات وإرجاع JWT
 * body: { email, password }
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'الحقول email و password إلزامية' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    // إنشاء رمز JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('خطأ أثناء تسجيل الدخول:', err.message);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تسجيل الدخول' });
  }
}

module.exports = { register, login };
