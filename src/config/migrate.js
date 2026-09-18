const fs = require('fs');
const path = require('path');
const pool = require('./db');

/**
 * تنفيذ ملف schema.sql لإنشاء الجداول تلقائياً إن لم تكن موجودة
 * ثم تنفيذ ملف seed.sql لإدخال البيانات الأولية (تخصصات، بلديات)
 * يتم استدعاء هذه الدالة عند تشغيل السيرفر (src/server.js)
 */
async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  try {
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSQL);
    console.log('✅ تم إنشاء/التحقق من جداول قاعدة البيانات بنجاح');

    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    await pool.query(seedSQL);
    console.log('✅ تم التحقق من البيانات الأولية (specialties, municipalities) بنجاح');
  } catch (err) {
    console.error('❌ فشل تنفيذ سكريبت الهجرة (migration):', err.message);
  }
}

module.exports = runMigrations;
