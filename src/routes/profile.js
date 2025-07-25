const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/auth'); // xác thực JWT/token

router.get('/', authMiddleware, profileController.getProfile);

module.exports = router;







