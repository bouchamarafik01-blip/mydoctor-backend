const jwt = require('jsonwebtoken');

/**
 * Middleware للتحقق من رمز JWT قبل الوصول إلى المسارات المحمية
 * يُتوقع أن يُرسل الرمز في الترويسة:  Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'الوصول مرفوض: لا يوجد رمز توثيق (token)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // إضافة بيانات المستخدم إلى الطلب لاستخدامها في المتحكمات التالية
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(403).json({ message: 'رمز التوثيق غير صالح أو منتهي الصلاحية' });
  }
}

/**
 * Middleware اختياري للتحقق من الدور (role) بعد التوثيق
 * مثال استخدام: authMiddleware, checkRole('admin')
 */
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية الوصول إلى هذا المورد' });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.checkRole = checkRole;
