const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
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
