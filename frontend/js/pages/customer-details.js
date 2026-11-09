/*
 * SmartBiz Rwanda - Customer Details Page
 */

document.addEventListener("DOMContentLoaded", async function () {

    const token = sessionStorage.getItem("smartbiz_token");
    const storedMembership = sessionStorage.getItem("smartbiz_membership");

    const loadingElement = document.getElementById("customerDetailsLoading");
    const contentElement = document.getElementById("customerDetailsContent");
    const messageElement = document.getElementById("customerDetailsMessage");

    let membership;

    if (!token || !storedMembership) {
        window.location.href = "login.html";
        return;
    }

    try {
        membership = JSON.parse(storedMembership);
    } catch (error) {
        sessionStorage.removeItem("smartbiz_membership");
        window.location.href = "login.html";
        return;
    }

    if (
        !membership.business_id ||
        membership.membership_status !== "active" ||
        (membership.business_status &&
            membership.business_status !== "active")
    ) {
        window.location.href = "login.html";
        return;
    }

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    const userName =
        membership.user_name ||
        membership.full_name ||
        membership.name ||
        "User";

    document.getElementById("topbarUserName").textContent = userName;
    document.getElementById("topbarUserRole").textContent =
        String(membership.role || "Business member").replaceAll("_", " ");

    document.getElementById("userAvatar").textContent =
        userName.charAt(0).toUpperCase();

    const businessId = membership.business_id;
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("customerId");

    let currentCustomer = null;

    const currencyFormatter = new Intl.NumberFormat("en-RW", {
        style: "currency",
        currency: "RWF",
        maximumFractionDigits: 0
    });

    function money(value) {
        return currencyFormatter.format(Number(value || 0));
    }

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

    function showMessage(message, type = "error") {
        messageElement.textContent = message;
        messageElement.className =
            type === "success"
                ? "page-message success"
                : "page-message";
        messageElement.hidden = false;
    }

    function hideLoading() {
        loadingElement.hidden = true;
    }

    function renderSales(sales) {
        const tbody = document.getElementById("customerSalesTable");

        document.getElementById("salesHistoryCount").textContent =
            `${sales.length} records`;

        if (!sales.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
                        No sales have been recorded for this customer.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sales.map(sale => {
            const paymentStatus = String(sale.payment_status || "unpaid");
            const saleStatus = String(sale.sale_status || "completed");

            return `
                <tr>
                    <td>
                        <a class="invoice-link"
                           href="sale-details.html?saleId=${encodeURIComponent(sale.sale_id)}">
                            ${escapeHTML(sale.invoice_number || `#${sale.sale_id}`)}
                        </a>
                    </td>
                    <td>${formatDate(sale.created_at)}</td>
                    <td>${money(sale.total_amount)}</td>
                    <td>${money(sale.amount_paid)}</td>
                    <td>${money(sale.balance_due)}</td>
                    <td>
                        <span class="payment-status ${escapeHTML(paymentStatus)}">
                            ${escapeHTML(paymentStatus.replaceAll("_", " "))}
                        </span>
                    </td>
                    <td>
                        <span class="sale-status ${escapeHTML(saleStatus)}">
                            ${escapeHTML(saleStatus.replaceAll("_", " "))}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderPayments(payments) {
        const tbody = document.getElementById("customerPaymentsTable");

        document.getElementById("paymentHistoryCount").textContent =
            `${payments.length} records`;

        if (!payments.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty">
                        No payments have been recorded for this customer.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${formatDate(payment.payment_date)}</td>
                <td>
                    ${payment.sale_id
                        ? escapeHTML(`#${payment.sale_id}`)
                        : "—"}
                </td>
                <td>${money(payment.amount)}</td>
                <td>${escapeHTML(
                    String(payment.payment_method || "other").replaceAll("_", " ")
                )}</td>
                <td>${escapeHTML(
                    String(payment.payment_type || "sale_payment").replaceAll("_", " ")
                )}</td>
                <td>${escapeHTML(payment.transaction_reference || "—")}</td>
            </tr>
        `).join("");
    }

    function renderCustomer(history) {
        const customer = history.customer;
        const sales = Array.isArray(history.sales) ? history.sales : [];
        const payments = Array.isArray(history.payments) ? history.payments : [];

        currentCustomer = customer;

        const completedSales = sales.filter(
            sale => sale.sale_status === "completed"
        );

        const totalSpent = completedSales.reduce(
            (total, sale) => total + Number(sale.total_amount || 0),
            0
        );

        const outstanding = sales.reduce(
            (total, sale) => {
                if (sale.sale_status !== "completed") return total;
                return total + Number(sale.balance_due || 0);
            },
            0
        );

        const paymentsTotal = payments
            .filter(payment => payment.payment_type !== "refund")
            .reduce(
                (total, payment) => total + Number(payment.amount || 0),
                0
            );

        const openBalances = completedSales.filter(
            sale => Number(sale.balance_due || 0) > 0
        ).length;

        const customerName = customer.customer_name || "Customer";

        document.getElementById("customerPageTitle").textContent =
            customerName;

        document.getElementById("customerName").textContent = customerName;
        document.getElementById("customerAvatar").textContent =
            customerName.charAt(0).toUpperCase();

        document.getElementById("customerContact").textContent =
            customer.phone || customer.email || "No contact information";

        document.getElementById("customerId").textContent =
            customer.customer_id;

        document.getElementById("customerSince").textContent =
            formatDate(customer.created_at);

        document.getElementById("customerPhone").textContent =
            customer.phone || "Not provided";

        document.getElementById("customerEmail").textContent =
            customer.email || "Not provided";

        document.getElementById("customerAddress").textContent =
            customer.address || "Not provided";

        document.getElementById("customerStatus").textContent =
            customer.status || "active";

        document.getElementById("customerStatus").className =
            `status-badge ${customer.status === "inactive" ? "inactive" : ""}`;

        document.getElementById("customerAccountStatus").textContent =
            customer.status || "active";

        document.getElementById("customerTotalPurchases").textContent =
            completedSales.length.toLocaleString();

        document.getElementById("customerTotalSpent").textContent =
            money(totalSpent);

        document.getElementById("customerOutstanding").textContent =
            money(outstanding);

        document.getElementById("customerCreditLimit").textContent =
            money(customer.credit_limit);

        document.getElementById("customerPaymentCount").textContent =
            payments.length.toLocaleString();

        document.getElementById("customerPaymentsTotal").textContent =
            money(paymentsTotal);

        document.getElementById("customerOpenBalances").textContent =
            openBalances.toLocaleString();

        renderSales(sales);
        renderPayments(payments);

        document.getElementById("editCustomerButton").disabled = false;
        contentElement.hidden = false;
    }

    document.getElementById("editCustomerButton").addEventListener(
        "click",
        function () {
            if (!currentCustomer) return;

            window.location.href =
                `customers.html?editCustomer=${encodeURIComponent(currentCustomer.customer_id)}`;
        }
    );

    if (!customerId || !/^\d+$/.test(customerId)) {
        hideLoading();
        showMessage("A valid customer ID was not provided.");
        return;
    }

    try {
        const response = await window.customerService.getCustomerHistory(
            businessId,
            customerId
        );

        if (!response.data || !response.data.customer) {
            throw new Error("Customer information could not be found.");
        }

        renderCustomer(response.data);
    } catch (error) {
        showMessage(error.message || "Unable to load customer information.");
    } finally {
        hideLoading();
    }
});
