const express = require('express');
const router = express.Router();
const { getAppliances, updateAppliance } = require('../controllers/applianceController');

// GET /api/appliances - List all configured appliances and channels
router.get('/', getAppliances);

// PUT /api/appliances/:channel_id - Update name, category, and power threshold for an appliance
router.put('/:channel_id', updateAppliance);

module.exports = router;
