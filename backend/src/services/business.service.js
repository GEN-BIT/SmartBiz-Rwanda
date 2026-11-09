const pool = require("../config/database");

async function getDashboardData(businessId) {
    // Current month: sales, revenue and cost of goods sold.
    const [salesSummaryRows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_sales,
            COALESCE(
                SUM(s.subtotal - s.discount_amount),
                0
            ) AS revenue,
            COALESCE(
                SUM((
                    SELECT COALESCE(
                        SUM(si.quantity * si.unit_cost),
                        0
                    )
                    FROM sale_items si
                    WHERE si.business_id = s.business_id
                      AND si.sale_id = s.sale_id
                )),
                0
            ) AS cost_of_goods_sold
         FROM sales s
         WHERE s.business_id = ?
           AND s.sale_status = 'completed'
           AND s.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           AND s.created_at < DATE_ADD(
               LAST_DAY(CURDATE()),
               INTERVAL 1 DAY
           )`,
        [businessId]
    );

    // Current month's expenses.
    const [expenseRows] = await pool.execute(
        `SELECT
            COALESCE(SUM(amount), 0) AS expenses
         FROM expenses
         WHERE business_id = ?
           AND expense_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
           AND expense_date < DATE_ADD(
               LAST_DAY(CURDATE()),
               INTERVAL 1 DAY
           )`,
        [businessId]
    );

    // Last seven days of completed sales.
    const [salesOverviewRows] = await pool.execute(
        `SELECT
            DATE(created_at) AS sale_date,
            COUNT(*) AS total_sales,
            COALESCE(
                SUM(subtotal - discount_amount),
                0
            ) AS revenue
         FROM sales
         WHERE business_id = ?
           AND sale_status = 'completed'
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
         GROUP BY DATE(created_at)
         ORDER BY sale_date ASC`,
        [businessId]
    );

    // Active products and products at or below their reorder level.
    const [inventoryRows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_products,
            COALESCE(
                SUM(
                    CASE
                        WHEN COALESCE(i.quantity, 0) <= p.reorder_level
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS low_stock
         FROM products p
         LEFT JOIN inventory i
            ON i.product_id = p.product_id
           AND i.business_id = p.business_id
         WHERE p.business_id = ?
           AND p.status = 'active'`,
        [businessId]
    );

    // Latest five completed sales.
    const [recentTransactions] = await pool.execute(
        `SELECT
            s.sale_id,
            s.invoice_number,
            s.total_amount,
            s.payment_status,
            s.created_at,
            COALESCE(c.customer_name, 'Walk-in customer') AS customer_name
         FROM sales s
         LEFT JOIN customers c
            ON c.customer_id = s.customer_id
           AND c.business_id = s.business_id
         WHERE s.business_id = ?
           AND s.sale_status = 'completed'
         ORDER BY s.created_at DESC, s.sale_id DESC
         LIMIT 5`,
        [businessId]
    );

    const salesSummary = salesSummaryRows[0];
    const expenses = expenseRows[0].expenses;
    const inventory = inventoryRows[0];

    // Keep calculations in MySQL to preserve DECIMAL precision.
    const [profitRows] = await pool.execute(
        `SELECT
            CAST(? AS DECIMAL(15,2)) -
            CAST(? AS DECIMAL(15,2)) AS gross_profit,

            CAST(? AS DECIMAL(15,2)) -
            CAST(? AS DECIMAL(15,2)) -
            CAST(? AS DECIMAL(15,2)) AS net_operating_result`,
        [
            salesSummary.revenue,
            salesSummary.cost_of_goods_sold,
            salesSummary.revenue,
            salesSummary.cost_of_goods_sold,
            expenses
        ]
    );

    return {
        summary: {
            period: "current_month",
            total_sales: salesSummary.total_sales,
            revenue: salesSummary.revenue,
            cost_of_goods_sold: salesSummary.cost_of_goods_sold,
            gross_profit: profitRows[0].gross_profit,
            expenses,
            net_operating_result: profitRows[0].net_operating_result
        },

        sales_overview: salesOverviewRows,

        inventory: {
            total_products: inventory.total_products,
            low_stock: inventory.low_stock
        },

        recent_transactions: recentTransactions
    };
}

module.exports = {
    getDashboardData
};