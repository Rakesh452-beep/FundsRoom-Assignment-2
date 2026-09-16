const express = require('express');
const auth = require('../middleware/auth');
const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const enquiryRoutes = require('./enquiry.routes');
const productRoutes = require('./product.routes');
const inventoryRoutes = require('./inventory.routes');
const quotationRoutes = require('./quotation.routes');
const salesOrderRoutes = require('./salesOrder.routes');
const dispatchRoutes = require('./dispatch.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/customers', auth, customerRoutes);
router.use('/enquiries', auth, enquiryRoutes);
router.use('/products', auth, productRoutes);
router.use('/inventory', auth, inventoryRoutes);
router.use('/quotations', auth, quotationRoutes);
router.use('/sales-orders', auth, salesOrderRoutes);
router.use('/dispatches', auth, dispatchRoutes);
router.use('/dashboard', auth, dashboardRoutes);

module.exports = router;
