
(function () {
    "use strict";

    const state = {
        customerId: null,
        businessId: null,
        sales: [],
        payments: []
    };

    const elements = {
        name: document.getElementById("customerName"),
        phone: document.getElementById("customerPhone"),
        email: document.getElementById("customerEmail"),
        address: document.getElementById("customerAddress"),
        creditLimit: document.getElementById("customerCreditLimit"),
        outstanding: document.getElementById("customerOutstanding"),
        salesTable: document.getElementById("customerSalesTable"),
        paymentsTable: document.getElementById("customerPaymentsTable")
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function money(value) {
        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-RW", {
            style: "currency",
            currency: "RWF",
            maximumFractionDigits: 0
        }).format(Number.isFinite(amount) ? amount : 0);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getMembership() {
        try {
            return JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch {
            return null;
        }
    }

    function showMessage(message, type = "error") {
        let messageElement = document.getElementById("customerDetailsMessage");

        if (!messageElement) {
            messageElement = document.createElement("div");
            messageElement.id = "customerDetailsMessage";
            messageElement.setAttribute("role", "status");

            const container = document.querySelector("main");

            if (container) {
                container.prepend(messageElement);
            }
        }

        if (!messageElement) return;

        messageElement.textContent = message;
        messageElement.className = `customer-details-message ${type}`;
        messageElement.hidden = false;
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value ?? "—";
        }
    }

    function renderCustomer(customer) {
        if (!customer) {
            showMessage("Customer information could not be found.");
            return;
        }

        setText(elements.name, customer.customer_name);
        setText(elements.phone, customer.phone);
        setText(elements.email, customer.email);
        setText(elements.address, customer.address);
        setText(elements.creditLimit, money(customer.credit_limit));

        const outstanding = state.sales.reduce((total, sale) => {
            return total + Math.max(0, Number(sale.balance_due || 0));
        }, 0);

        setText(elements.outstanding, money(outstanding));

        document.title =
            `${customer.customer_name || "Customer"} | SmartBiz Rwanda`;
    }

    function renderSales() {
        if (!elements.salesTable) return;

        if (!state.sales.length) {
            elements.salesTable.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        No sales records found for this customer.
                    </td>
                </tr>
            `;
            return;
        }

        elements.salesTable.innerHTML = state.sales.map(sale => `
            <tr>
                <td>${escapeHTML(sale.invoice_number || sale.sale_id)}</td>
                <td>${escapeHTML(formatDate(sale.created_at))}</td>
                <td>${escapeHTML(money(sale.total_amount))}</td>
                <td>${escapeHTML(money(sale.amount_paid))}</td>
                <td>${escapeHTML(money(sale.balance_due))}</td>
                <td>${escapeHTML(sale.payment_status || "—")}</td>
                <td>${escapeHTML(sale.sale_status || "—")}</td>
                <td>
                    <a class="btn btn-outline btn-sm"
                       href="sale-details.html?saleId=${encodeURIComponent(sale.sale_id)}">
                        View
                    </a>
                </td>
            </tr>
        `).join("");
    }

    function renderPayments() {
        if (!elements.paymentsTable) return;

        if (!state.payments.length) {
            elements.paymentsTable.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        No payment records found.
                    </td>
                </tr>
            `;
            return;
        }

        elements.paymentsTable.innerHTML = state.payments.map(payment => `
            <tr>
                <td>${escapeHTML(payment.payment_id)}</td>
                <td>${escapeHTML(payment.sale_id)}</td>
                <td>${escapeHTML(formatDate(payment.payment_date))}</td>
                <td>${escapeHTML(money(payment.amount))}</td>
                <td>${escapeHTML(payment.payment_method || "—")}</td>
                <td>${escapeHTML(payment.payment_type || "—")}</td>
            </tr>
        `).join("");
    }

    async function loadCustomerDetails() {
        try {
            if (!window.authService || !window.customerService) {
                throw new Error("Required services are not available.");
            }

            const response = await window.customerService.getCustomerHistory(
                state.businessId,
                state.customerId
            );

            if (!response || response.status === "error") {
                throw new Error(
                    response?.message || "Unable to load customer history."
                );
            }

            const data = response.data || {};

            state.sales = Array.isArray(data.sales) ? data.sales : [];
            state.payments = Array.isArray(data.payments)
                ? data.payments
                : [];

            renderCustomer(data.customer);
            renderSales();
            renderPayments();

        } catch (error) {
            console.error("Customer details error:", error);
            showMessage(error.message || "Unable to load customer details.");
        }
    }

    function initializePage() {
        const token = sessionStorage.getItem("smartbiz_token");
        const membership = getMembership();

        if (!token || !membership || !membership.business_id) {
            window.location.href = "login.html";
            return;
        }

        state.businessId = membership.business_id;

        const params = new URLSearchParams(window.location.search);
        state.customerId = params.get("customerId");

        if (!state.customerId) {
            showMessage("No customer was selected.");
            return;
        }

        if (typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }

        loadCustomerDetails();
    }

    document.addEventListener("DOMContentLoaded", initializePage);
})();
