/*
 * SmartBiz Rwanda - Customer Management
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
        sessionStorage.removeItem("smartbiz_token");
        sessionStorage.removeItem("smartbiz_membership");
        window.location.href = "login.html";
        return;
    }

    if (
        !membership.business_id ||
        membership.membership_status !== "active" ||
        (
            membership.business_status &&
            membership.business_status !== "active"
        )
    ) {
        window.location.href = "login.html";
        return;
    }

    const businessId = membership.business_id;
    const role = membership.role;

    const canManageCustomers = [
        "owner",
        "manager",
        "cashier"
    ].includes(role);

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    const elements = {
        userName: document.getElementById("userName"),
        message: document.getElementById("customersMessage"),

        totalCustomers: document.getElementById("totalCustomers"),
        activeCustomers: document.getElementById("activeCustomers"),
        customersWithDebt: document.getElementById("customersWithDebt"),
        totalOutstanding: document.getElementById("totalOutstanding"),

        search: document.getElementById("customerSearch"),
        statusFilter: document.getElementById("customerStatusFilter"),
        searchButton: document.getElementById("customerSearchButton"),

        tableBody: document.getElementById("customersTableBody"),

        paginationInfo: document.getElementById("customerPaginationInfo"),
        previousPage: document.getElementById("customerPreviousPage"),
        nextPage: document.getElementById("customerNextPage"),

        modal: document.getElementById("customerModal"),
        modalTitle: document.getElementById("customerModalTitle"),
        openModal: document.getElementById("openCustomerModal"),
        closeModal: document.getElementById("closeCustomerModal"),
        cancelModal: document.getElementById("cancelCustomerModal"),

        form: document.getElementById("customerForm"),
        customerName: document.getElementById("customerName"),
        customerPhone: document.getElementById("customerPhone"),
        customerEmail: document.getElementById("customerEmail"),
        customerAddress: document.getElementById("customerAddress"),
        customerCreditLimit: document.getElementById("customerCreditLimit"),
        saveButton: document.getElementById("saveCustomerButton")
    };

    let currentPage = 1;
    const pageLimit = 20;

    let totalPages = 1;
    let editingCustomerId = null;

    let currentCustomers = [];

    // Format currency.
    function formatMoney(value) {
        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-RW", {
            maximumFractionDigits: 2
        }).format(amount) + " RWF";
    }

    // Escape HTML before displaying database values.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
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

    // Display notification.
    function showMessage(message, type = "success") {
        elements.message.textContent = message;
        elements.message.className = `customer-alert ${type}`;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function clearMessage() {
        elements.message.textContent = "";
        elements.message.className = "customer-alert hidden";
    }

    // Format customer name.
    function getInitials(name) {
        return String(name || "Customer")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    }

    // Update summary using the customers currently returned.
    function updateSummary(customers, pagination) {
        const activeCount = customers.filter(
            customer => customer.status === "active"
        ).length;

        const debtCustomers = customers.filter(
            customer => Number(customer.outstanding_balance) > 0
        ).length;

        const outstanding = customers.reduce(
            (total, customer) =>
                total + Number(customer.outstanding_balance || 0),
            0
        );

        elements.totalCustomers.textContent =
            Number(pagination.total || 0).toLocaleString();

        elements.activeCustomers.textContent =
            activeCount.toLocaleString();

        elements.customersWithDebt.textContent =
            debtCustomers.toLocaleString();

        elements.totalOutstanding.textContent =
            formatMoney(outstanding);
    }

    // Render customer table.
    function renderCustomers(customers) {

        if (!customers.length) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="customer-empty">
                        No customers found.
                    </td>
                </tr>
            `;

            return;
        }

        elements.tableBody.innerHTML = customers.map(customer => {

            const customerId = Number(customer.customer_id);
            const customerName = escapeHTML(customer.customer_name);
            const status = customer.status;

            const outstanding = Number(
                customer.outstanding_balance || 0
            );

            const actions = `
                <div class="customer-actions">

                    <a
                        href="customer-details.html?customerId=${encodeURIComponent(customerId)}"
                        class="customer-action-button"
                    >
                        View
                    </a>

                    ${
                        canManageCustomers
                            ? `
                                <button
                                    type="button"
                                    class="customer-action-button"
                                    data-action="edit"
                                    data-id="${customerId}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="customer-action-button ${status === "active" ? "danger" : ""}"
                                    data-action="status"
                                    data-id="${customerId}"
                                    data-status="${status === "active" ? "inactive" : "active"}"
                                >
                                    ${status === "active" ? "Deactivate" : "Activate"}
                                </button>
                            `
                            : ""
                    }

                </div>
            `;

            return `
                <tr>

                    <td>
                        <div class="customer-name-cell">
                            <strong>${customerName}</strong>
                            <span>
                                Customer #${customerId}
                            </span>
                        </div>
                    </td>

                    <td>
                        ${escapeHTML(customer.phone || "Not provided")}
                    </td>

                    <td>
                        ${escapeHTML(customer.email || "Not provided")}
                    </td>

                    <td class="customer-money">
                        ${formatMoney(customer.credit_limit)}
                    </td>

                    <td class="customer-money ${outstanding > 0 ? "customer-debt" : ""}">
                        ${formatMoney(outstanding)}
                    </td>

                    <td>
                        <span class="customer-status ${escapeHTML(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>
            `;

        }).join("");
    }

    // Update pagination.
    function updatePagination(pagination) {
        totalPages = Math.max(
            1,
            Number(pagination.total_pages || 1)
        );

        const total = Number(pagination.total || 0);

        const start = total === 0
            ? 0
            : ((currentPage - 1) * pageLimit) + 1;

        const end = Math.min(
            currentPage * pageLimit,
            total
        );

        elements.paginationInfo.textContent =
            `Showing ${start}-${end} of ${total} customers`;

        elements.previousPage.disabled = currentPage <= 1;
        elements.nextPage.disabled = currentPage >= totalPages;
    }

    // Load customers.
    async function loadCustomers() {
        clearMessage();

        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="customer-empty">
                    Loading customers...
                </td>
            </tr>
        `;

        try {
            const response = await window.customerService.getCustomers(
                businessId,
                {
                    page: currentPage,
                    limit: pageLimit,
                    search: elements.search.value,
                    status: elements.statusFilter.value
                }
            );

            currentCustomers = response.data || [];

            const pagination = response.pagination || {
                total: currentCustomers.length,
                total_pages: 1
            };

            renderCustomers(currentCustomers);
            updatePagination(pagination);
            updateSummary(currentCustomers, pagination);

        } catch (error) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="customer-empty">
                        Unable to load customers.
                    </td>
                </tr>
            `;

            showMessage(error.message, "error");
        }
    }

    // Open customer modal.
    function openCustomerModal(customer = null) {
        if (!canManageCustomers) {
            return;
        }

        editingCustomerId = customer
            ? customer.customer_id
            : null;

        elements.form.reset();

        elements.modalTitle.textContent = customer
            ? "Edit Customer"
            : "Add New Customer";

        elements.saveButton.textContent = customer
            ? "Save Changes"
            : "Save Customer";

        if (customer) {
            elements.customerName.value =
                customer.customer_name || "";

            elements.customerPhone.value =
                customer.phone || "";

            elements.customerEmail.value =
                customer.email || "";

            elements.customerAddress.value =
                customer.address || "";

            elements.customerCreditLimit.value =
                customer.credit_limit || "0.00";
        } else {
            elements.customerCreditLimit.value = "0.00";
        }

        elements.modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        elements.customerName.focus();
    }

    // Close customer modal.
    function closeCustomerModal() {
        elements.modal.classList.add("hidden");
        document.body.style.overflow = "";

        elements.form.reset();
        editingCustomerId = null;
    }

    // Prepare customer form data.
    function getFormData() {
        return {
            customer_name: elements.customerName.value,
            phone: elements.customerPhone.value || null,
            email: elements.customerEmail.value || null,
            address: elements.customerAddress.value || null,
            credit_limit: elements.customerCreditLimit.value
        };
    }

    // Save customer.
    async function saveCustomer(event) {
        event.preventDefault();

        if (!canManageCustomers) {
            return;
        }

        const customerData = getFormData();

        if (!customerData.customer_name.trim()) {
            showMessage("Customer name is required.", "error");
            return;
        }

        const creditLimit = Number(customerData.credit_limit);

        if (
            !Number.isFinite(creditLimit) ||
            creditLimit < 0
        ) {
            showMessage("Enter a valid credit limit.", "error");
            return;
        }

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = "Saving...";

        try {
            if (editingCustomerId) {
                await window.customerService.updateCustomer(
                    businessId,
                    editingCustomerId,
                    customerData
                );

                closeCustomerModal();
                showMessage("Customer updated successfully.");

            } else {
                await window.customerService.createCustomer(
                    businessId,
                    customerData
                );

                closeCustomerModal();
                currentPage = 1;

                showMessage("Customer created successfully.");
            }

            await loadCustomers();

        } catch (error) {
            showMessage(error.message, "error");

        } finally {
            elements.saveButton.disabled = false;

            elements.saveButton.textContent =
                editingCustomerId
                    ? "Save Changes"
                    : "Save Customer";
        }
    }

    // Change customer status.
    async function changeCustomerStatus(customerId, status) {
        const customer = currentCustomers.find(
            item => Number(item.customer_id) === Number(customerId)
        );

        if (!customer) {
            return;
        }

        const action = status === "active"
            ? "activate"
            : "deactivate";

        const confirmed = window.confirm(
            `Are you sure you want to ${action} ${customer.customer_name}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await window.customerService.updateCustomerStatus(
                businessId,
                customerId,
                status
            );

            showMessage(
                `Customer ${status === "active" ? "activated" : "deactivated"} successfully.`
            );

            await loadCustomers();

        } catch (error) {
            showMessage(error.message, "error");
        }
    }

    // Customer table actions.
    elements.tableBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const action = button.dataset.action;
        const customerId = button.dataset.id;

        const customer = currentCustomers.find(
            item => Number(item.customer_id) === Number(customerId)
        );

        if (!customer) {
            return;
        }

        if (action === "edit") {
            openCustomerModal(customer);
        }

        if (action === "status") {
            changeCustomerStatus(
                customerId,
                button.dataset.status
            );
        }
    });

    // Search.
    function searchCustomers() {
        currentPage = 1;
        loadCustomers();
    }

    elements.searchButton.addEventListener(
        "click",
        searchCustomers
    );

    elements.search.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            searchCustomers();
        }
    });

    elements.statusFilter.addEventListener(
        "change",
        searchCustomers
    );

    // Pagination.
    elements.previousPage.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            loadCustomers();
        }
    });

    elements.nextPage.addEventListener("click", function () {
        if (currentPage < totalPages) {
            currentPage++;
            loadCustomers();
        }
    });

    // Modal events.
    elements.openModal.addEventListener("click", function () {
        openCustomerModal();
    });

    elements.closeModal.addEventListener(
        "click",
        closeCustomerModal
    );

    elements.cancelModal.addEventListener(
        "click",
        closeCustomerModal
    );

    elements.modal.addEventListener("click", function (event) {
        if (event.target === elements.modal) {
            closeCustomerModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            !elements.modal.classList.contains("hidden")
        ) {
            closeCustomerModal();
        }
    });

    elements.form.addEventListener("submit", saveCustomer);

    // Display user role.
    elements.userName.textContent =
        membership.user_name || membership.full_name || "Business User";

    // Hide customer management controls for read-only roles.
    if (!canManageCustomers) {
        elements.openModal.classList.add("hidden");
    }

    // Initial load.
    await loadCustomers();

});