// backend/src/routes/historyRoutes.js
const express = require('express');
const router = express.Router();
const { processHistoricalData } = require('../services/processHistoricalData');
const { getHistoryByPeriod } = require('../controllers/historyController');



router.get('/:period', getHistoryByPeriod);


module.exports = router;
