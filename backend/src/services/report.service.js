
/*
 * SmartBiz Rwanda - Report Service
 * Business-scoped reporting and dashboard analytics.
 */

const pool = require("../config/database");
const AppError = require("../utils/AppError");
const expenseService = require("./expense.service");
const inventoryService = require("./inventory.service");

/*
 * Format a date as YYYY-MM-DD using local date components.
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/*
 * Validate and prepare the reporting date range.
 * Default: the most recent 30 calendar days, including today.
 */
function getDateRange(filters = {}) {
    const today = new Date();

    const defaultTo = formatDate(today);

    const start = new Date(today);
    start.setDate(start.getDate() - 29);

    const defaultFrom = formatDate(start);

    const dateFrom = filters.date_from || defaultFrom;
    const dateTo = filters.date_to || defaultTo;

    function isValidDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const date = new Date(`${value}T00:00:00Z`);

        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value
        );
    }

    if (!isValidDate(dateFrom) || !isValidDate(dateTo)) {
        throw new AppError(
            "Report dates must be valid dates in YYYY-MM-DD format.",
            400
        );
    }

    if (dateFrom > dateTo) {
        throw new AppError(
            "The start date cannot be later than the end date.",
            400
        );
    }

    return {
        date_from: dateFrom,
        date_to: dateTo
    };
}

/*
 * Get sales overview.
 */
async function getSalesOverview(businessId, dateFrom, dateTo) {
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_sales,
            COALESCE(SUM(s.total_amount), 0) AS total_revenue,
            COALESCE(SUM(s.amount_paid), 0) AS amount_collected,
            COALESCE(SUM(s.balance_due), 0) AS outstanding_balance,
            COALESCE(AVG(s.total_amount), 0) AS average_sale
         FROM sales s
         WHERE s.business_id = ?
           AND s.sale_status = 'completed'
           AND DATE(s.created_at) BETWEEN ? AND ?`,
        [businessId, dateFrom, dateTo]
    );

    return rows[0];
}

/*
 * Get daily sales trend.
 */
async function getSalesTrend(businessId, dateFrom, dateTo) {
    const [rows] = await pool.execute(
        `SELECT
            DATE(s.created_at) AS sale_date,
            COUNT(*) AS total_sales,
            COALESCE(SUM(s.total_amount), 0) AS total_revenue
         FROM sales s
         WHERE s.business_id = ?
           AND s.sale_status = 'completed'
           AND DATE(s.created_at) BETWEEN ? AND ?
         GROUP BY DATE(s.created_at)
         ORDER BY sale_date ASC`,
        [businessId, dateFrom, dateTo]
    );

    return rows;
}

/*
 * Get sales payment-method breakdown.
 */
async function getPaymentBreakdown(businessId, dateFrom, dateTo) {
    const [rows] = await pool.execute(
        `SELECT
            p.payment_method,
            COUNT(*) AS payment_count,
            COALESCE(SUM(p.amount), 0) AS total_amount
         FROM payments p
         INNER JOIN sales s
            ON s.business_id = p.business_id
            AND s.sale_id = p.sale_id
         WHERE p.business_id = ?
           AND p.payment_type = 'sale_payment'
           AND s.sale_status = 'completed'
           AND DATE(p.created_at) BETWEEN ? AND ?
         GROUP BY p.payment_method
         ORDER BY total_amount DESC`,
        [businessId, dateFrom, dateTo]
    );

    return rows;
}

/*
 * Get the best-selling products.
 */
async function getTopProducts(businessId, dateFrom, dateTo) {
    const [rows] = await pool.execute(
        `SELECT
            p.product_id,
            p.product_name,
            p.sku,
            COALESCE(SUM(si.quantity), 0) AS quantity_sold,
            COALESCE(SUM(si.subtotal), 0) AS total_revenue
         FROM sale_items si
         INNER JOIN sales s
            ON s.business_id = si.business_id
            AND s.sale_id = si.sale_id
         INNER JOIN products p
            ON p.business_id = si.business_id
            AND p.product_id = si.product_id
         WHERE si.business_id = ?
           AND s.sale_status = 'completed'
           AND DATE(s.created_at) BETWEEN ? AND ?
         GROUP BY
            p.product_id,
            p.product_name,
            p.sku
         ORDER BY quantity_sold DESC, total_revenue DESC
         LIMIT 10`,
        [businessId, dateFrom, dateTo]
    );

    return rows;
}

/*
 * Get the complete Reports dashboard.
 */
async function getDashboardReport(businessId, filters = {}) {
    const { date_from, date_to } = getDateRange(filters);

    const [
        salesOverview,
        salesTrend,
        paymentBreakdown,
        topProducts,
        expenseReport,
        inventorySummary
    ] = await Promise.all([
        getSalesOverview(businessId, date_from, date_to),
        getSalesTrend(businessId, date_from, date_to),
        getPaymentBreakdown(businessId, date_from, date_to),
        getTopProducts(businessId, date_from, date_to),
        expenseService.getExpenseSummary(businessId, {
            date_from,
            date_to
        }),
        inventoryService.getSummary(businessId)
    ]);

    return {
        filters: {
            date_from,
            date_to
        },

        sales: salesOverview,

        sales_trend: salesTrend,

        payment_breakdown: paymentBreakdown,

        top_products: topProducts,

        expenses: expenseReport,

        inventory: inventorySummary
    };
}

module.exports = {
    getDashboardReport
};