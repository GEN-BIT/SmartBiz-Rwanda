document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("smartbiz_token");
    const membershipText = sessionStorage.getItem("smartbiz_membership");

    const messageElement = document.getElementById("saleDetailsMessage");
    const contentElement = document.getElementById("saleDetailsContent");
    const printButton = document.getElementById("printSaleBtn");

    let membership;

    function showMessage(message, type = "error") {
        messageElement.textContent = message;
        messageElement.className = `sales-message ${type}`;
        messageElement.hidden = false;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function formatMoney(value) {
        const amount = Number(value || 0);

        return `RWF ${amount.toLocaleString("en-RW", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}`;
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function statusBadge(value) {
        const status = String(value || "unknown").toLowerCase();
        const safeStatus = escapeHTML(status);

        return `
            <span class="status-badge status-${safeStatus}">
                ${escapeHTML(status.replaceAll("_", " "))}
            </span>
        `;
    }

    function renderItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return `
                <tr>
                    <td colspan="5" class="sales-empty-cell">
                        No sale items were returned.
                    </td>
                </tr>
            `;
        }

        return items.map(function (item) {
            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(item.product_name || "Product")}</strong>
                        <small>${escapeHTML(item.sku || "—")}</small>
                    </td>
                    <td>${escapeHTML(item.quantity ?? 0)}</td>
                    <td>${formatMoney(item.unit_price)}</td>
                    <td>${formatMoney(item.subtotal)}</td>
                </tr>
            `;
        }).join("");
    }

    function renderPayments(payments) {
        if (!Array.isArray(payments) || payments.length === 0) {
            return `
                <div class="sale-payment-empty">
                    No payment records are available for this sale.
                </div>
            `;
        }

        return `
            <div class="sales-table-wrapper">
                <table class="sales-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Type</th>
                            <th>Reference</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(function (payment) {
                            return `
                                <tr>
                                    <td>${formatDate(payment.created_at)}</td>
                                    <td>${escapeHTML(
                                        String(payment.payment_method || "—")
                                            .replaceAll("_", " ")
                                    )}</td>
                                    <td>${escapeHTML(
                                        String(payment.payment_type || "—")
                                            .replaceAll("_", " ")
                                    )}</td>
                                    <td>${escapeHTML(
                                        payment.transaction_reference || "—"
                                    )}</td>
                                    <td><strong>${formatMoney(payment.amount)}</strong></td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderSaleDetails(result) {
        const sale = result?.sale;
        const items = result?.items;
        const payments = result?.payments;

        if (!sale) {
            throw new Error("The sale details were not found in the server response.");
        }

        contentElement.innerHTML = `
            <section class="sale-details-grid">
                <article class="sales-panel sale-info-card">
                    <div class="panel-heading">
                        <div>
                            <h2>Invoice information</h2>
                            <p>Sale reference and customer information</p>
                        </div>
                        ${statusBadge(sale.sale_status)}
                    </div>

                    <div class="sale-info-row">
                        <span>Invoice number</span>
                        <strong>${escapeHTML(sale.invoice_number || "—")}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Sale ID</span>
                        <strong>${escapeHTML(sale.sale_id ?? "—")}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Date</span>
                        <strong>${formatDate(sale.created_at)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Customer</span>
                        <strong>${escapeHTML(sale.customer_name || "Walk-in customer")}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Payment status</span>
                        ${statusBadge(sale.payment_status)}
                    </div>
                </article>

                <article class="sales-panel sale-info-card">
                    <div class="panel-heading">
                        <div>
                            <h2>Payment summary</h2>
                            <p>Amounts recorded for this sale</p>
                        </div>
                    </div>

                    <div class="sale-info-row">
                        <span>Subtotal</span>
                        <strong>${formatMoney(sale.subtotal)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Discount</span>
                        <strong>${formatMoney(sale.discount_amount)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Tax</span>
                        <strong>${formatMoney(sale.tax_amount)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Amount paid</span>
                        <strong>${formatMoney(sale.amount_paid)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Balance due</span>
                        <strong>${formatMoney(sale.balance_due)}</strong>
                    </div>

                    <div class="sale-total-block">
                        <span>Total sale amount</span>
                        <strong>${formatMoney(sale.total_amount)}</strong>
                    </div>
                </article>
            </section>

            <section class="sales-panel sale-items-panel">
                <div class="panel-heading">
                    <div>
                        <h2>Items sold</h2>
                        <p>Products and quantities included in this sale</p>
                    </div>
                </div>

                <div class="sales-table-wrapper">
                    <table class="sales-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit price</th>
                                <th>Line total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderItems(items)}
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="sales-panel sale-payments-panel">
                <div class="panel-heading">
                    <div>
                        <h2>Payment records</h2>
                        <p>Payments recorded against this sale</p>
                    </div>
                </div>

                ${renderPayments(payments)}
            </section>
        `;

        printButton.disabled = false;
    }

    if (!token || !membershipText) {
        window.location.href = "login.html";
        return;
    }

    try {
        membership = JSON.parse(membershipText);
    } catch (error) {
        sessionStorage.removeItem("smartbiz_membership");
        window.location.href = "login.html";
        return;
    }

    const businessId = membership.business_id;
    const membershipStatus = String(membership.membership_status || "").toLowerCase();
    const businessStatus = String(membership.business_status || "").toLowerCase();
    const role = String(membership.role || "").toLowerCase();

    if (!businessId || membershipStatus !== "active" || businessStatus !== "active") {
        showMessage("Your business membership is not active. Please contact the business owner.");
        return;
    }

    const allowedRoles = ["owner", "manager", "cashier", "stock_manager"];

    if (!allowedRoles.includes(role)) {
        showMessage("You do not have permission to view sale details.");
        return;
    }

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    const saleId = new URLSearchParams(window.location.search).get("saleId");

    if (!saleId || !/^\d+$/.test(saleId) || Number(saleId) <= 0) {
        contentElement.innerHTML = "";
        showMessage("A valid sale ID was not provided.");
        return;
    }

    printButton.addEventListener("click", function () {
        window.print();
    });

    try {
        const response = await window.salesService.getSaleById(
            businessId,
            Number(saleId)
        );

        if (!response || !response.data) {
            throw new Error("The server returned an unexpected sale response.");
        }

        renderSaleDetails(response.data);
    } catch (error) {
        contentElement.innerHTML = `
            <div class="sales-panel sales-empty-state">
                Sale details could not be loaded.
            </div>
        `;

        showMessage(error.message || "Unable to load sale details.");
    }
});