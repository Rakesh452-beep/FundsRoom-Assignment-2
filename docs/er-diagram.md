# ER Diagram — Zenitek ERP

```mermaid
erDiagram
    USERS ||--o{ CUSTOMERS : "creates"
    USERS ||--o{ ENQUIRIES : "creates"
    USERS ||--o{ QUOTATIONS : "creates"
    USERS ||--o{ SALES_ORDERS : "creates"
    USERS ||--o{ DISPATCHES : "processes"
    USERS ||--o{ AUDIT_LOGS : "acts"

    CUSTOMERS ||--o{ ENQUIRIES : "has"
    CUSTOMERS ||--o{ QUOTATIONS : "bills"
    CUSTOMERS ||--o{ SALES_ORDERS : "orders"

    ENQUIRIES ||--o{ ENQUIRY_ITEMS : "contains"
    PRODUCTS ||--o{ ENQUIRY_ITEMS : "demanded as"
    PRODUCTS ||--|| INVENTORY : "stocked as"

    ENQUIRIES ||--o| QUOTATIONS : "priced by"
    QUOTATIONS ||--o{ QUOTATION_ITEMS : "contains"
    PRODUCTS ||--o{ QUOTATION_ITEMS : "quoted as"

    QUOTATIONS ||--o| SALES_ORDERS : "converted to"
    SALES_ORDERS ||--o{ SALES_ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : "ordered as"

    SALES_ORDERS ||--o{ DISPATCHES : "dispatched by"
    DISPATCHES ||--o{ DISPATCH_ITEMS : "contains"
    PRODUCTS ||--o{ DISPATCH_ITEMS : "dispatched as"

    SALES_ORDERS ||--o{ AUDIT_LOGS : "audited"
    QUOTATIONS ||--o{ AUDIT_LOGS : "audited"
    DISPATCHES ||--o{ AUDIT_LOGS : "audited"

    USERS {
        int id PK
        string email UK
        string passwordHash
        string name
        Role role
    }
    CUSTOMERS {
        int id PK
        string companyName
        string contactPerson
        string mobile
        string email
        string city
        int createdById FK
    }
    ENQUIRIES {
        int id PK
        string enquiryNumber UK
        int customerId FK
        datetime enquiryDate
        datetime requiredDate
        string notes
        EnquiryStatus status
        int createdById FK
    }
    ENQUIRY_ITEMS {
        int enquiryId PK, FK
        int productId PK, FK
        int quantity
    }
    PRODUCTS {
        int id PK
        string code UK
        string name
        string category
        string unit
        decimal basePrice
    }
    INVENTORY {
        int id PK
        int productId UK, FK
        int physicalQty
        int reservedQty
    }
    QUOTATIONS {
        int id PK
        string quotationNumber UK
        int enquiryId UK, FK
        int customerId FK
        decimal discountPct
        decimal gstPct
        decimal grandTotal
        datetime validUntil
        QuotationStatus status
        int createdById FK
    }
    QUOTATION_ITEMS {
        int quotationId PK, FK
        int productId PK, FK
        int qty
        decimal unitPrice
        decimal lineAmount
    }
    SALES_ORDERS {
        int id PK
        string orderNumber UK
        int quotationId UK, FK
        int customerId FK
        datetime orderDate
        decimal totalAmount
        SalesOrderStatus status
        int createdById FK
    }
    SALES_ORDER_ITEMS {
        int salesOrderId PK, FK
        int productId PK, FK
        int qty
        decimal unitPrice
        decimal lineAmount
    }
    DISPATCHES {
        int id PK
        string dispatchNumber UK
        int salesOrderId UK, FK
        datetime dispatchDate
        string vehicleNo
        string driver
        int processedById FK
    }
    DISPATCH_ITEMS {
        int dispatchId PK, FK
        int productId PK, FK
        int qty
    }
    AUDIT_LOGS {
        int id PK
        int actorId FK
        string action
        string entity
        int entityId
        json before
        json after
        datetime createdAt
    }
```

### Key constraints

- `enquiries.enquiryNumber`, `quotations.quotationNumber`, `sales_orders.orderNumber`,
  `dispatches.dispatchNumber` — **UNIQUE**
- `quotations.enquiryId` — **UNIQUE** (one quotation per enquiry)
- `sales_orders.quotationId` — **UNIQUE** (one sales order per quotation)
- `inventory.productId` — **UNIQUE** (1:1 product inventory)
- Foreign keys `ON DELETE RESTRICT` (no orphans)
- Composite primary keys on all item tables

### Enums

- `Role`: `ADMIN | SALES_USER`
- `EnquiryStatus`: `NEW | QUOTED | WON | LOST`
- `QuotationStatus`: `DRAFT | SENT | ACCEPTED | REJECTED`
- `SalesOrderStatus`: `PENDING | CONFIRMED | DISPATCHED | CANCELLED`