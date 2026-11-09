/*
 * SmartBiz Rwanda - Sales History
 * Loads business sales, filters and pagination.
 */

document.addEventListener("DOMContentLoaded", async function () {

    const token = sessionStorage.getItem("smartbiz_token");
    const storedMembership = sessionStorage.getItem("smartbiz_membership");

    // Check authentication.
    if (!token || !storedMembership) {
        window.location.replace("login.html");
        return;
    }

    let membership;

    try {
        membership = JSON.parse(storedMembership);
    } catch (error) {
        sessionStorage.removeItem("smartbiz_membership");
        window.location.replace("login.html");
        return;
    }

    // Check business membership.
    if (
        !membership.business_id ||
        membership.membership_status !== "active" ||
        (
            membership.business_status &&
            membership.business_status !== "active"
        )
    ) {
        window.location.replace("login.html");
        return;
    }

    const businessId = membership.business_id;

    // Page elements.
    const salesMessage = document.getElementById("salesMessage");
    const salesTableBody = document.getElementById("salesTableBody");

    const salesSearch = document.getElementById("salesSearch");
    const paymentStatusFilter =
        document.getElementById("paymentStatusFilter");

    const saleStatusFilter =
        document.getElementById("saleStatusFilter");

    const salesFilterBtn = document.getElementById("salesFilterBtn");

    const previousPageBtn =
        document.getElementById("previousPageBtn");

    const nextPageBtn =
        document.getElementById("nextPageBtn");

    const salesPaginationInfo =
        document.getElementById("salesPaginationInfo");

    const salesRecordCount =
        document.getElementById("salesRecordCount");

    const salesPageRevenue =
        document.getElementById("salesPageRevenue");

    const salesPageBalance =
        document.getElementById("salesPageBalance");

    // Page state.
    let currentPage = 1;
    const pageLimit = 10;
    let totalPages = 1;

    // Format Rwandan Francs.
    function formatMoney(value) {
        const amount = Number(value || 0);

        return "RWF " + amount.toLocaleString("en-RW", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    // Escape HTML before displaying database values.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character];
        });
    }

    // Format transaction date.
    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-RW", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    // Display page messages.
    function showMessage(message) {
        salesMessage.textContent = message;
        salesMessage.hidden = false;
    }

    function hideMessage() {
        salesMessage.textContent = "";
        salesMessage.hidden = true;
    }

    // Render sidebar with the logged-in membership.
    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    // Display user information.
    const userName =
        membership.user_name ||
        membership.full_name ||
        "Business User";

    document.getElementById("userName").textContent = userName;

    document.getElementById("userRole").textContent =
        String(membership.role || "Business User")
            .replace("_", " ")
            .replace(/\b\w/g, letter => letter.toUpperCase());

    document.getElementById("userAvatar").textContent =
        userName.charAt(0).toUpperCase();

    // Display a status badge.
    function statusBadge(value) {
        const status = String(value || "unknown").toLowerCase();

        return `
            <span class="sales-status ${escapeHTML(status)}">
                ${escapeHTML(status.replace("_", " "))}
            </span>
        `;
    }

    // Display sales records.
    function renderSales(sales) {

        if (!Array.isArray(sales) || sales.length === 0) {
            salesTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="sales-empty">
                        No sales transactions found.
                    </td>
                </tr>
            `;

            return;
        }

        salesTableBody.innerHTML = sales.map(function (sale) {

            const saleId = encodeURIComponent(sale.sale_id);

            return `
                <tr>
                    <td>
                        <a
                            href="sale-details.html?saleId=${saleId}"
                            class="sales-invoice-link"
                        >
                            ${escapeHTML(sale.invoice_number)}
                        </a>
                    </td>

                    <td>
                        ${escapeHTML(sale.customer_name || "Walk-in Customer")}
                    </td>

                    <td>${escapeHTML(formatDate(sale.created_at))}</td>

                    <td>${formatMoney(sale.total_amount)}</td>

                    <td>${formatMoney(sale.amount_paid)}</td>

                    <td>${formatMoney(sale.balance_due)}</td>

                    <td>${statusBadge(sale.payment_status)}</td>

                    <td>${statusBadge(sale.sale_status)}</td>

                    <td>
                        <a
                            href="sale-details.html?saleId=${saleId}"
                            class="sales-view-link"
                        >
                            View
                        </a>
                    </td>
                </tr>
            `;

        }).join("");
    }

    // Update summary cards.
    function updateSummary(sales, pagination) {

        const totalRecords = Number(
            pagination.total ?? sales.length
        );

        const completedSales = sales.filter(function (sale) {
            return sale.sale_status === "completed";
        });

        const pageRevenue = completedSales.reduce(function (total, sale) {
            return total + Number(sale.total_amount || 0);
        }, 0);

        const pageBalance = sales.reduce(function (total, sale) {
            return total + Number(sale.balance_due || 0);
        }, 0);

        salesRecordCount.textContent = totalRecords.toLocaleString("en-RW");
        salesPageRevenue.textContent = formatMoney(pageRevenue);
        salesPageBalance.textContent = formatMoney(pageBalance);
    }

    // Load sales from the backend.
    async function loadSales() {

        hideMessage();

        salesTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="sales-empty">
                    Loading sales transactions...
                </td>
            </tr>
        `;

        try {

            const filters = {
                page: currentPage,
                limit: pageLimit,
                search: salesSearch.value.trim(),
                payment_status: paymentStatusFilter.value,
                sale_status: saleStatusFilter.value
            };

            const response = await window.salesService.getSales(
                businessId,
                filters
            );

            const sales = Array.isArray(response.data)
                ? response.data
                : [];

            const pagination = response.pagination || {};

            totalPages = Math.max(
                1,
                Number(pagination.total_pages || 1)
            );

            renderSales(sales);
            updateSummary(sales, pagination);

            const totalRecords = Number(
                pagination.total ?? sales.length
            );

            const startRecord = totalRecords === 0
                ? 0
                : ((currentPage - 1) * pageLimit) + 1;

            const endRecord = Math.min(
                currentPage * pageLimit,
                totalRecords
            );

            salesPaginationInfo.textContent =
                `Showing ${startRecord}-${endRecord} of ${totalRecords} sales`;

            previousPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;

        } catch (error) {

            salesTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="sales-empty">
                        Unable to load sales transactions.
                    </td>
                </tr>
            `;

            showMessage(
                error.message || "Unable to load sales transactions."
            );

            salesRecordCount.textContent = "0";
            salesPageRevenue.textContent = formatMoney(0);
            salesPageBalance.textContent = formatMoney(0);

            previousPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    }

    // Apply filters.
    salesFilterBtn.addEventListener("click", function () {
        currentPage = 1;
        loadSales();
    });

    // Search when Enter is pressed.
    salesSearch.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            currentPage = 1;
            loadSales();
        }
    });

    // Previous page.
    previousPageBtn.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            loadSales();
        }
    });

    // Next page.
    nextPageBtn.addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage++;
            loadSales();
        }
    });

    // Initial loading.
    await loadSales();

});