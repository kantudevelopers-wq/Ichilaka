# 🥤 ZamBrew Ordering System

A complete beverage ordering system with customer ordering, admin dashboard, sales tracking, and WhatsApp integration.

## Features

### Customer App
- Beautiful mobile-friendly ordering interface
- Select drinks with quantities
- Mobile Money payment options (Airtel & MTN Zambia)
- WhatsApp order notification to seller
- Order confirmation with unique ID

### Admin Dashboard
- Secure login system
- **Order Management**: View all orders, confirm payments, cancel orders
- **Sales Tracking**: Daily, monthly, yearly reports
- **Statistics**: Best-selling drinks, revenue trends
- **Refunds**: Cancelled orders automatically recorded as refunds
- **Charts**: Visual sales performance with Chart.js

## Payment Numbers
- **Airtel Money**: 0776036841
- **MTN Mobile Money**: 0767271417

## Setup Instructions

### 1. Install Node.js
Download and install from: https://nodejs.org/

### 2. Install Dependencies
Open terminal in the project folder and run:
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```

### 4. Access the App
- **Customer Ordering**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Default Login**: username: `username`, password: `Careless`

## File Structure
```
zambrew-system/
├── server.js              # Main server file
├── package.json         # Dependencies
├── database/
│   └── zambrew.db       # SQLite database (auto-created)
└── public/
    ├── index.html       # Customer ordering app
    └── admin/
        └── index.html   # Admin dashboard
```

## How It Works

1. Customer places order → Saved to database
2. Order details sent via WhatsApp to seller
3. Seller logs into admin dashboard
4. Seller confirms payment received → marks order as "completed"
5. If order cancelled → marked as "cancelled", amount recorded as refund
6. Dashboard shows real-time sales statistics

## Database Schema

### orders
- order_id (unique)
- customer_name
- customer_phone
- items (JSON)
- total
- payment_method
- payment_number
- status (pending/completed/cancelled)
- created_at

### sales
- order_id
- amount
- type (sale/refund)
- description
- created_at

## Security Notes
- Change default admin password after first login
- Use HTTPS in production
- Keep database file secure
- The balance check is simulated - integrate real Airtel/MTN APIs for production

## Customization
Edit `server.js` to:
- Change payment numbers
- Add more drinks
- Modify admin credentials
- Add more payment methods
