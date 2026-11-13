# SmartBiz Rwanda

**A Business Management and Point of Sale System for Rwandan Businesses**

SmartBiz Rwanda is a web-based business management system designed to help small and medium-sized businesses in Rwanda manage their daily operations from one centralized platform.

The system aims to simplify sales, inventory, purchasing, customer management, supplier management, expenses, cash-register operations, reporting, and employee administration.

---

## 1. Project Overview

### Project Name
SmartBiz Rwanda

### Project Type
Web-based Business Management System (BMS) with Point of Sale (POS) functionality.

### Main Goal
To provide businesses in Rwanda with an organized, accessible, and reliable system for managing business operations, tracking transactions, monitoring stock, and making informed business decisions.

### Target Users
- Retail shops
- Supermarkets and mini-markets
- Wholesalers and distributors
- Small and medium-sized enterprises (SMEs)
- Other businesses that need sales and inventory management

### Core Objectives
- Simplify daily business operations.
- Improve sales and transaction management.
- Monitor inventory and stock movements.
- Manage customers and suppliers.
- Track business expenses and purchases.
- Support employee and role management.
- Provide useful business reports.
- Improve accountability and financial visibility.
- Provide an accessible interface across desktop, tablet, and mobile devices.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 |
| Styling | CSS3 |
| Frontend logic | Vanilla JavaScript |
| Backend runtime | Node.js |
| Backend framework | Express.js |
| Database | MySQL |
| Database communication | mysql2 |
| Authentication | JSON Web Tokens (JWT) |
| Password security | bcryptjs |
| Configuration | dotenv |
| Security middleware | Helmet |
| Cross-origin requests | CORS |
| Development | Visual Studio Code, Git, npm |

The project uses a separate frontend and backend architecture. The frontend communicates with the backend through REST API endpoints.

---

## 3. System Architecture

SmartBiz Rwanda follows a three-layer architecture.

### 3.1 Presentation Layer
The frontend is responsible for:
- Displaying application pages.
- Collecting user input.
- Validating forms.
- Displaying business information.
- Managing interactive components.
- Communicating with backend services.
- Adapting layouts to different screen sizes.

### 3.2 Application Layer
The backend is responsible for:
- Authentication and authorization.
- Business and employee management.
- Business-specific data access.
- Processing sales and purchases.
- Managing inventory and stock movements.
- Handling expenses and other transactions.
- Validating requests.
- Returning structured API responses.

### 3.3 Database Layer
MySQL stores application information, including:
- User accounts.
- Businesses.
- Employees.
- Products and categories.
- Inventory records.
- Customers and suppliers.
- Purchases and purchase items.
- Sales and sale items.
- Payments.
- Cash registers.
- Expenses.
- Returns.
- Stock movements.
- Audit logs.

### General Architecture

```text
                  SMARTBIZ RWANDA
                         |
             +-----------+-----------+
             |                       |
        FRONTEND                  BACKEND
       HTML/CSS/JS             Node.js/Express
             |                       |
             |       REST API        |
             +-----------------------+
                         |
                    MySQL Database
                         |
                Business Information
```

---

## 4. User Roles and Access Control

SmartBiz supports business-level role management.

| Role | Main Responsibilities |
|---|---|
| Owner | Oversees business operations and manages business settings and users. |
| Manager | Supervises business activities and manages authorized operations. |
| Cashier | Handles point-of-sale transactions and permitted customer operations. |
| Stock Manager | Handles products, categories, inventory, and stock-related operations. |
| System Administrator | Platform-level administration, separate from ordinary business membership. |

Access to protected operations is controlled through authentication, business membership, and role-based authorization.

Actual permissions are determined by the backend authorization rules.

---

## 5. Main System Modules

### 5.1 Authentication and Account Management
- User registration.
- User login.
- Forgot-password interface.
- Session and token management.
- Protected application pages.
- Business membership validation.

### 5.2 Business Dashboard
- Business overview.
- Sales summaries.
- Revenue information.
- Inventory indicators.
- Business performance information.

### 5.3 Point of Sale (POS)
- Search available products.
- Add products to a shopping cart.
- Adjust product quantities.
- Select customers.
- Apply discounts and taxes.
- Select payment methods.
- Record full or partial payments.
- Support credit transactions.
- Complete sales and update stock through backend transactions.

### 5.4 Sales Management
- View sales history.
- Search and filter sales.
- Review payment statuses.
- View individual sale details.
- Inspect sale items and payment records.
- Print sale details.

### 5.5 Product Management
- Register products.
- Update product information.
- Assign products to categories.
- Manage product prices.
- Manage product identifiers such as SKU and barcode.
- Activate or deactivate products.

### 5.6 Category Management
- Create categories.
- Update category information.
- View category records.
- Manage category status.
- Associate products with categories.

### 5.7 Inventory Management
- Monitor stock quantities.
- Track stock movements.
- Identify low-stock products.
- Monitor inventory information.
- Maintain consistency between purchases, sales, and inventory.

### 5.8 Customer Management
- Register customers.
- Update customer information.
- View customer details.
- Manage customer status.
- Review customer transaction history.

### 5.9 Supplier Management
- Register suppliers.
- Update supplier information.
- Manage supplier status.
- View supplier purchase history.

### 5.10 Purchase Management
- Record purchases.
- Manage purchase items.
- Track purchase status.
- Receive purchases.
- Update inventory when purchases are received.

### 5.11 Expense Management
- Record business expenses.
- Categorize expenses.
- Track expense amounts.
- Record payment methods.
- Review expense information.

### 5.12 Cash Register Management
Planned functionality includes:
- Opening a cash register.
- Recording the opening balance.
- Associating sales with register sessions.
- Calculating expected cash.
- Recording the actual closing balance.
- Calculating cash differences.
- Closing register sessions.
- Reviewing register history.

### 5.13 Returns Management
- Record product returns.
- Associate returns with original sales.
- Track return status.
- Manage refund information.
- Maintain inventory consistency.

### 5.14 Reports and Analytics
- Sales reports.
- Revenue summaries.
- Inventory reports.
- Purchase reports.
- Expense reports.
- Business performance summaries.

### 5.15 Employee Management
- Register employees.
- Assign business roles.
- Manage employee status.
- View employee information.

### 5.16 Settings
The settings module is intended to manage:
- Business information.
- Regional preferences.
- Tax configuration.
- Receipt and invoice preferences.

### 5.17 Profile Management
The profile module is intended to provide:
- Account information.
- User profile details.
- Business membership information.
- Account security options.

### 5.18 Notifications
The notification module is intended to communicate important business and system updates to authorized users.

---

## 6. Database Design

**Database name:** `smartbiz_rwanda`

The database currently contains 19 main tables.

| Table | Purpose |
|---|---|
| `users` | Stores user account information. |
| `businesses` | Stores registered businesses. |
| `employees` | Connects users to business employee roles. |
| `categories` | Stores product categories. |
| `products` | Stores product information. |
| `inventory` | Stores inventory quantities. |
| `stock_movements` | Tracks stock changes. |
| `customers` | Stores customer information. |
| `suppliers` | Stores supplier information. |
| `purchases` | Stores purchase transactions. |
| `purchase_items` | Stores individual purchase items. |
| `sales` | Stores sales transactions. |
| `sale_items` | Stores individual sale items. |
| `payments` | Stores payment and refund records. |
| `cash_registers` | Stores cash-register sessions. |
| `expenses` | Stores business expenses. |
| `returns` | Stores product return transactions. |
| `return_items` | Stores individual returned items. |
| `audit_logs` | Stores system activity records. |

### Database Design Principles
- Relational database structure.
- Primary and foreign key relationships.
- Business-specific data ownership.
- Transactional operations where required.
- Data validation through database constraints.
- Monetary values stored using decimal data types.
- Stock movements recorded for inventory tracking.

### Database Files

```text
database/
├── backups/
├── migrations/
├── procedures/
├── views/
├── README.md
├── schema.sql
└── seed.sql
```

`schema.sql` contains the database structure.

`seed.sql` is currently empty. No demonstration records should be treated as real business data.

---

## 7. Project Directory Structure

The project is organized into separate frontend, backend, database, and deployment areas.

```text
SmartBiz-Rwanda/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   │
│   ├── tests/
│   │   ├── api/
│   │   ├── integration/
│   │   └── unit/
│   │
│   ├── package.json
│   └── ...
│
├── database/
│   ├── backups/
│   ├── migrations/
│   ├── procedures/
│   ├── views/
│   ├── README.md
│   ├── schema.sql
│   └── seed.sql
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   │   ├── components/
│   │   ├── config/
│   │   ├── pages/
│   │   └── services/
│   │
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── forgot-password.html
│   ├── dashboard.html
│   ├── pos.html
│   ├── products.html
│   ├── categories.html
│   ├── inventory.html
│   ├── customers.html
│   ├── customer-details.html
│   ├── suppliers.html
│   ├── purchases.html
│   ├── purchase-details.html
│   ├── sales.html
│   ├── sale-details.html
│   ├── cash-register.html
│   ├── debts.html
│   ├── expenses.html
│   ├── returns.html
│   ├── reports.html
│   ├── employees.html
│   ├── settings.html
│   └── profile.html
│
├── deployment/
│
└── README.md
```

This is a guide to the intended organization. Individual files and modules may still be under development.

---

## 8. Backend API

The backend exposes REST API endpoints under:

```text
http://localhost:5000/api/v1
```

The API is organized into business modules, including:

- Authentication
- Business management
- Users and employees
- Products and categories
- Inventory
- Customers and suppliers
- Purchases
- Sales
- Payments
- Cash registers
- Expenses
- Returns
- Reports
- Notifications

The backend uses authentication middleware, tenant checks, and role authorization to protect business operations.

### API Response Convention

A typical successful response uses a structure similar to:

```json
{
  "status": "success",
  "message": "Operation completed successfully.",
  "data": {}
}
```

Actual response fields depend on the specific endpoint.

---

## 9. Installation and Setup

### Prerequisites

Install the following tools:

1. Node.js and npm.
2. MySQL Server.
3. MySQL Workbench (optional, but useful for database management).
4. Visual Studio Code.
5. Git.

### Step 1: Clone or Open the Project

Open the existing project directory:

```powershell
cd D:\PROJECTS\SmartBiz-Rwanda
```

### Step 2: Install Backend Dependencies

```powershell
cd backend
npm install
```

### Step 3: Configure Environment Variables

Configure the backend environment variables in the existing `.env` file.

The configuration must include the database connection settings and authentication secrets required by the backend.

Do not commit real passwords, database credentials, or JWT secrets to Git.

Use the existing environment configuration in the project as the reference for required variable names.

### Step 4: Create the Database

Create a MySQL database named:

```sql
CREATE DATABASE smartbiz_rwanda;
```

Import the database structure from:

```text
database/schema.sql
```

This can be done through MySQL Workbench or the MySQL command-line client.

### Step 5: Start the Backend

From the backend directory:

```powershell
npm run dev
```

The backend is configured to run on:

```text
http://localhost:5000
```

The API base URL is:

```text
http://localhost:5000/api/v1
```

### Step 6: Start the Frontend

Open the `frontend` directory in Visual Studio Code.

Use the VS Code Live Server extension or another local static web server to serve the frontend.

Open the appropriate frontend page through that server.

The frontend API configuration is maintained in:

```text
frontend/js/config/api.js
```

The current local API configuration is:

```javascript
window.SMARTBIZ_CONFIG = {
    API_BASE_URL: "http://localhost:5000/api/v1"
};
```

---

## 10. Authentication and Security

Security is an important part of SmartBiz Rwanda.

The application uses:
- JWT-based authentication.
- Password hashing with bcryptjs.
- Protected API routes.
- Business tenant validation.
- Role-based authorization.
- Environment-based configuration.
- Helmet security middleware.
- CORS configuration.
- Server-side validation.
- Database constraints and transactional operations.

### Frontend Session Information

The frontend currently uses:

```text
sessionStorage.smartbiz_token
sessionStorage.smartbiz_membership
```

The membership information contains business context, including the business ID, role, business status, and membership status.

Frontend checks improve the user experience, but backend authorization remains the security boundary.

---

## 11. Responsive Design and User Experience

SmartBiz Rwanda is designed to support:

- Desktop computers.
- Laptops.
- Tablets.
- Mobile phones.

The interface uses shared layout and component styles to maintain consistency across the application.

Important responsive requirements include:
- Sidebar navigation on larger screens.
- Mobile navigation and drawer behavior.
- Responsive dashboards and summary cards.
- Adaptable forms and modals.
- Scrollable data tables where necessary.
- No unintended horizontal page overflow.
- Readable content at different viewport widths.
- Consistent spacing and navigation across modules.

Every new page and every existing module must be checked at desktop, tablet, and mobile sizes.

---

## 12. Development Status

SmartBiz Rwanda is under active development.

The project already has its main architecture, database structure, authentication foundation, and several frontend and backend modules.

Some modules have working functionality, while others still require backend implementation, frontend integration, or further testing.

### Remaining Development Priorities

1. Complete POS checkout behavior and integration.
2. Implement Cash Register backend and frontend integration.
3. Complete employee management.
4. Complete returns processing.
5. Complete settings functionality.
6. Complete notifications.
7. Review and finish unfinished dashboard, reports, debts, and other business modules.
8. Revisit and complete Profile management.
9. Verify all frontend pages against their backend services.
10. Perform complete security, integration, and responsive testing.

### Integration Requirements

Every module must be connected correctly:

```text
HTML Page
    |
    v
CSS Styles
    |
    v
Frontend JavaScript
    |
    v
Frontend Service
    |
    v
Backend API Route
    |
    v
Controller
    |
    v
Service / Business Logic
    |
    v
MySQL Database
```

Navigation links, permissions, API endpoints, and related business workflows must remain consistent.

---

## 13. Testing Strategy

Testing should cover the following areas.

### Authentication Testing
- Registration.
- Login.
- Invalid credentials.
- Expired sessions.
- Protected pages.
- Membership validation.

### Functional Testing
- Product creation and updates.
- Category management.
- Inventory changes.
- Customer management.
- Supplier management.
- Purchase processing.
- POS checkout.
- Sales history.
- Payment calculations.
- Cash-register sessions.
- Expense management.
- Returns processing.
- Reports.

### Security Testing
- Authentication enforcement.
- Role permissions.
- Business data isolation.
- Input validation.
- Unauthorized access prevention.
- Transaction rollback behavior.

### Responsive Testing
Test every major page at:
- Desktop resolutions.
- Laptop resolutions.
- Tablet resolutions.
- Small mobile resolutions.
- Larger mobile resolutions.

### Database Testing
- Foreign key relationships.
- Primary key constraints.
- Business data isolation.
- Transaction consistency.
- Inventory accuracy.
- Financial calculations.

---

## 14. Important Development Rules

To maintain project quality:

1. Preserve the existing project directory structure.
2. Avoid creating duplicate files or unnecessary folders.
3. Use the existing shared CSS and JavaScript components.
4. Keep HTML, CSS, and JavaScript separated.
5. Use the existing API configuration and authentication service.
6. Do not invent backend endpoints or database columns.
7. Verify backend request and response structures before integrating frontend actions.
8. Enforce business-level data isolation.
9. Keep the interface responsive on all screen sizes.
10. Do not insert fake business records into the production database.
11. Maintain consistent navigation and styling across modules.
12. Test complete workflows rather than isolated pages.

---

## 15. Future Improvements

Possible future improvements include:

- Barcode scanner integration.
- Receipt printing improvements.
- Advanced sales analytics.
- Exportable PDF and Excel reports.
- Business performance dashboards.
- Multi-branch support, subject to the final database and business requirements.
- Improved notification workflows.
- Automated database backups.
- More comprehensive audit reporting.
- Deployment to a secure production hosting environment.

These are future enhancements and should not be considered completed features.

---

## 16. Project Vision

The long-term vision of SmartBiz Rwanda is to become a reliable and practical business management platform that helps Rwandan businesses organize their operations, improve accountability, monitor their performance, and manage daily transactions more effectively.

The system is being developed with particular attention to usability, data integrity, security, maintainability, and responsive design.

---

**Project:** SmartBiz Rwanda  
**Architecture:** Frontend + REST API Backend + MySQL  
**Frontend:** HTML, CSS, JavaScript  
**Backend:** Node.js and Express.js  
**Database:** MySQL  
**Development Status:** In Progress
