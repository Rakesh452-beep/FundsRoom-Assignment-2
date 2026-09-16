const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/login', validate(loginSchema), controller.login);
router.get('/me', auth, controller.me);

module.exports = router;
