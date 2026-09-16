const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/customer.controller');
const validate = require('../middleware/validate');

const router = express.Router();

const customerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  contactPerson: z.string().min(2),
  mobile: z.string().min(7).max(15),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  city: z.string().optional().or(z.literal('').transform(() => undefined)),
});

router.get('/', controller.list);
router.get('/:id', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.getById);
router.post('/', validate(customerSchema), controller.create);

module.exports = router;
