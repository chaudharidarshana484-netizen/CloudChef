const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/login',             authController.login);
router.post('/customer/register', authController.registerCustomer);
router.post('/customer/login',    authController.customerLogin);
router.get('/me', protect,        authController.getMe);

module.exports = router;
