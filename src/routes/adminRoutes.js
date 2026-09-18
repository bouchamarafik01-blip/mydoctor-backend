const express = require('express');
const router = express.Router();
const { verifyDoctor } = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/authMiddleware');

// جميع مسارات الأدمن تتطلب توثيق + دور admin
router.use(authMiddleware, checkRole('admin'));

// PATCH /api/admin/doctors/:id/verify
router.patch('/doctors/:id/verify', verifyDoctor);

module.exports = router;
