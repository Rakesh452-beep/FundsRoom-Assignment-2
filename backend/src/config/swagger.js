// OpenAPI 3.0 specification for the Zenitek ERP API.
// Served interactively by swagger-ui-express at /api-docs.
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Zenitek ERP API',
    version: '1.0.0',
    description:
      'Web-based ERP for a manufacturing & supply pipeline: **Customer Enquiry -> Quotation -> ' +
      'Sales Order -> Inventory Reservation -> Dispatch**.\n\n' +
      '- JWT Bearer auth with two roles (`ADMIN`, `SALES_USER`)\n' +
      '- Backend-computed quotation totals (client-provided totals are ignored)\n' +
      '- Transactional, concurrency-safe inventory reservation (row-locking + CHECK constraint)\n' +
      '- Audit trail captured for every status change / convert / confirm / dispatch\n\n' +
      'Use **Authorize** to log in, then call `/api/auth/login` (or paste a token).',
    contact: { name: 'Zenitek ERP' },
  },
  servers: [{ url: 'http://localhost:8080/api', description: 'Local development' }],
  tags: [
    { name: 'Auth', description: 'Login and current user' },
    { name: 'Customers', description: 'Customer master' },
    { name: 'Enquiries', description: 'Customer enquiries' },
    { name: 'Products', description: 'Product master' },
    { name: 'Inventory', description: 'Stock levels and adjustments' },
    { name: 'Quotations', description: 'Quotations with PDF and convert-to-SO' },
    { name: 'Sales Orders', description: 'Sales orders, confirm / dispatch / cancel' },
    { name: 'Dispatches', description: 'Dispatch records' },
    { name: 'Dashboard', description: 'Analytics summary' },
    { name: 'System', description: 'Health check' },
  ],
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'Service is up',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email + password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: { email: 'admin@erp.com', password: 'admin123' },
            },
          },
        },
        responses: {
          200: {
            description: 'JWT token + user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user (from token)',
        responses: {
          200: { description: 'Logged-in user', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserEnvelope' } } } },
        },
      },
    },
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'List customers',
        responses: {
          200: { description: 'Customers', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerList' } } } },
        },
      },
      post: {
        tags: ['Customers'],
        summary: 'Create a customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerInput' },
              example: { companyName: 'Orbit Fabricators', contactPerson: 'Meena Iyer', mobile: '9123456780', email: 'meena@orbitfab.com', city: 'Mumbai' },
            },
          },
        },
        responses: {
          201: { description: 'Created customer', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerEnvelope' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Customer detail (with enquiries)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Customer', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerEnvelope' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/enquiries': {
      get: {
        tags: ['Enquiries'],
        summary: 'List enquiries (filter by status / search / paginate)',
        parameters: [
          { $ref: '#/components/parameters/StatusQuery' },
          { $ref: '#/components/parameters/SearchQuery' },
          { $ref: '#/components/parameters/PageQuery' },
          { $ref: '#/components/parameters/LimitQuery' },
        ],
        responses: {
          200: { description: 'Enquiries', content: { 'application/json': { schema: { $ref: '#/components/schemas/EnquiryList' } } } },
        },
      },
      post: {
        tags: ['Enquiries'],
        summary: 'Create enquiry with items (existing customer id OR inline customer)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EnquiryInput' },
              example: { customer: { id: 1 }, items: [{ productId: 1, quantity: 20 }], requiredDate: '2026-10-15', notes: 'Urgent requirement' },
            },
          },
        },
        responses: {
          201: { description: 'Created enquiry', content: { 'application/json': { schema: { $ref: '#/components/schemas/EnquiryEnvelope' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/enquiries/{id}': {
      get: {
        tags: ['Enquiries'],
        summary: 'Enquiry detail incl. items and linked quotation',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Enquiry', content: { 'application/json': { schema: { $ref: '#/components/schemas/EnquiryEnvelope' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/enquiries/{id}/status': {
      patch: {
        tags: ['Enquiries'],
        summary: 'Update enquiry status',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EnquiryStatusInput' },
              example: { status: 'NEW' },
            },
          },
        },
        responses: {
          200: { description: 'Updated enquiry', content: { 'application/json': { schema: { $ref: '#/components/schemas/EnquiryEnvelope' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List product master (with inventory)',
        responses: {
          200: { description: 'Products', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductList' } } } },
        },
      },
    },
    '/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'List inventory (physical / reserved / available)',
        responses: {
          200: { description: 'Inventory', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryList' } } } },
        },
      },
    },
    '/inventory/{productId}': {
      patch: {
        tags: ['Inventory'],
        summary: 'Adjust inventory quantity by delta (ADMIN)',
        parameters: [{ $ref: '#/components/parameters/ProductIdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InventoryAdjust' },
              example: { quantity: -10 },
            },
          },
        },
        responses: {
          200: { description: 'Updated inventory', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryEnvelope' } } } },
          400: { description: 'Insufficient stock / validation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden — requires ADMIN', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/quotations': {
      get: {
        tags: ['Quotations'],
        summary: 'List quotations',
        parameters: [
          { $ref: '#/components/parameters/StatusQuery' },
          { $ref: '#/components/parameters/PageQuery' },
          { $ref: '#/components/parameters/LimitQuery' },
        ],
        responses: {
          200: { description: 'Quotations', content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationList' } } } },
        },
      },
      post: {
        tags: ['Quotations'],
        summary: 'Create quotation — totals are computed on the backend (client totals ignored)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuotationInput' },
              example: { enquiryId: 2, items: [{ productId: 1, qty: 20, unitPrice: 55000 }], discountPct: 5, gstPct: 18, validUntil: '2026-10-31' },
            },
          },
        },
        responses: {
          201: { description: 'Created quotation', content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationEnvelope' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/quotations/{id}': {
      get: {
        tags: ['Quotations'],
        summary: 'Quotation detail + items + audit logs',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Quotation', content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationEnvelope' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/quotations/{id}/status': {
      patch: {
        tags: ['Quotations'],
        summary: 'Update quotation status (DRAFT -> SENT -> ACCEPTED/REJECTED)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuotationStatusInput' },
              example: { status: 'ACCEPTED' },
            },
          },
        },
        responses: {
          200: { description: 'Updated quotation', content: { 'application/json': { schema: { $ref: '#/components/schemas/QuotationEnvelope' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/quotations/{id}/pdf': {
      get: {
        tags: ['Quotations'],
        summary: 'Generate quotation PDF',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'PDF document', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/quotations/{id}/convert': {
      post: {
        tags: ['Quotations'],
        summary: 'Convert ACCEPTED quotation to a sales order',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          201: { description: 'Created sales order', content: { 'application/json': { schema: { $ref: '#/components/schemas/SalesOrderEnvelope' } } } },
          400: { description: 'QUOTATION_NOT_ACCEPTED', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'SALES_ORDER_EXISTS — duplicate convert', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/sales-orders': {
      get: {
        tags: ['Sales Orders'],
        summary: 'List sales orders',
        parameters: [
          { $ref: '#/components/parameters/StatusQuery' },
          { $ref: '#/components/parameters/PageQuery' },
          { $ref: '#/components/parameters/LimitQuery' },
        ],
        responses: {
          200: { description: 'Sales orders', content: { 'application/json': { schema: { $ref: '#/components/schemas/SalesOrderList' } } } },
        },
      },
    },
    '/sales-orders/{id}': {
      get: {
        tags: ['Sales Orders'],
        summary: 'Sales order detail + items + inventory + dispatches',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Sales order', content: { 'application/json': { schema: { $ref: '#/components/schemas/SalesOrderEnvelope' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/sales-orders/{id}/confirm': {
      post: {
        tags: ['Sales Orders'],
        summary: 'Confirm & reserve inventory (ADMIN, transactional)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Inventory reserved', content: { 'application/json': { schema: { $ref: '#/components/schemas/SalesOrderEnvelope' } } } },
          400: { description: 'INSUFFICIENT_STOCK or wrong state', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden — requires ADMIN', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/sales-orders/{id}/dispatch': {
      post: {
        tags: ['Sales Orders'],
        summary: 'Dispatch confirmed sales order (ADMIN, transactional)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DispatchInput' },
              example: { vehicleNo: 'MH-12-AB-1234', driver: 'Test Driver' },
            },
          },
        },
        responses: {
          201: { description: 'Dispatch created', content: { 'application/json': { schema: { $ref: '#/components/schemas/DispatchEnvelope' } } } },
          400: { description: 'INSUFFICIENT_STOCK / not CONFIRMED', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Already dispatched', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden — requires ADMIN', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/sales-orders/{id}/cancel': {
      post: {
        tags: ['Sales Orders'],
        summary: 'Cancel sales order, release reservation (ADMIN)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Sales order cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/SalesOrderEnvelope' } } } },
          400: { description: 'Cannot cancel dispatched order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Forbidden — requires ADMIN', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/dispatches': {
      get: {
        tags: ['Dispatches'],
        summary: 'Recent dispatch records',
        responses: {
          200: { description: 'Dispatches', content: { 'application/json': { schema: { $ref: '#/components/schemas/DispatchList' } } } },
        },
      },
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Analytics summary (funnel, revenue, top products, alerts)',
        responses: {
          200: { description: 'Dashboard summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/DashboardEnvelope' } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token from POST /auth/login',
      },
    },
    parameters: {
      IdParam: { name: 'id', in: 'path', required: true, description: 'Primary key', schema: { type: 'integer', minimum: 1 } },
      ProductIdParam: { name: 'productId', in: 'path', required: true, description: 'Product primary key', schema: { type: 'integer', minimum: 1 } },
      StatusQuery: { name: 'status', in: 'query', description: 'Filter by status', schema: { type: 'string' } },
      SearchQuery: { name: 'search', in: 'query', description: 'Full-text search term', schema: { type: 'string' } },
      PageQuery: { name: 'page', in: 'query', description: 'Page number', schema: { type: 'integer', minimum: 1, default: 1 } },
      LimitQuery: { name: 'limit', in: 'query', description: 'Page size', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: { success: { type: 'boolean', example: true }, data: { type: 'object' } },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          code: { type: 'string', example: 'INSUFFICIENT_STOCK' },
          message: { type: 'string', example: 'Not enough stock to reserve' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@erp.com' },
          password: { type: 'string', minLength: 6, example: 'admin123' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'SALES_USER'] },
        },
      },
      UserEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOi...' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          companyName: { type: 'string' },
          contactPerson: { type: 'string' },
          mobile: { type: 'string' },
          email: { type: 'string', format: 'email' },
          city: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CustomerInput: {
        type: 'object',
        required: ['companyName', 'contactPerson', 'mobile'],
        properties: {
          companyName: { type: 'string', minLength: 2 },
          contactPerson: { type: 'string', minLength: 2 },
          mobile: { type: 'string', minLength: 7, maxLength: 15 },
          email: { type: 'string', format: 'email' },
          city: { type: 'string' },
        },
      },
      CustomerEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Customer' } },
      },
      CustomerList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string', example: 'RM-001' },
          name: { type: 'string' },
          category: { type: 'string' },
          unit: { type: 'string' },
          basePrice: { type: 'number', format: 'double' },
        },
      },
      ProductList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
        },
      },
      Inventory: {
        type: 'object',
        properties: {
          productId: { type: 'integer' },
          product: { $ref: '#/components/schemas/Product' },
          physicalQty: { type: 'integer' },
          reservedQty: { type: 'integer' },
          availableQty: { type: 'integer' },
          lowStock: { type: 'boolean' },
        },
      },
      InventoryEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Inventory' } },
      },
      InventoryAdjust: {
        type: 'object',
        required: ['quantity'],
        properties: { quantity: { type: 'integer', description: 'Signed delta, e.g. -10 or +25', example: -10 } },
      },
      InventoryList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } },
        },
      },
      EnquiryItemInput: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'integer' },
          quantity: { type: 'integer', minimum: 1 },
        },
      },
      EnquiryInput: {
        type: 'object',
        required: ['customer', 'items'],
        properties: {
          customer: {
            oneOf: [
              { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
              { $ref: '#/components/schemas/CustomerInput' },
            ],
            description: 'Existing customer id OR full inline customer details',
          },
          items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/EnquiryItemInput' } },
          enquiryDate: { type: 'string', format: 'date' },
          requiredDate: { type: 'string', format: 'date' },
          notes: { type: 'string' },
        },
      },
      Enquiry: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          enquiryNumber: { type: 'string', example: 'ENQ-202609-0001' },
          status: { type: 'string', enum: ['NEW', 'QUOTED', 'WON', 'LOST'] },
          enquiryDate: { type: 'string', format: 'date-time' },
          requiredDate: { type: 'string', format: 'date' },
          notes: { type: 'string' },
        },
      },
      EnquiryEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Enquiry' } },
      },
      EnquiryStatusInput: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['NEW', 'QUOTED', 'WON', 'LOST'] } },
      },
      EnquiryList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Enquiry' } },
        },
      },
      QuotationItemInput: {
        type: 'object',
        required: ['productId', 'qty', 'unitPrice'],
        properties: {
          productId: { type: 'integer' },
          qty: { type: 'integer', minimum: 1 },
          unitPrice: { type: 'number', minimum: 0 },
        },
      },
      QuotationInput: {
        type: 'object',
        required: ['enquiryId', 'items'],
        properties: {
          enquiryId: { type: 'integer' },
          items: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/QuotationItemInput' } },
          discountPct: { type: 'number', minimum: 0, maximum: 100, default: 0 },
          gstPct: { type: 'number', minimum: 0, maximum: 100, default: 18 },
          validUntil: { type: 'string', format: 'date' },
          grandTotal: { type: 'number', description: 'Ignored — totals are backend-computed' },
        },
      },
      Quotation: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          quotationNumber: { type: 'string', example: 'QT-202609-0001' },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] },
          discountPct: { type: 'number' },
          gstPct: { type: 'number' },
          grandTotal: { type: 'number', format: 'double', description: 'Authoritative total' },
          validUntil: { type: 'string', format: 'date' },
        },
      },
      QuotationEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Quotation' } },
      },
      QuotationStatusInput: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'] } },
      },
      QuotationList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Quotation' } },
        },
      },
      SalesOrder: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          orderNumber: { type: 'string', example: 'SO-202609-0001' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'] },
          totalAmount: { type: 'number', format: 'double' },
          orderDate: { type: 'string', format: 'date-time' },
        },
      },
      SalesOrderEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/SalesOrder' } },
      },
      SalesOrderList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/SalesOrder' } },
        },
      },
      DispatchInput: {
        type: 'object',
        required: ['vehicleNo'],
        properties: {
          vehicleNo: { type: 'string', minLength: 1, example: 'MH-12-AB-1234' },
          driver: { type: 'string', example: 'Test Driver' },
        },
      },
      Dispatch: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          dispatchNumber: { type: 'string', example: 'DISP-202609-0001' },
          dispatchDate: { type: 'string', format: 'date-time' },
          vehicleNo: { type: 'string' },
          driver: { type: 'string' },
        },
      },
      DispatchEnvelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Dispatch' } },
      },
      DispatchList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Dispatch' } },
        },
      },
      DashboardEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', description: 'Funnel counts, revenue, top products, low-stock alerts' },
        },
      },
    },
  },
};