const express = require('express');
const router = express.Router();
const { createRateAlert } = require('../controllers/alertController');

router.post('/alerts', createRateAlert);

module.exports = router;
