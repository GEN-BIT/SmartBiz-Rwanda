/*
 * SmartBiz Rwanda - Sale Details
 */

document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("smartbiz_token");
    const storedMembership = sessionStorage.getItem("smartbiz_membership");

    if (!token || !storedMembership) {
        window.location.href = "login.html";
        return;
    }

    let membership;

    try {
        membership = JSON.parse(storedMembership);
    } catch {
        sessionStorage.removeItem("smartbiz_membership");
        window.location.href = "login.html";
        return;
    }

    const businessId = membership.business_id;

    if (
        !businessId ||
        membership.membership_status !== "active" ||
        (membership.business_status &&
            membership.business_status !== "active")
    ) {
        showMessage("Your business membership is not active.");
        return;
    }

    if (
        !["owner", "manager", "cashier", "stock_manager"].includes(
            membership.role
        )
    ) {
        showMessage("You do not have permission to view sale details.");
        return;
    }

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar();
    }

    const elements = {
        message: document.getElementById("saleDetailsMessage"),
        content: document.getElementById("saleDetailsContent"),
        printButton: document.getElementById("printSaleBtn")
    };

    const params = new URLSearchParams(window.location.search);
    const saleId = Number(params.get("saleId"));

    const currencyFormatter = new Intl.NumberFormat("en-RW", {
        maximumFractionDigits: 0
    });

    function formatMoney(value) {
        return `RWF ${currencyFormatter.format(Number(value) || 0)}`;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function showMessage(message) {
        elements.message.textContent = message;
        elements.message.hidden = false;
    }

    function statusBadge(status) {
        const safeStatus = escapeHTML(status || "unknown");

        return `
            <span class="sales-status ${safeStatus}">
                ${safeStatus.replace(/_/g, " ")}
            </span>
        `;
    }

    function renderItems(items) {
        if (!items.length) {
            return `
                <tr>
                    <td colspan="5" class="sales-empty">
                        No sale items found.
                    </td>
                </tr>
            `;
        }

        return items.map(item => `
            <tr>
                <td>${escapeHTML(item.product_name)}</td>
                <td>${escapeHTML(item.sku || "—")}</td>
                <td>${escapeHTML(item.quantity)}</td>
                <td>${formatMoney(item.unit_price)}</td>
                <td>${formatMoney(item.subtotal)}</td>
            </tr>
        `).join("");
    }

    function renderPayments(payments) {
        if (!payments.length) {
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
                            <th>Payment date</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Type</th>
                            <th>Amount</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${payments.map(payment => `
                            <tr>
                                <td>${escapeHTML(formatDate(payment.created_at))}</td>
                                <td>${escapeHTML(payment.payment_method.replace(/_/g, " "))}</td>
                                <td>${escapeHTML(payment.transaction_reference || "—")}</td>
                                <td>${escapeHTML(payment.payment_type.replace(/_/g, " "))}</td>
                                <td>${formatMoney(payment.amount)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderSaleDetails(result) {
        const sale = result.sale;
        const items = Array.isArray(result.items) ? result.items : [];
        const payments = Array.isArray(result.payments)
            ? result.payments
            : [];

        elements.content.innerHTML = `
            <section class="sale-details-grid">
                <article class="sale-info-card">
                    <h2>Invoice information</h2>

                    <div class="sale-info-row">
                        <span>Invoice number</span>
                        <strong>${escapeHTML(sale.invoice_number)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Sale date</span>
                        <strong>${escapeHTML(formatDate(sale.created_at))}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Sale ID</span>
                        <strong>${escapeHTML(sale.sale_id)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Sale status</span>
                        <strong>${statusBadge(sale.sale_status)}</strong>
                    </div>
                </article>

                <article class="sale-info-card">
                    <h2>Customer and payment</h2>

                    <div class="sale-info-row">
                        <span>Customer</span>
                        <strong>${escapeHTML(sale.customer_name || "Walk-in customer")}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Payment status</span>
                        <strong>${statusBadge(sale.payment_status)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Amount paid</span>
                        <strong>${formatMoney(sale.amount_paid)}</strong>
                    </div>

                    <div class="sale-info-row">
                        <span>Balance due</span>
                        <strong>${formatMoney(sale.balance_due)}</strong>
                    </div>
                </article>
            </section>

            <section class="sales-panel sale-items-panel">
                <div class="sales-panel-heading">
                    <h2>Purchased products</h2>
                    <p>Products included in this invoice.</p>
                </div>

                <div class="sales-table-wrapper">
                    <table class="sales-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Quantity</th>
                                <th>Unit price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${renderItems(items)}
                        </tbody>
                    </table>
                </div>

                <div class="sale-total-block">
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
                        <span>Total amount</span>
                        <strong>${formatMoney(sale.total_amount)}</strong>
                    </div>
                </div>
            </section>

            <section class="sales-panel sale-payments-panel">
                <div class="sales-panel-heading">
                    <h2>Payment records</h2>
                    <p>Payments recorded against this invoice.</p>
                </div>

                ${renderPayments(payments)}
            </section>
        `;
    }

    elements.printButton.addEventListener("click", function () {
        window.print();
    });

    if (!Number.isSafeInteger(saleId) || saleId <= 0) {
        showMessage("A valid sale ID was not provided.");
        elements.content.innerHTML = "";
        return;
    }

    try {
        const response = await window.salesService.getSaleById(
            businessId,
            saleId
        );

        if (!response.data || !response.data.sale) {
            throw new Error("Sale details were not found.");
        }

        renderSaleDetails(response.data);
    } catch (error) {
        elements.content.innerHTML = "";
        showMessage(error.message);
    }
});