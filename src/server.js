require('dotenv').config();
const app = require('./app');
require('./config/db'); // تفعيل الاتصال بقاعدة البيانات
const runMigrations = require('./config/migrate');

const PORT = process.env.PORT || 5000;

// تنفيذ سكريبت الهجرة (إنشاء الجداول تلقائياً) ثم تشغيل السيرفر
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل الآن على المنفذ ${PORT}`);
  });
});
