/*
 * SmartBiz Rwanda - Customer Debts
 */

document.addEventListener("DOMContentLoaded", async function () {

    const token = sessionStorage.getItem("smartbiz_token");
    const storedMembership = sessionStorage.getItem("smartbiz_membership");

    const tableBody = document.getElementById("debtsTableBody");
    const messageElement = document.getElementById("debtsMessage");

    let membership;
    let currentPage = 1;
    const pageLimit = 10;
    let totalPages = 1;
    let currentDebts = [];
    let selectedDebt = null;

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

    if (
        !["owner", "manager", "cashier"].includes(membership.role)
    ) {
        window.location.href = "dashboard.html";
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
                ? "debts-message success"
                : "debts-message";
        messageElement.hidden = false;
    }

    function clearMessage() {
        messageElement.hidden = true;
        messageElement.textContent = "";
    }

    function renderSummary(debts, pagination) {
        const pageBalance = debts.reduce(
            (total, debt) => total + Number(debt.balance_due || 0),
            0
        );

        const customerIds = new Set(
            debts.map(debt => String(debt.customer_id))
        );

        document.getElementById("debtInvoiceCount").textContent =
            Number(pagination.total || 0).toLocaleString();

        document.getElementById("debtPageBalance").textContent =
            money(pageBalance);

        document.getElementById("debtCustomerCount").textContent =
            customerIds.size.toLocaleString();
    }

    function renderDebts(debts) {
        if (!debts.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="debts-empty">
                        No outstanding customer invoices were found.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = debts.map(debt => {
            const paymentStatus = String(
                debt.payment_status || "unpaid"
            );

            return `
                <tr>
                    <td>
                        <a class="debts-invoice-link"
                           href="sale-details.html?saleId=${encodeURIComponent(debt.sale_id)}">
                            ${escapeHTML(debt.invoice_number || `#${debt.sale_id}`)}
                        </a>
                    </td>

                    <td>
                        <a class="debts-invoice-link"
                           href="customer-details.html?customerId=${encodeURIComponent(debt.customer_id)}">
                            ${escapeHTML(debt.customer_name || "Unknown customer")}
                        </a>
                    </td>

                    <td>${escapeHTML(debt.phone || "—")}</td>
                    <td>${formatDate(debt.created_at)}</td>
                    <td>${money(debt.total_amount)}</td>
                    <td>${money(debt.amount_paid)}</td>
                    <td class="debt-balance">${money(debt.balance_due)}</td>

                    <td>
                        <span class="debt-status ${escapeHTML(paymentStatus)}">
                            ${escapeHTML(paymentStatus.replaceAll("_", " "))}
                        </span>
                    </td>

                    <td>
                        <button type="button"
                            class="debt-pay-button"
                            data-sale-id="${escapeHTML(debt.sale_id)}">
                            Record Payment
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function loadDebts() {
        clearMessage();

        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="debts-empty">
                    Loading outstanding invoices...
                </td>
            </tr>
        `;

        try {
            const search = document.getElementById("debtSearch").value.trim();

            const response = await window.customerService.getDebts(
                businessId,
                {
                    page: currentPage,
                    limit: pageLimit,
                    search
                }
            );

            const debts = Array.isArray(response.data)
                ? response.data
                : [];

            const pagination = response.pagination || {
                total: debts.length,
                page: currentPage,
                limit: pageLimit,
                total_pages: 1
            };

            currentDebts = debts;
            totalPages = Math.max(1, Number(pagination.total_pages || 1));

            renderSummary(debts, pagination);
            renderDebts(debts);

            const total = Number(pagination.total || 0);
            const start = total === 0
                ? 0
                : ((currentPage - 1) * pageLimit) + 1;

            const end = Math.min(currentPage * pageLimit, total);

            document.getElementById("debtsPaginationInfo").textContent =
                `Showing ${start}-${end} of ${total} invoices`;

            document.getElementById("debtsCurrentPage").textContent =
                `Page ${currentPage} of ${totalPages}`;

            document.getElementById("debtsPrevious").disabled =
                currentPage <= 1;

            document.getElementById("debtsNext").disabled =
                currentPage >= totalPages;

        } catch (error) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="debts-empty">
                        Unable to load outstanding invoices.
                    </td>
                </tr>
            `;

            showMessage(
                error.message || "Unable to retrieve customer debts."
            );
        }
    }

    const modal = document.getElementById("debtPaymentModal");
    const paymentForm = document.getElementById("debtPaymentForm");
    const amountInput = document.getElementById("debtPaymentAmount");
    const saveButton = document.getElementById("saveDebtPayment");
    const modalMessage = document.getElementById("debtModalMessage");

    function showModalMessage(message) {
        modalMessage.textContent = message;
        modalMessage.className = "debt-modal-message";
        modalMessage.hidden = false;
    }

    function closePaymentModal() {
        modal.hidden = true;
        paymentForm.reset();
        modalMessage.hidden = true;
        selectedDebt = null;
    }

    function openPaymentModal(debt) {
        selectedDebt = debt;

        document.getElementById("debtModalInvoice").textContent =
            debt.invoice_number || `#${debt.sale_id}`;

        document.getElementById("debtModalCustomer").textContent =
            debt.customer_name || "Unknown customer";

        document.getElementById("debtModalBalance").textContent =
            money(debt.balance_due);

        amountInput.max = Number(debt.balance_due);
        amountInput.value = "";
        amountInput.placeholder =
            `Maximum ${Number(debt.balance_due).toLocaleString("en-RW")}`;

        document.getElementById("debtAmountHint").textContent =
            `The payment cannot exceed ${money(debt.balance_due)}.`;

        modalMessage.hidden = true;
        modal.hidden = false;
        amountInput.focus();
    }

    tableBody.addEventListener("click", function (event) {
        const button = event.target.closest(".debt-pay-button");

        if (!button) return;

        const saleId = button.dataset.saleId;

        const debt = currentDebts.find(
            item => String(item.sale_id) === String(saleId)
        );

        if (debt) {
            openPaymentModal(debt);
        }
    });

    document.getElementById("closeDebtModal").addEventListener(
        "click",
        closePaymentModal
    );

    document.getElementById("cancelDebtPayment").addEventListener(
        "click",
        closePaymentModal
    );

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closePaymentModal();
        }
    });

    document.getElementById("debtSearchButton").addEventListener(
        "click",
        function () {
            currentPage = 1;
            loadDebts();
        }
    );

    document.getElementById("debtSearch").addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                currentPage = 1;
                loadDebts();
            }
        }
    );

    document.getElementById("debtsPrevious").addEventListener(
        "click",
        function () {
            if (currentPage > 1) {
                currentPage--;
                loadDebts();
            }
        }
    );

    document.getElementById("debtsNext").addEventListener(
        "click",
        function () {
            if (currentPage < totalPages) {
                currentPage++;
                loadDebts();
            }
        }
    );

    paymentForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!selectedDebt) return;

        const amount = Number(amountInput.value);
        const balance = Number(selectedDebt.balance_due);

        if (!Number.isFinite(amount) || amount <= 0) {
            showModalMessage("Enter a valid payment amount.");
            return;
        }

        if (amount > balance) {
            showModalMessage(
                "The payment cannot be greater than the outstanding balance."
            );
            return;
        }

        const paymentData = {
            amount,
            payment_method:
                document.getElementById("debtPaymentMethod").value,
            transaction_reference:
                document.getElementById("debtPaymentReference").value.trim(),
            notes:
                document.getElementById("debtPaymentNotes").value.trim()
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            await window.customerService.recordDebtPayment(
                businessId,
                selectedDebt.sale_id,
                paymentData
            );

            closePaymentModal();
            showMessage("Customer payment recorded successfully.", "success");

            await loadDebts();

        } catch (error) {
            showModalMessage(
                error.message || "Unable to record the customer payment."
            );
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Record Payment";
        }
    });

    await loadDebts();
});
