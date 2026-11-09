
/*
 * SmartBiz Rwanda Dashboard
 * Session verification, API integration and role-aware dashboard.
 */

document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("smartbiz_token");
    const savedMembership = sessionStorage.getItem("smartbiz_membership");

    if (!token || !savedMembership) {
        window.location.replace("login.html");
        return;
    }

    let membership;

    try {
        membership = JSON.parse(savedMembership);
    } catch (error) {
        authService.clearSession();
        window.location.replace("login.html");
        return;
    }

    const businessStatus =
        String(membership.business_status || "").toLowerCase();

    const membershipStatus =
        String(membership.membership_status || "").toLowerCase();

    if (businessStatus !== "active" || membershipStatus !== "active") {
        authService.clearSession();
        window.location.replace("login.html");
        return;
    }

    const businessId = membership.business_id;

    if (!businessId) {
        showDashboardError("Business information is missing.");
        return;
    }

    try {
        const result = await authService.getMe(token);
        const user = result.data.user;

        const role = String(membership.role || "owner").toLowerCase();

        const roleNames = {
            owner: "Business Owner",
            manager: "Business Manager",
            cashier: "Cashier",
            stock_manager: "Stock Manager"
        };

        const roleDescriptions = {
            owner: "Monitor your business performance and operations.",
            manager: "Monitor sales performance and daily operations.",
            cashier: "Monitor your sales activity and recent transactions.",
            stock_manager: "Monitor products, inventory and stock levels."
        };

        const userDisplayName =
            user.full_name ||
            user.name ||
            user.email ||
            "SmartBiz User";

        setText("userName", userDisplayName);
        setText("userRole", roleNames[role] || "Business User");
        setText("userAvatar", userDisplayName.charAt(0).toUpperCase());

        setText(
            "welcomeHeading",
            "Welcome to " + (membership.business_name || "Your Business")
        );

        setText(
            "welcomeDescription",
            roleDescriptions[role] || "Here's your business workspace."
        );

        setText(
            "currentDate",
            new Intl.DateTimeFormat("en-RW", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(new Date())
        );

        window.renderSidebar(membership);

        configureDashboardForRole(role);

        await loadDashboardData(businessId, token, role);

    } catch (error) {
        console.error("Dashboard loading error:", error);

        const message = String(error.message || "").toLowerCase();

        if (
            message.includes("token") ||
            message.includes("authentication") ||
            message.includes("expired") ||
            message.includes("unauthorized")
        ) {
            authService.clearSession();
            window.location.replace("login.html");
            return;
        }

        showDashboardError(
            error.message || "Unable to load dashboard information."
        );
    }
});


/*
 * Safely update an existing HTML element.
 */
function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


/*
 * Configure dashboard visibility according to business role.
 */
function configureDashboardForRole(role) {

    const kpiCards = document.querySelectorAll(".kpi-card");
    const salesPanel = document.querySelector(".sales-panel");
    const inventoryPanel = document.querySelector(".inventory-panel");
    const transactionsPanel = document.querySelector(".transactions-panel");

    // Start by showing all dashboard sections.
    kpiCards.forEach(card => card.style.display = "");
    if (salesPanel) salesPanel.style.display = "";
    if (inventoryPanel) inventoryPanel.style.display = "";
    if (transactionsPanel) transactionsPanel.style.display = "";

    const salesLabel = document.querySelector("#totalSales")
        ?.parentElement.querySelector(".kpi-label");

    const revenueLabel = document.querySelector("#totalRevenue")
        ?.parentElement.querySelector(".kpi-label");

    if (role === "manager") {

        // Managers see sales performance and inventory.
        kpiCards[2].style.display = "none";
        kpiCards[3].style.display = "none";

    } else if (role === "cashier") {

        // Cashiers focus on sales activity.
        kpiCards[1].style.display = "none";
        kpiCards[2].style.display = "none";
        kpiCards[3].style.display = "none";

        if (inventoryPanel) inventoryPanel.style.display = "none";

    } else if (role === "stock_manager") {

        // Stock managers focus on products and stock levels.
        kpiCards[2].style.display = "none";
        kpiCards[3].style.display = "none";

        if (salesPanel) salesPanel.style.display = "none";
        if (transactionsPanel) transactionsPanel.style.display = "none";

        if (salesLabel) salesLabel.textContent = "Active Products";
        if (revenueLabel) revenueLabel.textContent = "Low Stock Products";
    }
}


/*
 * Load dashboard information.
 */
async function loadDashboardData(businessId, token, role) {

    const result = await dashboardService.getDashboard(
        businessId,
        token
    );

    if (!result.data) {
        throw new Error("Dashboard data was not returned by the server.");
    }

    const dashboard = result.data;

    renderDashboardSummary(
        dashboard.summary,
        dashboard.inventory,
        role
    );

    renderSalesOverview(dashboard.sales_overview);
    renderInventorySummary(dashboard.inventory);
    renderRecentTransactions(dashboard.recent_transactions);
}


/*
 * Format amounts as Rwandan Francs.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-RW", {
        style: "currency",
        currency: "RWF",
        maximumFractionDigits: 0
    }).format(Number(amount || 0));
}


/*
 * Render role-specific dashboard summary cards.
 */
function renderDashboardSummary(summary, inventory, role) {

    const totalSales = document.getElementById("totalSales");
    const totalRevenue = document.getElementById("totalRevenue");

    const totalExpenses = document.getElementById("totalExpenses");
    const totalProfit = document.getElementById("totalProfit");

    if (role === "stock_manager") {

        totalSales.textContent =
            Number(inventory.total_products || 0).toLocaleString("en-RW");

        totalRevenue.textContent =
            Number(inventory.low_stock || 0).toLocaleString("en-RW");

        document.getElementById("salesDescription").textContent =
            "Products currently active";

        document.getElementById("revenueDescription").textContent =
            "Products requiring stock attention";

        return;
    }

    totalSales.textContent =
        Number(summary.total_sales || 0).toLocaleString("en-RW");

    totalRevenue.textContent = formatCurrency(summary.revenue);

    document.getElementById("salesDescription").textContent =
        "Completed sales this month";

    document.getElementById("revenueDescription").textContent =
        "Revenue this month";

    if (role === "owner") {

        totalExpenses.textContent = formatCurrency(summary.expenses);

        totalProfit.textContent =
            formatCurrency(summary.net_operating_result);

        document.getElementById("expensesDescription").textContent =
            "Expenses this month";

        document.getElementById("profitDescription").textContent =
            "Net operating result this month";
    }
}


/*
 * Convert a database date into a local date without
 * accidentally changing the calendar day.
 */
function parseSaleDate(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const parts = value.split("-").map(Number);

        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    return new Date(value);
}


/*
 * Render the last seven calendar days.
 * Dates without sales are displayed as zero.
 */
function renderSalesOverview(salesOverview) {
    const container = document.getElementById("salesChart");

    if (!container) return;

    container.replaceChildren();

    const salesByDate = new Map();

    salesOverview.forEach(function (item) {
        const date = parseSaleDate(item.sale_date);

        if (Number.isNaN(date.getTime())) return;

        const key = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        salesByDate.set(
            key,
            Number(item.revenue || 0)
        );
    });

    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();

        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const key = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        days.push({
            date: date,
            revenue: salesByDate.get(key) || 0
        });
    }

    const maxRevenue = Math.max(
        ...days.map(day => day.revenue),
        1
    );

    const chart = document.createElement("div");
    chart.className = "sales-chart";

    days.forEach(function (day) {
        const label = new Intl.DateTimeFormat("en-RW", {
            weekday: "short",
            day: "numeric"
        }).format(day.date);

        const chartItem = document.createElement("div");
        chartItem.className = "sales-chart-item";

        const amount = document.createElement("span");
        amount.className = "sales-chart-amount";
        amount.textContent = formatCurrency(day.revenue);

        const track = document.createElement("div");
        track.className = "sales-chart-track";

        const bar = document.createElement("div");
        bar.className = "sales-chart-bar";

        bar.style.width =
            (day.revenue / maxRevenue) * 100 + "%";

        track.appendChild(bar);

        const dateLabel = document.createElement("small");
        dateLabel.textContent = label;

        chartItem.append(amount, track, dateLabel);
        chart.appendChild(chartItem);
    });

    container.appendChild(chart);
}


/*
 * Render inventory information.
 */
function renderInventorySummary(inventory) {
    const container = document.getElementById("inventorySummary");

    if (!container) return;

    container.replaceChildren();

    const totalProducts = Number(inventory.total_products || 0);
    const lowStock = Number(inventory.low_stock || 0);

    const total = document.createElement("h3");
    total.textContent =
        totalProducts.toLocaleString("en-RW") + " active products";

    const warning = document.createElement("p");
    warning.textContent =
        lowStock.toLocaleString("en-RW") +
        " products need stock attention.";

    const status = document.createElement("p");

    status.textContent = lowStock > 0
        ? "Review your low-stock products."
        : "No products are currently below their reorder level.";

    container.append(total, warning, status);
}


/*
 * Render recent sales transactions.
 */
function renderRecentTransactions(transactions) {
    const tbody = document.getElementById("recentTransactions");

    if (!tbody) return;

    tbody.replaceChildren();

    if (!transactions.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "table-empty";
        cell.textContent = "No recent transactions found.";

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    transactions.forEach(function (transaction) {
        const row = document.createElement("tr");

        const reference = document.createElement("td");
        reference.textContent = transaction.invoice_number || "—";

        const customer = document.createElement("td");
        customer.textContent = transaction.customer_name || "Walk-in customer";

        const date = document.createElement("td");
        const transactionDate = new Date(transaction.created_at);

        date.textContent = Number.isNaN(transactionDate.getTime())
            ? "—"
            : new Intl.DateTimeFormat("en-RW", {
                day: "numeric",
                month: "short",
                year: "numeric"
            }).format(transactionDate);

        const amount = document.createElement("td");
        amount.textContent = formatCurrency(transaction.total_amount);

        const status = document.createElement("td");
        status.textContent = transaction.payment_status || "—";

        row.append(reference, customer, date, amount, status);

        tbody.appendChild(row);
    });
}


/*
 * Display dashboard loading errors.
 */
function showDashboardError(message) {
    const containers = [
        "salesChart",
        "inventorySummary",
        "recentTransactions"
    ];

    containers.forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = message;
        }
    });
}
