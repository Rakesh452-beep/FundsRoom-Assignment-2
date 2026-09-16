const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/salesOrder.controller');
const validate = require('../middleware/validate');
const authorizeRole = require('../middleware/rbac');
const { Role } = require('../config/constants');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.getById);
router.post('/:id/confirm', authorizeRole(Role.ADMIN), validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.confirm);
router.post('/:id/dispatch', authorizeRole(Role.ADMIN), validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), validate(z.object({ vehicleNo: z.string().min(1, 'Vehicle number required'), driver: z.string().optional().or(z.literal('').transform(() => undefined)) })), controller.dispatch);
router.post('/:id/cancel', authorizeRole(Role.ADMIN), validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.cancel);

module.exports = router;
