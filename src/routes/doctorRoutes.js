const express = require('express');
const router = express.Router();
const { getDoctors, getDoctorById, updateProfile } = require('../controllers/doctorController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/doctors  (عام - لا يتطلب توثيق)
router.get('/', getDoctors);

// PUT /api/doctors/profile  (محمي - للطبيب الموثَّق فقط)
// ملاحظة: يجب وضع هذا المسار قبل /:id حتى لا يتم تفسير "profile" كمعرف
router.put('/profile', authMiddleware, updateProfile);

// GET /api/doctors/:id  (عام)
router.get('/:id', getDoctorById);

module.exports = router;
