const express = require('express');
const { register, login, me, registerMarketing, confirmEmail } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/register-marketing', registerMarketing);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.get('/confirm-email', confirmEmail);

module.exports = router;


