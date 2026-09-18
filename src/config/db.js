const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// اختبار الاتصال بقاعدة البيانات عند تشغيل السيرفر
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.stack);
    return;
  }
  console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
  release();
});

module.exports = pool;
