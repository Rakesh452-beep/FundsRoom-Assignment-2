const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/inventory.controller');
const validate = require('../middleware/validate');
const authorizeRole = require('../middleware/rbac');
const { Role } = require('../config/constants');

const router = express.Router();

router.get('/', controller.list);
router.patch('/:productId', authorizeRole(Role.ADMIN), validate(z.object({ productId: z.coerce.number().int().positive() }), 'params'), validate(z.object({ quantity: z.number().int() })), controller.adjust);

module.exports = router;
