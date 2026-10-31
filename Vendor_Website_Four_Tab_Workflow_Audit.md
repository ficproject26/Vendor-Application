# Vendor Website Four-Module Architecture & Workflow Audit
**Reference Implementation:** `D:\vendor` (Vendor Web Platform)  
**Target Mobile Implementation:** `D:\Integration\Integration\Vendor- Mobile`  
**Audit Mode:** Complete Architectural Blueprint & Implementation Specification  
**Status:** Verified against authoritative frontend pages, backend routes, controllers, and MongoDB schemas.

---

## 1. Executive Summary

This document establishes the authoritative blueprint of four key operational modules within the Vendor Website (`D:\vendor`) to guide future parity implementations in the Vendor Mobile Application (`D:\Integration\Integration\Vendor- Mobile`):

1. **Delivery Partner Module** (`/api/vendor/delivery-partners`)
2. **Subscription & Membership Module** (`/api/vendor/subscriptions`)
3. **Queries & Support Tickets Module** (`/api/vendor/tickets`)
4. **Payment, Sales & Settlements Module** (`/api/vendor/payments/sales` & `/api/vendor/settlements`)

The Vendor Website functions as the reference implementation. The business rules, API payload schemas, database models, and validation logic documented here represent the verified system contracts.

---

## 2. Architecture & Application Topology

### Top-Level Architecture
```
┌────────────────────────────────────────────────────────┐
│             Vendor Web Platform (D:\vendor)            │
│  React (Vite) + TailwindCSS + Axios + WebSocket Client │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (JWT + Bearer)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Shared Vendor Backend (Port 8002)           │
│        Express.js + Mongoose (connect_db) + Redis      │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌───────────────────────┐
│     MongoDB Atlas Cluster    │ │ Razorpay Gateway / S3 │
│         (connect_db)         │ │   Webhooks & Uploads  │
└──────────────────────────────┘ └───────────────────────┘
```

### Shared Global Middleware & Identity
- **Authentication:** `protect` middleware extracts JWT from `Authorization: Bearer <token>`.
- **Tenant Scoping:** Headers `x-business-id` (active selected business ID) and `x-vendor-email` identify tenant context.
- **Parent vs Branch User:** Sub-accounts resolve to `parentUserId = req.user.parentUserId || req.user._id`.
- **Database Connection:** MongoDB Atlas `connect_db` via Mongoose schemas defined in `D:\vendor\backend\models\Schemas.js`.

---

## 3. Delivery Partner Workflow

### Overview
Allows vendors in delivery-capable categories (Products, Food, Daily Needs) to register, assign, update, and manage in-house delivery partners.

### Frontend Implementation
- **Source Files:**
  - `D:\vendor\frontend\src\pages\VendorDashboard.jsx` (lines 3084, 3101, 4151–4285)
  - `D:\vendor\frontend\src\context\DashboardContext.jsx` (line 660)
- **State Handlers:**
  - `deliveryPartners`: List of delivery partner objects.
  - `selectedPartner`: Currently active partner for editing or order assignment.
  - `isPartnerModalOpen`: Boolean controlling the Add/Edit Delivery Partner modal.

### Backend Endpoints & Route Definitions
All routes defined in `D:\vendor\backend\routes\vendorRoutes.js` (lines 138–141) and handled in `vendorController.js`:

| Method | Endpoint | Handler | Description |
|---|---|---|---|
| `GET` | `/api/vendor/delivery-partners` | `getDeliveryPartners` | Returns list of delivery partners scoped to vendor and active business |
| `POST` | `/api/vendor/delivery-partners` | `createDeliveryPartner` | Registers a new delivery personnel |
| `PUT` | `/api/vendor/delivery-partners/:id` | `updateDeliveryPartner` | Updates contact, vehicle, or operational status |
| `DELETE` | `/api/vendor/delivery-partners/:id` | `deleteDeliveryPartner` | Deletes delivery partner record from system |

### Data Model Schema (`DeliveryPartnerSchema`)
Defined in `D:\vendor\backend\models\Schemas.js` (line 439):
```typescript
{
  vendorId: { type: String, required: true },
  businessId: { type: String },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  vehicleType: { type: String, enum: ['Bike', 'Scooter', 'Car', 'Van'], default: 'Bike' },
  vehicleNumber: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'Busy'], default: 'Active' },
  rating: { type: Number, default: 5.0 },
  totalDeliveries: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}
```

### Form Fields & Validation
- **Partner Name:** Required, text, 2 to 60 characters.
- **Mobile Phone:** Required, 10-digit Indian mobile format (`^[6-9]\d{9}$`).
- **Vehicle Type:** Dropdown selector (`Bike`, `Scooter`, `Car`, `Van`).
- **Vehicle Reg Number:** String (e.g. `TN-59-AB-1234`).
- **Status:** Switch (`Active` / `Inactive`).

---

## 4. Subscription & Membership Workflow

### Overview
Manages business plan tiers (`Silver`, `Gold`, `Diamond`), plan pricing, in-app Razorpay payment checkout, instant automated activation, subscription history, and renewal scheduling.

### Frontend Implementation
- **Source Files:**
  - `D:\vendor\frontend\src\pages\business\SubscriptionManagement.jsx` (1,430 lines)
  - `D:\vendor\frontend\src\pages\settings\Membership.jsx`
- **SDK Integration:** Dynamically loads Razorpay checkout (`https://checkout.razorpay.com/v1/checkout.js`).
- **Real-Time Synchronization:** Listens to `wsClient` event `SUBSCRIPTION_UPDATED` for automatic state refresh.

### Backend Endpoints & Route Definitions
Mounted in `server.js` (line 373) under `/api/vendor/subscriptions`:

| Method | Endpoint | Handler | Description |
|---|---|---|---|
| `GET` | `/api/vendor/subscriptions` | `getSubscriptions` | Returns active subscription status, summary counts, config, and Razorpay Key ID |
| `GET` | `/api/vendor/subscriptions/history` | `getSubscriptionHistory` | Filtered transaction log (`this-month`, `last-month`, `custom` dates) |
| `GET` | `/api/vendor/subscriptions/summary` | `getSubscriptionSummary` | Database aggregation of monthly and annual subscription expenses |
| `GET` | `/api/vendor/subscriptions/business/:id` | `getBusinessSubscription` | Checks active plan status for a specific vendor business |
| `POST` | `/api/vendor/subscriptions/create-order` | `createSubscriptionOrder` | Generates verified Razorpay order for specific business |
| `POST` | `/api/vendor/subscriptions/verify-payment` | `verifySubscriptionPayment` | Validates payment signature, activates subscription, logs transaction |
| `POST` | `/api/vendor/subscriptions/webhook` | `handleRazorpayWebhook` | Public endpoint for asynchronous payment confirmation |

### Transaction Flow
```
[Vendor Taps Upgrade Plan]
         │
         ▼
[POST /api/vendor/subscriptions/create-order] ──► (Returns razorpay_order_id & amount)
         │
         ▼
[Razorpay Checkout Sheet Opens]
         │
         ▼
[User Completes Payment] ──► (Generates paymentId, orderId, signature)
         │
         ▼
[POST /api/vendor/subscriptions/verify-payment]
         │
         ▼
[HMAC SHA256 Signature Verified] ──► Status set to 'Active'
         │
         ▼
[WebSocket Broadcasts SUBSCRIPTION_UPDATED] ──► UI updates instantly
```

---

## 5. Queries & Support Tickets Workflow

### Overview
Provides vendors with direct, audited ticketing communications with the Platform Admin for billing issues, order disputes, commission queries, and technical assistance.

### Frontend Implementation
- **Source Files:**
  - `D:\vendor\frontend\src\pages\VendorDashboard.jsx` (lines 2281, 15740–15840)
- **UI Structure:**
  - Support Tickets Drawer with conversation thread view.
  - "Raise Support Ticket" Modal with subject, category, priority, and message fields.

### Backend Endpoints & Route Definitions
Defined in `D:\vendor\backend\routes\vendorRoutes.js` (lines 169–172):

| Method | Endpoint | Handler | Description |
|---|---|---|---|
| `GET` | `/api/vendor/tickets` | `getVendorTickets` | Lists all tickets filed by this vendor |
| `POST` | `/api/vendor/tickets` | `createVendorTicket` | Creates a new support ticket (`TKT-ADM-xxx`) |
| `POST` | `/api/vendor/tickets/:id/reply` | `replyVendorTicket` | Appends a vendor message to ticket conversation |
| `PUT` | `/api/vendor/tickets/:id/status` | `updateTicketStatusForbidden` | Returns HTTP 403 Forbidden (Vendor cannot close own tickets) |

### Database Schema (`SupportTicketSchema`)
Defined in `D:\vendor\backend\models\Schemas.js` (line 786):
```typescript
{
  ticketId: { type: String, unique: true },
  vendorId: { type: String, required: true },
  activeBusinessId: { type: String },
  category: { 
    type: String, 
    enum: ['Order Issue', 'Payment & Settlement', 'Technical Support', 'General Inquiry'],
    default: 'General Inquiry' 
  },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  replies: [{
    sender: { type: String },
    role: { type: String, enum: ['Vendor', 'Admin', 'Support'] },
    text: { type: String },
    time: { type: String }
  }],
  createdAt: { type: Date, default: Date.now }
}
```

---

## 6. Payment, Sales & Settlement Workflow

### Overview
Provides complete reconciliation between customer transactions (Sales Payments) and vendor payouts transferred by platform finance (Admin Settlements).

### Frontend Implementation
- **Source Files:**
  - `D:\vendor\frontend\src\pages\payments\VendorPayments.jsx` (1,624 lines)
- **Two Major Operational Sub-views:**
  - **Tab 1 — Sales Payments:** Itemized customer transactions.
  - **Tab 2 — Admin Settlements:** Vendor bank deposits and platform commission deductions.

### Backend Endpoints & Route Definitions

| Method | Endpoint | Handler | Description |
|---|---|---|---|
| `GET` | `/api/vendor/payments/sales` | `getSalesPayments` | Itemized customer sales with category, status, and duration filters |
| `GET` | `/api/vendor/settlements` | `getVendorSettlements` | Bank payout records with UTR, commission deduction, and status |

### Query Parameters Supported by `getSalesPayments`
- `status`: `'All'`, `'Successful'`, `'Failed'`, `'Hold'`.
- `duration`: `'All'`, `'Today'`, `'This Week'`, `'This Month'`, `'This Year'`, `'Custom'`.
- `startDate` & `endDate`: ISO format strings when duration is `'Custom'`.
- `category`: Category filter (`Products`, `Services`, `Food`, `Daily Needs`, `Stay`, `Travel`, `Jobs`).
- `search`: Order number or customer name string.
- `page` & `limit`: Pagination parameters (default: page 1, limit 20).

### Settlement Data Model Schema (`SettlementSchema`)
Defined in `D:\vendor\backend\models\Schemas.js` (line 487):
```typescript
{
  vendorId: { type: String, required: true },
  settlementId: { type: String, unique: true },
  amount: { type: Number, required: true },          // Gross amount
  commissionDeducted: { type: Number, default: 0 },  // Platform fee
  netPayout: { type: Number, required: true },       // Transferred to bank
  status: { 
    type: String, 
    enum: ['PAID', 'PENDING', 'HOLD', 'CANCELLED', 'FAILED'], 
    default: 'PENDING' 
  },
  bankAccount: {
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  utrNumber: { type: String },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  processedAt: { type: Date }
}
```

---

## 7. Vendor Mobile Implementation Blueprint

To achieve complete parity in the Vendor Mobile Application without duplicating code or creating discrepancies:

1. **Delivery Partners Screen (`DeliveryPartnersScreen.tsx`):**
   - Connect directly to existing `fetchDeliveryPartners()`, `createDeliveryPartner()`, `updateDeliveryPartner()`, `deleteDeliveryPartner()` in `apiService.ts`.
   - Incorporate the 10-digit phone and vehicle validation.
2. **Subscriptions Modal / Screen:**
   - Consume `/api/vendor/subscriptions` and `/summary`.
   - Add Razorpay React Native SDK (`react-native-razorpay`) when native billing is scheduled.
3. **Support Tickets:**
   - Add queries drawer or tab connecting to `/api/vendor/tickets`.
   - Implement simple chat-like list displaying message threads and response sender.
4. **Sales & Settlements View:**
   - Enhance mobile `PaymentsScreen.tsx` to include the dual-tab interface (`Sales` vs `Settlements`).

