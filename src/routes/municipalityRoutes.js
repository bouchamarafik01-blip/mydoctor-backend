const express = require('express');
const router = express.Router();
const { getMunicipalities } = require('../controllers/lookupController');

// GET /api/municipalities  (عام - لا يتطلب توثيق، يدعم ?wilaya=)
router.get('/', getMunicipalities);

module.exports = router;
