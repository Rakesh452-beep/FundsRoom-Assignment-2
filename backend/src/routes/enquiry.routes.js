const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/enquiry.controller');
const validate = require('../middleware/validate');
const { EnquiryStatus } = require('../config/constants');

const router = express.Router();

const itemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

const enquirySchema = z.object({
  customer: z.object({
    id: z.number().int().positive().optional(),
    companyName: z.string().min(2).optional(),
    contactPerson: z.string().min(2).optional(),
    mobile: z.string().min(7).max(15).optional(),
    email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
    city: z.string().optional().or(z.literal('').transform(() => undefined)),
  }),
  items: z.array(itemSchema).min(1, 'At least one product is required'),
  enquiryDate: z.string().optional().or(z.literal('').transform(() => undefined)),
  requiredDate: z.string().optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().optional().or(z.literal('').transform(() => undefined)),
}).refine((d) => d.customer.id || (d.customer.companyName && d.customer.contactPerson && d.customer.mobile),
  { message: 'Provide existing customer id OR full customer details', path: ['customer'] });

router.get('/', controller.list);
router.get('/:id', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.getById);
router.post('/', validate(enquirySchema), controller.create);
router.patch('/:id/status', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), validate(z.object({ status: z.nativeEnum(EnquiryStatus) })), controller.updateStatus);

module.exports = router;
