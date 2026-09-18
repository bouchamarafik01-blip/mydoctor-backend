-- ==========================================================
-- MyDoctor Database Schema
-- ==========================================================

-- تفعيل امتداد توليد UUID (اختياري - يُستخدم إن رغبت باعتماد UUID بدل SERIAL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1) جدول المستخدمين (users)
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,          -- كلمة المرور المشفرة (hashed)
    role           VARCHAR(20)  NOT NULL DEFAULT 'patient'
                   CHECK (role IN ('patient', 'doctor', 'admin')),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- 2) جدول الأطباء (doctors)
-- ==========================================================
CREATE TABLE IF NOT EXISTS doctors (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL UNIQUE
                   REFERENCES users(id) ON DELETE CASCADE,
    specialty      VARCHAR(100) NOT NULL,
    address        VARCHAR(255),
    city           VARCHAR(100),                   -- تُستخدم أيضاً كـ "البلدية"
    phone          VARCHAR(20),
    working_hours  VARCHAR(255),                   -- مثال: "Sat-Thu 09:00-17:00"
    is_verified    BOOLEAN NOT NULL DEFAULT FALSE,  -- يُفعَّل من طرف الأدمن
    latitude       DECIMAL(10, 7),                  -- خط العرض لموقع العيادة
    longitude      DECIMAL(10, 7),                  -- خط الطول لموقع العيادة
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- إضافة الأعمدة الجديدة تلقائياً في حال كان الجدول منشأً مسبقاً بنسخة أقدم
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS latitude    DECIMAL(10, 7);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS longitude   DECIMAL(10, 7);

-- ==========================================================
-- 3) جدول المواعيد (appointments)
-- ==========================================================
CREATE TABLE IF NOT EXISTS appointments (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER NOT NULL
                     REFERENCES users(id) ON DELETE CASCADE,
    doctor_id        INTEGER NOT NULL
                     REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- 4) جدول التخصصات الطبية (specialties)
-- ==========================================================
CREATE TABLE IF NOT EXISTS specialties (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- 5) جدول البلديات/الولايات (municipalities)
-- ==========================================================
CREATE TABLE IF NOT EXISTS municipalities (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,           -- اسم البلدية
    wilaya         VARCHAR(100) NOT NULL,           -- الولاية التابعة لها
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (name, wilaya)
);

-- ==========================================================
-- فهارس مساعدة لتحسين الأداء
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_doctors_user_id       ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_is_verified    ON doctors(is_verified);
CREATE INDEX IF NOT EXISTS idx_doctors_city           ON doctors(city);
CREATE INDEX IF NOT EXISTS idx_appointments_patient   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor    ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date      ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_municipalities_wilaya  ON municipalities(wilaya);
