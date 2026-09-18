# MyDoctor Backend — ملخص تقني (Handover Summary)

آخر تحديث: حتى نهاية هذه الجلسة. المشروع: Node.js + Express + PostgreSQL (مكتبة `pg`).

## 1. هيكل المشروع

```
mydoctor-backend/
├── .env
├── package.json
└── src/
    ├── app.js                 # إعداد Express + ربط الـ routes
    ├── server.js              # نقطة التشغيل + تنفيذ الهجرة تلقائياً
    ├── config/
    │   ├── db.js               # Pool اتصال PostgreSQL
    │   ├── schema.sql          # تعريف الجداول (CREATE TABLE + ALTER)
    │   └── migrate.js          # ينفذ schema.sql عند بدء السيرفر
    ├── controllers/
    │   ├── authController.js       # register, login
    │   ├── doctorController.js     # getDoctors, getDoctorById, updateProfile
    │   ├── appointmentController.js# createAppointment, getMyAppointments, updateAppointmentStatus
    │   └── adminController.js      # verifyDoctor
    ├── middlewares/
    │   └── authMiddleware.js   # التحقق من JWT + checkRole(...roles)
    ├── routes/
    │   ├── authRoutes.js
    │   ├── doctorRoutes.js
    │   ├── appointmentRoutes.js
    │   └── adminRoutes.js
    └── models/                 # فارغ حالياً (لا يوجد ORM، الاستعلامات مباشرة عبر pool.query)
```

**ملاحظة**: لا يوجد ORM؛ جميع الاستعلامات SQL خام عبر `pg.Pool` مباشرة داخل الـ controllers.

## 2. هيكل قاعدة البيانات (PostgreSQL)

### جدول `users`
| العمود | النوع | ملاحظات |
|---|---|---|
| id | SERIAL PK | |
| full_name | VARCHAR(150) NOT NULL | |
| email | VARCHAR(150) UNIQUE NOT NULL | |
| password | VARCHAR(255) NOT NULL | مشفّرة بـ bcrypt |
| role | VARCHAR(20) DEFAULT 'patient' | CHECK IN ('patient','doctor','admin') |
| created_at | TIMESTAMP DEFAULT NOW() | |

### جدول `doctors`
| العمود | النوع | ملاحظات |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER UNIQUE, FK → users(id) ON DELETE CASCADE | |
| specialty | VARCHAR(100) NOT NULL | |
| address | VARCHAR(255) | |
| city | VARCHAR(100) | تُستخدم كـ"البلدية" في البحث الجغرافي |
| phone | VARCHAR(20) | |
| working_hours | VARCHAR(255) | نص حر، مثال: "Sat-Thu 09:00-17:00" |
| is_verified | BOOLEAN DEFAULT FALSE | يُفعَّله الأدمن فقط |
| latitude / longitude | DECIMAL(10,7) | لموقع العيادة |
| created_at | TIMESTAMP DEFAULT NOW() | |

### جدول `appointments`
| العمود | النوع | ملاحظات |
|---|---|---|
| id | SERIAL PK | |
| patient_id | INTEGER, FK → users(id) ON DELETE CASCADE | |
| doctor_id | INTEGER, FK → doctors(id) ON DELETE CASCADE | |
| appointment_date | DATE NOT NULL | |
| appointment_time | TIME NOT NULL | |
| status | VARCHAR(20) DEFAULT 'pending' | CHECK IN ('pending','confirmed','cancelled','completed') |
| created_at | TIMESTAMP DEFAULT NOW() | |

فهارس موجودة على: `doctors.user_id`, `doctors.is_verified`, `doctors.city`, `appointments.patient_id`, `appointments.doctor_id`, `appointments.appointment_date`.

الهجرة (`migrate.js`) تُنفَّذ تلقائياً في كل `npm start` / `npm run dev` عبر `schema.sql` (يستخدم `IF NOT EXISTS` و`ADD COLUMN IF NOT EXISTS`، آمن للتنفيذ المتكرر دون فقدان بيانات).

## 3. نظام التوثيق (Auth) والأدوار (Roles)

- **تشفير كلمة المرور**: `bcrypt` (10 salt rounds).
- **الرمز**: `JWT` موقّع بـ `JWT_SECRET` (من `.env`)، صالح 7 أيام، يحوي `{ id, role, email }`.
- **الأدوار الثلاثة**: `patient`, `doctor`, `admin` (مخزّنة في `users.role`).
- **`authMiddleware.js`**:
  - يتحقق من ترويسة `Authorization: Bearer <token>`.
  - يرفق البيانات المفكوكة في `req.user`.
  - يُصدّر أيضاً `checkRole(...roles)` لتقييد مسار بدور معيّن (مستخدَم حالياً في `/api/admin`).
- عند تسجيل طبيب (`role: doctor`)، يُنشأ صف مرتبط في `doctors` تلقائياً ضمن نفس المعاملة (transaction)، بحالة `is_verified: false` افتراضياً.

## 4. الـ API Routes المكتملة

### `/api/auth` (عام)
| Method | Path | الوصف |
|---|---|---|
| POST | `/api/auth/register` | تسجيل حساب (patient/doctor/admin)، تشفير كلمة المرور، إنشاء صف `doctors` تلقائياً إن كان الدور طبيب |
| POST | `/api/auth/login` | تسجيل دخول، إرجاع JWT |

### `/api/doctors`
| Method | Path | الحماية | الوصف |
|---|---|---|---|
| GET | `/api/doctors` | عام | يدعم `?city=` و`?lat=&lng=` — بحث بالبلدية أولاً ثم بأقرب 10 أطباء (Haversine) كخطة بديلة |
| GET | `/api/doctors/:id` | عام | تفاصيل طبيب واحد |
| PUT | `/api/doctors/profile` | JWT (دور doctor فقط) | تحديث بيانات العيادة الخاصة بالطبيب المسجَّل دخوله |

### `/api/appointments` (كل المسارات تتطلب JWT)
| Method | Path | الوصف |
|---|---|---|
| POST | `/api/appointments` | حجز موعد (للمريض فقط)، يتحقق أن الطبيب معتمد |
| GET | `/api/appointments/my-appointments` | يعرض مواعيد المستخدم حسب دوره (مريض/طبيب/أدمن) |
| PATCH | `/api/appointments/:id/status` | تحديث الحالة؛ المريض يلغي فقط، الطبيب يغيّر حالة مواعيده، الأدمن بلا قيود |

### `/api/admin` (JWT + دور admin فقط)
| Method | Path | الوصف |
|---|---|---|
| PATCH | `/api/admin/doctors/:id/verify` | اعتماد حساب طبيب (`is_verified = TRUE`) |

## 5. الحزم المستخدمة (package.json)
`express`, `cors`, `pg`, `dotenv`, `bcrypt`, `jsonwebtoken` — و`nodemon` كـ devDependency.
السكريبتات: `npm start` (production)، `npm run dev` (nodemon).

## 6. ما لم يُنفَّذ بعد (نقاط انطلاق للجلسة القادمة)
- لا يوجد `models/` فعلي (طبقة بيانات منظمة) — الاستعلامات مكتوبة مباشرة داخل الـ controllers.
- لا يوجد validation middleware مركزي (مثل Joi/Zod) — التحقق حالياً يدوي داخل كل controller.
- لا يوجد رفع ملفات/وثائق إثبات هوية للطبيب (يُفترض أنه يتم يدوياً حالياً قبل `verify`).
- لا يوجد rate limiting أو helmet لتعزيز الأمان.
- لا اختبارات آلية (unit/integration tests).
