/*
 * SmartBiz Rwanda - Reports Dashboard
 */

(function () {
    "use strict";

    let currentBusinessId = null;
    let currentToken = null;

    const elements = {};

    document.addEventListener("DOMContentLoaded", initializeReports);

    async function initializeReports() {
        cacheElements();

        const token = sessionStorage.getItem("smartbiz_token");
        const storedMembership = sessionStorage.getItem("smartbiz_membership");

        if (!token || !storedMembership) {
            redirectToLogin();
            return;
        }

        let membership;

        try {
            membership = JSON.parse(storedMembership);
        } catch (error) {
            redirectToLogin();
            return;
        }

        if (
            !membership ||
            !membership.business_id ||
            membership.business_status !== "active" ||
            membership.membership_status !== "active"
        ) {
            redirectToLogin();
            return;
        }

        const role = String(membership.role || "").toLowerCase();

        if (!["owner", "manager"].includes(role)) {
            window.location.href = "dashboard.html";
            return;
        }

        currentBusinessId = membership.business_id;
        currentToken = token;

        if (typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }

        setupUserInformation(membership);
        setupDateFilters();
        setupEventListeners();

        try {
            const result = await window.authService.getMe(token);

            if (result && result.data && result.data.user) {
                const user = result.data.user;

                if (user.full_name) {
                    elements.userName.textContent = user.full_name;
                    elements.userAvatar.textContent =
                        user.full_name.trim().charAt(0).toUpperCase();
                }
            }
        } catch (error) {
            if (error.message && error.message.toLowerCase().includes("session")) {
                redirectToLogin();
                return;
            }
        }

        await loadReports();
    }

    function cacheElements() {
        const ids = [
            "userName",
            "userRole",
            "userAvatar",
            "dateFrom",
            "dateTo",
            "applyFiltersBtn",
            "reportMessage",
            "totalSales",
            "totalRevenue",
            "amountCollected",
            "outstandingBalance",
            "averageSale",
            "totalExpenses",
            "trendRevenue",
            "salesTrendChart",
            "paymentBreakdown",
            "expenseBreakdown",
            "topProductsBody",
            "inventoryTotal",
            "inventoryInStock",
            "inventoryLowStock",
            "inventoryOutOfStock"
        ];

        ids.forEach(function (id) {
            elements[id] = document.getElementById(id);
        });
    }

    function redirectToLogin() {
        if (window.authService) {
            window.authService.clearSession();
        } else {
            sessionStorage.removeItem("smartbiz_token");
            sessionStorage.removeItem("smartbiz_membership");
        }

        window.location.href = "login.html";
    }

    function setupUserInformation(membership) {
        const role = String(membership.role || "owner").toLowerCase();

        const roleNames = {
            owner: "Business Owner",
            manager: "Business Manager"
        };

        const displayName =
            membership.full_name ||
            membership.business_name ||
            "User";

        elements.userName.textContent = displayName;
        elements.userRole.textContent = roleNames[role] || "User";
        elements.userAvatar.textContent =
            displayName.trim().charAt(0).toUpperCase();
    }

    function setupDateFilters() {
        const today = new Date();
        const from = new Date(today);

        from.setDate(from.getDate() - 29);

        elements.dateFrom.value = formatDateInput(from);
        elements.dateTo.value = formatDateInput(today);

        elements.dateFrom.max = formatDateInput(today);
        elements.dateTo.max = formatDateInput(today);
    }

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function setupEventListeners() {
        elements.applyFiltersBtn.addEventListener("click", function () {
            const dateFrom = elements.dateFrom.value;
            const dateTo = elements.dateTo.value;

            if (!dateFrom || !dateTo) {
                showMessage("Please select both reporting dates.");
                return;
            }

            if (dateFrom > dateTo) {
                showMessage("The start date cannot be later than the end date.");
                return;
            }

            if (dateTo > formatDateInput(new Date())) {
                showMessage("The end date cannot be in the future.");
                return;
            }

            loadReports();
        });
    }

    async function loadReports() {
        setLoading(true);
        hideMessage();

        try {
            const report = await window.reportService.getDashboardReport(
                currentBusinessId,
                {
                    date_from: elements.dateFrom.value,
                    date_to: elements.dateTo.value
                },
                currentToken
            );

            renderReports(report);
        } catch (error) {
            if (
                error.message &&
                error.message.toLowerCase().includes("session has expired")
            ) {
                redirectToLogin();
                return;
            }

            showMessage(error.message || "Unable to load reports.");

            renderEmptyReport();
        } finally {
            setLoading(false);
        }
    }

    function renderReports(report) {
        const sales = report.sales || {};
        const expenses = report.expenses || {};
        const expenseSummary = expenses.summary || {};
        const inventory = report.inventory || {};

        elements.totalSales.textContent =
            formatNumber(sales.total_sales);

        elements.totalRevenue.textContent =
            formatCurrency(sales.total_revenue);

        elements.amountCollected.textContent =
            formatCurrency(sales.amount_collected);

        elements.outstandingBalance.textContent =
            formatCurrency(sales.outstanding_balance);

        elements.averageSale.textContent =
            formatCurrency(sales.average_sale);

        elements.totalExpenses.textContent =
            formatCurrency(expenseSummary.total_amount);

        elements.trendRevenue.textContent =
            formatCurrency(sales.total_revenue);

        renderSalesTrend(report.sales_trend || []);
        renderPaymentBreakdown(report.payment_breakdown || []);
        renderExpenseBreakdown(expenses.by_category || []);
        renderTopProducts(report.top_products || []);
        renderInventorySummary(inventory);
    }

    function renderSalesTrend(rows) {
        const container = elements.salesTrendChart;
        container.replaceChildren();

        if (!rows.length) {
            showEmpty(container, "No completed sales found for this period.");
            return;
        }

        const maximum = Math.max(
            ...rows.map(function (row) {
                return Number(row.total_revenue) || 0;
            }),
            0
        );

        rows.forEach(function (row) {
            const revenue = Number(row.total_revenue) || 0;

            const column = createElement("div", "chart-column");
            const barArea = createElement("div", "chart-bar-area");
            const bar = createElement("div", "chart-bar");
            const date = createElement("span", "chart-date");
            const tooltip = createElement("span", "chart-tooltip");

            const height = maximum > 0
                ? Math.max(3, (revenue / maximum) * 145)
                : 3;

            bar.style.height = `${height}px`;
            bar.title = `${formatCurrency(revenue)} revenue`;

            date.textContent = formatShortDate(row.sale_date);
            tooltip.textContent = formatNumber(row.total_sales) + " sales";

            barArea.appendChild(bar);
            column.appendChild(barArea);
            column.appendChild(date);
            column.appendChild(tooltip);

            container.appendChild(column);
        });
    }

    function renderPaymentBreakdown(rows) {
        const container = elements.paymentBreakdown;
        container.replaceChildren();

        if (!rows.length) {
            showEmpty(container, "No payment records found for this period.");
            return;
        }

        const total = rows.reduce(function (sum, row) {
            return sum + (Number(row.total_amount) || 0);
        }, 0);

        rows.forEach(function (row) {
            const amount = Number(row.total_amount) || 0;
            const percentage = total > 0 ? (amount / total) * 100 : 0;

            const item = createElement("div", "breakdown-item");
            const top = createElement("div", "breakdown-top");
            const name = createElement("span", "breakdown-name");
            const value = createElement("strong", "breakdown-amount");
            const meta = createElement("span", "breakdown-meta");
            const track = createElement("div", "breakdown-track");
            const fill = createElement("div", "breakdown-fill");

            name.textContent = formatLabel(row.payment_method);
            value.textContent = formatCurrency(amount);
            meta.textContent =
                `${formatNumber(row.payment_count)} payments · ${percentage.toFixed(1)}%`;

            fill.style.width = `${percentage}%`;

            top.appendChild(name);
            top.appendChild(value);

            track.appendChild(fill);

            item.appendChild(top);
            item.appendChild(meta);
            item.appendChild(track);

            container.appendChild(item);
        });
    }

    function renderExpenseBreakdown(rows) {
        const container = elements.expenseBreakdown;
        container.replaceChildren();

        if (!rows.length) {
            showEmpty(container, "No expenses found for this period.");
            return;
        }

        const total = rows.reduce(function (sum, row) {
            return sum + (Number(row.total_amount) || 0);
        }, 0);

        rows.forEach(function (row) {
            const amount = Number(row.total_amount) || 0;
            const percentage = total > 0 ? (amount / total) * 100 : 0;

            const item = createElement("div", "breakdown-item");
            const top = createElement("div", "breakdown-top");
            const name = createElement("span", "breakdown-name");
            const value = createElement("strong", "breakdown-amount");
            const meta = createElement("span", "breakdown-meta");
            const track = createElement("div", "breakdown-track");
            const fill = createElement("div", "breakdown-fill");

            name.textContent = formatLabel(row.expense_category);
            value.textContent = formatCurrency(amount);
            meta.textContent =
                `${formatNumber(row.expense_count)} expenses · ${percentage.toFixed(1)}%`;

            fill.style.width = `${percentage}%`;

            top.appendChild(name);
            top.appendChild(value);

            track.appendChild(fill);

            item.appendChild(top);
            item.appendChild(meta);
            item.appendChild(track);

            container.appendChild(item);
        });
    }

    function renderTopProducts(rows) {
        const body = elements.topProductsBody;
        body.replaceChildren();

        if (!rows.length) {
            const row = createElement("tr");
            const cell = createElement("td", "table-empty");

            cell.colSpan = 4;
            cell.textContent = "No product sales found for this period.";

            row.appendChild(cell);
            body.appendChild(row);
            return;
        }

        rows.forEach(function (product) {
            const row = createElement("tr");

            const name = createElement("td");
            const sku = createElement("td");
            const quantity = createElement("td");
            const revenue = createElement("td");

            name.textContent = product.product_name || "Unnamed product";
            sku.textContent = product.sku || "—";
            quantity.textContent = formatQuantity(product.quantity_sold);
            revenue.textContent = formatCurrency(product.total_revenue);

            row.appendChild(name);
            row.appendChild(sku);
            row.appendChild(quantity);
            row.appendChild(revenue);

            body.appendChild(row);
        });
    }

    function renderInventorySummary(inventory) {
        elements.inventoryTotal.textContent =
            formatNumber(inventory.total_products);

        elements.inventoryInStock.textContent =
            formatNumber(inventory.products_in_stock);

        elements.inventoryLowStock.textContent =
            formatNumber(inventory.low_stock);

        elements.inventoryOutOfStock.textContent =
            formatNumber(inventory.out_of_stock);
    }

    function renderEmptyReport() {
        elements.totalSales.textContent = "—";
        elements.totalRevenue.textContent = "—";
        elements.amountCollected.textContent = "—";
        elements.outstandingBalance.textContent = "—";
        elements.averageSale.textContent = "—";
        elements.totalExpenses.textContent = "—";
        elements.trendRevenue.textContent = "—";

        elements.inventoryTotal.textContent = "—";
        elements.inventoryInStock.textContent = "—";
        elements.inventoryLowStock.textContent = "—";
        elements.inventoryOutOfStock.textContent = "—";

        showEmpty(elements.salesTrendChart, "Report data is unavailable.");
        showEmpty(elements.paymentBreakdown, "Report data is unavailable.");
        showEmpty(elements.expenseBreakdown, "Report data is unavailable.");

        elements.topProductsBody.replaceChildren();

        const row = createElement("tr");
        const cell = createElement("td", "table-empty");

        cell.colSpan = 4;
        cell.textContent = "Report data is unavailable.";

        row.appendChild(cell);
        elements.topProductsBody.appendChild(row);
    }

    function createElement(tag, className) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        return element;
    }

    function showEmpty(container, message) {
        const empty = createElement("div", "empty-state");
        empty.textContent = message;
        container.appendChild(empty);
    }

    function formatCurrency(value) {
        const amount = Number(value) || 0;

        return new Intl.NumberFormat("en-RW", {
            style: "currency",
            currency: "RWF",
            maximumFractionDigits: 0
        }).format(amount);
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-RW", {
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function formatQuantity(value) {
        return new Intl.NumberFormat("en-RW", {
            maximumFractionDigits: 3
        }).format(Number(value) || 0);
    }

    function formatLabel(value) {
        if (!value) {
            return "Other";
        }

        return String(value)
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function formatShortDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value).slice(0, 10);
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short"
        });
    }

    function setLoading(loading) {
        elements.applyFiltersBtn.disabled = loading;

        elements.applyFiltersBtn.textContent = loading
            ? "Loading..."
            : "Apply filters";
    }

    function showMessage(message) {
        elements.reportMessage.textContent = message;
        elements.reportMessage.hidden = false;
        elements.reportMessage.classList.remove("success");
    }

    function hideMessage() {
        elements.reportMessage.textContent = "";
        elements.reportMessage.hidden = true;
    }

})();