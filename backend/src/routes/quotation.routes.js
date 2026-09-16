const express = require('express');
const { z } = require('zod');
const controller = require('../controllers/quotation.controller');
const validate = require('../middleware/validate');
const { QuotationStatus } = require('../config/constants');

const router = express.Router();

const quoteItemSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

const quotationSchema = z.object({
  enquiryId: z.number().int().positive(),
  items: z.array(quoteItemSchema).min(1),
  discountPct: z.number().min(0).max(100).optional().default(0),
  gstPct: z.number().min(0).max(100).optional().default(18),
  validUntil: z.string().optional().or(z.literal('').transform(() => undefined)),
  grandTotal: z.number().optional(),
});

router.get('/', controller.list);
router.get('/:id', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.getById);
router.post('/', validate(quotationSchema), controller.create);
router.patch('/:id/status', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), validate(z.object({ status: z.nativeEnum(QuotationStatus) })), controller.updateStatus);
router.get('/:id/pdf', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.pdf);
router.post('/:id/convert', validate(z.object({ id: z.coerce.number().int().positive() }), 'params'), controller.convert);

module.exports = router;
