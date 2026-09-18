const express = require('express');
const router = express.Router();
const { getSpecialties } = require('../controllers/lookupController');

// GET /api/specialties  (عام - لا يتطلب توثيق)
router.get('/', getSpecialties);

module.exports = router;
