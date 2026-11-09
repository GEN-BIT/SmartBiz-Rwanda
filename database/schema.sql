USE smartbiz_rwanda;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;



CREATE TABLE businesses (
    business_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(80),
    tin_number VARCHAR(30),
    phone VARCHAR(20),
    email VARCHAR(150),
    address VARCHAR(255),
    province VARCHAR(100),
    district VARCHAR(100),
    sector VARCHAR(100),
    currency CHAR(3) NOT NULL DEFAULT 'RWF',
    status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_business_tin (tin_number),
    KEY idx_business_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE employees (
    employee_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM(
        'owner',
        'manager',
        'cashier',
        'stock_manager'
    ) NOT NULL DEFAULT 'cashier',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    hired_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_employee_business_user (business_id, user_id),
    UNIQUE KEY uq_employee_business_id (business_id, employee_id),

    CONSTRAINT fk_employee_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id),

    CONSTRAINT fk_employee_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    KEY idx_employee_role (business_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE categories (
    category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_category_business_id (business_id, category_id),
    UNIQUE KEY uq_category_name (business_id, category_name),

    CONSTRAINT fk_category_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE products (
    product_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED,
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(80),
    barcode VARCHAR(100),
    description TEXT,
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(30) NOT NULL DEFAULT 'piece',
    reorder_level DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_product_business_id (business_id, product_id),
    UNIQUE KEY uq_product_sku (business_id, sku),
    UNIQUE KEY uq_product_barcode (business_id, barcode),

    CONSTRAINT fk_product_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id),

    CONSTRAINT fk_product_category
        FOREIGN KEY (business_id, category_id)
        REFERENCES categories(business_id, category_id),

    CHECK (cost_price >= 0),
    CHECK (selling_price >= 0),
    CHECK (reorder_level >= 0),

    KEY idx_product_name (business_id, product_name),
    KEY idx_product_status (business_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE customers (
    customer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    address VARCHAR(255),
    credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_customer_business_id (business_id, customer_id),

    CONSTRAINT fk_customer_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id),

    CHECK (credit_limit >= 0),

    KEY idx_customer_name (business_id, customer_name),
    KEY idx_customer_phone (business_id, phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE suppliers (
    supplier_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    address VARCHAR(255),
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_supplier_business_id (business_id, supplier_id),

    CONSTRAINT fk_supplier_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id),

    KEY idx_supplier_name (business_id, supplier_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE inventory (
    inventory_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL DEFAULT 0.000,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_inventory_product (business_id, product_id),

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (business_id, product_id)
        REFERENCES products(business_id, product_id),

    CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE stock_movements (
    movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED,
    movement_type ENUM(
        'opening_stock',
        'purchase',
        'sale',
        'sale_return',
        'purchase_return',
        'adjustment',
        'damage',
        'expired'
    ) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT UNSIGNED,
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movement_product
        FOREIGN KEY (business_id, product_id)
        REFERENCES products(business_id, product_id),

    CONSTRAINT fk_movement_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CHECK (quantity > 0),

    KEY idx_movement_product_date (business_id, product_id, created_at),
    KEY idx_movement_reference (business_id, reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE cash_registers (
    register_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(15,2),
    expected_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    notes VARCHAR(255),

    UNIQUE KEY uq_register_business_id (business_id, register_id),

    CONSTRAINT fk_register_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CHECK (opening_balance >= 0),

    KEY idx_register_status (business_id, status, opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

  
CREATE TABLE sales (
    sale_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED,
    employee_id BIGINT UNSIGNED NOT NULL,
    register_id BIGINT UNSIGNED,
    invoice_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('unpaid', 'partial', 'paid', 'refunded')
        NOT NULL DEFAULT 'unpaid',
    sale_status ENUM('completed', 'cancelled', 'returned')
        NOT NULL DEFAULT 'completed',
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_sale_business_id (business_id, sale_id),
    UNIQUE KEY uq_sale_invoice (business_id, invoice_number),

    CONSTRAINT fk_sale_customer
        FOREIGN KEY (business_id, customer_id)
        REFERENCES customers(business_id, customer_id),

    CONSTRAINT fk_sale_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CONSTRAINT fk_sale_register
        FOREIGN KEY (business_id, register_id)
        REFERENCES cash_registers(business_id, register_id),

    CHECK (subtotal >= 0),
    CHECK (discount_amount >= 0),
    CHECK (tax_amount >= 0),
    CHECK (total_amount >= 0),
    CHECK (amount_paid >= 0),
    CHECK (balance_due >= 0),

    KEY idx_sales_date (business_id, created_at),
    KEY idx_sales_customer (business_id, customer_id),
    KEY idx_sales_employee (business_id, employee_id),
    KEY idx_sales_status (business_id, sale_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE sale_items (
    sale_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_item_sale
        FOREIGN KEY (business_id, sale_id)
        REFERENCES sales(business_id, sale_id),

    CONSTRAINT fk_sale_item_product
        FOREIGN KEY (business_id, product_id)
        REFERENCES products(business_id, product_id),

    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (unit_cost >= 0),
    CHECK (discount_amount >= 0),
    CHECK (subtotal >= 0),

    KEY idx_sale_items_sale (business_id, sale_id),
    KEY idx_sale_items_product (business_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED,
    customer_id BIGINT UNSIGNED,
    employee_id BIGINT UNSIGNED,
    amount DECIMAL(15,2) NOT NULL,
    payment_method ENUM(
        'cash',
        'mobile_money',
        'bank_transfer',
        'card',
        'credit',
        other
    ) NOT NULL DEFAULT 'cash',
    transaction_reference VARCHAR(100),
    payment_type ENUM('sale_payment', 'refund') NOT NULL DEFAULT 'sale_payment',
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_sale
        FOREIGN KEY (business_id, sale_id)
        REFERENCES sales(business_id, sale_id),

    CONSTRAINT fk_payment_customer
        FOREIGN KEY (business_id, customer_id)
        REFERENCES customers(business_id, customer_id),

    CONSTRAINT fk_payment_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CHECK (amount > 0),

    KEY idx_payment_sale (business_id, sale_id),
    KEY idx_payment_date (business_id, created_at),
    KEY idx_payment_method (business_id, payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE purchases (
    purchase_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    purchase_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
    purchase_status ENUM('pending', 'received', 'cancelled')
        NOT NULL DEFAULT 'pending',
    notes VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_purchase_business_id (business_id, purchase_id),
    UNIQUE KEY uq_purchase_number (business_id, purchase_number),

    CONSTRAINT fk_purchase_supplier
        FOREIGN KEY (business_id, supplier_id)
        REFERENCES suppliers(business_id, supplier_id),

    CONSTRAINT fk_purchase_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CHECK (subtotal >= 0),
    CHECK (tax_amount >= 0),
    CHECK (total_amount >= 0),
    CHECK (amount_paid >= 0),
    CHECK (balance_due >= 0),

    KEY idx_purchase_date (business_id, created_at),
    KEY idx_purchase_supplier (business_id, supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;



CREATE TABLE purchase_items (
    purchase_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    purchase_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_item_purchase
        FOREIGN KEY (business_id, purchase_id)
        REFERENCES purchases(business_id, purchase_id),

    CONSTRAINT fk_purchase_item_product
        FOREIGN KEY (business_id, product_id)
        REFERENCES products(business_id, product_id),

    CHECK (quantity > 0),
    CHECK (unit_cost >= 0),
    CHECK (subtotal >= 0),

    KEY idx_purchase_items_purchase (business_id, purchase_id),
    KEY idx_purchase_items_product (business_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE expenses (
    expense_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    expense_category VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    amount DECIMAL(15,2) NOT NULL,
    payment_method ENUM(
        'cash',
        'mobile_money',
        'bank_transfer',
        'card',
        other
    ) NOT NULL DEFAULT 'cash',
    receipt_number VARCHAR(100),
    expense_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CHECK (amount > 0),

    KEY idx_expense_date (business_id, expense_date),
    KEY idx_expense_category (business_id, expense_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
CREATE TABLE returns (
    return_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    return_number VARCHAR(50) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    refund_method ENUM(
        'cash',
        'mobile_money',
        'bank_transfer',
        'card',
        'credit',
        other
    ) NOT NULL DEFAULT 'cash',
    reason VARCHAR(255),
    return_status ENUM('pending', 'completed', 'cancelled')
        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_return_business_id (business_id, return_id),
    UNIQUE KEY uq_return_number (business_id, return_number),

    CONSTRAINT fk_return_sale
        FOREIGN KEY (business_id, sale_id)
        REFERENCES sales(business_id, sale_id),

    CONSTRAINT fk_return_employee
        FOREIGN KEY (business_id, employee_id)
        REFERENCES employees(business_id, employee_id),

    CHECK (total_amount >= 0),

    KEY idx_return_date (business_id, created_at),
    KEY idx_return_sale (business_id, sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE return_items (
    return_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED NOT NULL,
    return_id BIGINT UNSIGNED NOT NULL,
    sale_item_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    refund_amount DECIMAL(15,2) NOT NULL,
    restock BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_return_item_return
        FOREIGN KEY (business_id, return_id)
        REFERENCES returns(business_id, return_id),

    CONSTRAINT fk_return_item_sale_item
        FOREIGN KEY (sale_item_id)
        REFERENCES sale_items(sale_item_id),

    CONSTRAINT fk_return_item_product
        FOREIGN KEY (business_id, product_id)
        REFERENCES products(business_id, product_id),

    CHECK (quantity > 0),
    CHECK (refund_amount >= 0),

    KEY idx_return_items_return (business_id, return_id),
    KEY idx_return_items_product (business_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT UNSIGNED,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(business_id),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    KEY idx_audit_business_date (business_id, created_at),
    KEY idx_audit_entity (entity_type, entity_id),
    KEY idx_audit_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;