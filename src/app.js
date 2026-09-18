const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// مسار تجريبي للتأكد من عمل السيرفر
app.get('/', (req, res) => {
  res.send('MyDoctor Backend API is running...');
});

// ربط الـ routes الخاصة بالمشروع
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/specialties', require('./routes/specialtyRoutes'));
app.use('/api/municipalities', require('./routes/municipalityRoutes'));

module.exports = app;
