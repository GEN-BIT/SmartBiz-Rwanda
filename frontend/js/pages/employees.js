
document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("employeeModal");
    const addEmployeeBtn = document.getElementById("addEmployeeBtn");
    const employeeForm = document.getElementById("employeeForm");
    const formMessage = document.getElementById("employeeFormMessage");
    const saveEmployeeBtn = document.getElementById("saveEmployeeBtn");

    const searchInput = document.getElementById("employeeSearch");
    const roleFilter = document.getElementById("employeeRoleFilter");
    const statusFilter = document.getElementById("employeeStatusFilter");
    const resetFiltersBtn = document.getElementById("resetEmployeeFilters");

    const tableBody = document.getElementById("employeesTableBody");
    const employeeCount = document.getElementById("employeeCount");
    const pageInfo = document.getElementById("employeePageInfo");
    const previousBtn = document.getElementById("previousEmployeePage");
    const nextBtn = document.getElementById("nextEmployeePage");

    const membership = getMembership();
    const token = sessionStorage.getItem("smartbiz_token");

    const state = {
        page: 1,
        limit: 10,
        totalPages: 1,
        total: 0,
        loading: false,
        search: "",
        role: "",
        status: "",
        employees: [],
        isOwner: membership && membership.role === "owner"
    };

    let searchTimeout;

    function getMembership() {
        try {
            return JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch (error) {
            return null;
        }
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

    function formatRole(role) {
        const roles = {
            owner: "Owner",
            manager: "Manager",
            cashier: "Cashier",
            stock_manager: "Stock Manager"
        };

        return roles[role] || role || "Unknown";
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value).slice(0, 10);
        }

        return date.toLocaleDateString();
    }

    function showTableMessage(message) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="employee-empty">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    function updateStatistics(statistics = {}) {
        document.getElementById("totalEmployees").textContent =
            statistics.total_employees ?? 0;

        document.getElementById("activeEmployees").textContent =
            statistics.active_employees ?? 0;

        document.getElementById("inactiveEmployees").textContent =
            statistics.inactive_employees ?? 0;

        employeeCount.textContent =
            `${state.total} ${state.total === 1 ? "employee" : "employees"}`;
    }

    function renderActions(employee) {
        if (!state.isOwner || employee.role === "owner") {
            return "—";
        }

        const employeeId = escapeHTML(employee.employee_id);
        const currentRole = escapeHTML(employee.role);
        const isActive = employee.status === "active";

        return `
            <div class="employee-actions" data-employee-id="${employeeId}">
                <select class="employee-action-role"
                        aria-label="Change role for ${escapeHTML(employee.full_name)}">
                    <option value="manager" ${currentRole === "manager" ? "selected" : ""}>Manager</option>
                    <option value="cashier" ${currentRole === "cashier" ? "selected" : ""}>Cashier</option>
                    <option value="stock_manager" ${currentRole === "stock_manager" ? "selected" : ""}>Stock Manager</option>
                </select>
                <button type="button"
                        class="btn btn-sm ${isActive ? "btn-secondary" : "btn-primary"} employee-status-action"
                        data-status="${isActive ? "inactive" : "active"}">
                    ${isActive ? "Deactivate" : "Activate"}
                </button>
            </div>
        `;
    }

    function renderEmployees() {
        if (!state.employees.length) {
            showTableMessage("No employee records match your search.");
            return;
        }

        tableBody.innerHTML = state.employees.map(function (employee) {
            const statusClass = employee.status === "active"
                ? "status-active"
                : "status-inactive";

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(employee.full_name || "Unnamed employee")}</strong>
                        <br>
                        <small>${escapeHTML(employee.email || "")}</small>
                        ${employee.phone ? `<br><small>${escapeHTML(employee.phone)}</small>` : ""}
                    </td>
                    <td>${escapeHTML(formatRole(employee.role))}</td>
                    <td>${escapeHTML(formatDate(employee.hired_at))}</td>
                    <td>
                        <span class="${statusClass}">
                            ${escapeHTML(employee.status || "Unknown")}
                        </span>
                    </td>
                    <td>${renderActions(employee)}</td>
                </tr>
            `;
        }).join("");
    }

    function updatePagination(pagination = {}) {
        state.page = Number(pagination.page) || 1;
        state.totalPages = Number(pagination.total_pages) || 1;
        state.total = Number(pagination.total) || 0;

        pageInfo.textContent =
            `Page ${state.page} of ${state.totalPages}`;

        previousBtn.disabled = state.loading || state.page <= 1;
        nextBtn.disabled =
            state.loading || state.page >= state.totalPages;
    }

    async function loadEmployees() {
        if (!membership || !membership.business_id || !token) {
            showTableMessage("Please sign in with an active business account.");
            return;
        }

        state.loading = true;
        previousBtn.disabled = true;
        nextBtn.disabled = true;
        showTableMessage("Loading employee records...");

        try {
            const response = await window.employeeService.getEmployees(
                membership.business_id,
                {
                    page: state.page,
                    limit: state.limit,
                    search: state.search,
                    role: state.role,
                    status: state.status
                }
            );

            const data = response.data || {};

            state.employees = data.employees || [];
            state.total = Number(data.pagination?.total) || 0;

            updateStatistics(data.statistics || {});
            updatePagination(data.pagination || {});
            renderEmployees();
        } catch (error) {
            state.employees = [];
            state.total = 0;
            updateStatistics({});
            updatePagination({ page: 1, total_pages: 1, total: 0 });
            showTableMessage(error.message || "Unable to load employees.");
        } finally {
            state.loading = false;
            previousBtn.disabled = state.page <= 1;
            nextBtn.disabled = state.page >= state.totalPages;
        }
    }

    function openModal() {
        employeeForm.reset();
        formMessage.textContent = "";
        formMessage.className = "form-message";
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        document.getElementById("employeeFullName").focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = "";
        employeeForm.reset();
        formMessage.textContent = "";
        saveEmployeeBtn.disabled = false;
        saveEmployeeBtn.textContent = "Save Employee";
    }

    async function handleCreateEmployee(event) {
        event.preventDefault();

        if (!membership || !membership.business_id) {
            formMessage.textContent =
                "Your business session could not be identified. Please sign in again.";
            return;
        }

        const formData = new FormData(employeeForm);

        const employeeData = {
            full_name: String(formData.get("full_name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            password: String(formData.get("password") || ""),
            role: String(formData.get("role") || "")
        };

        if (employeeData.password.length < 12) {
            formMessage.textContent =
                "The initial password must contain at least 12 characters.";
            return;
        }

        saveEmployeeBtn.disabled = true;
        saveEmployeeBtn.textContent = "Saving...";
        formMessage.textContent = "";

        try {
            await window.employeeService.createEmployee(
                membership.business_id,
                employeeData
            );

            closeModal();
            state.page = 1;
            await loadEmployees();
        } catch (error) {
            formMessage.textContent =
                error.message || "Unable to create the employee.";
        } finally {
            saveEmployeeBtn.disabled = false;
            saveEmployeeBtn.textContent = "Save Employee";
        }
    }

    async function handleTableAction(event) {
        const actionContainer = event.target.closest("[data-employee-id]");

        if (!actionContainer || !state.isOwner || state.loading) {
            return;
        }

        const employeeId = actionContainer.dataset.employeeId;

        if (event.target.classList.contains("employee-status-action")) {
            const newStatus = event.target.dataset.status;
            const button = event.target;

            button.disabled = true;

            try {
                await window.employeeService.updateEmployee(
                    membership.business_id,
                    employeeId,
                    { status: newStatus }
                );

                await loadEmployees();
            } catch (error) {
                alert(error.message || "Unable to update employee status.");
                button.disabled = false;
            }
        }

        if (event.target.classList.contains("employee-action-role")) {
            const employee = state.employees.find(function (item) {
                return String(item.employee_id) === String(employeeId);
            });

            if (!employee || event.target.value === employee.role) {
                return;
            }

            const select = event.target;
            select.disabled = true;

            try {
                await window.employeeService.updateEmployee(
                    membership.business_id,
                    employeeId,
                    { role: select.value }
                );

                await loadEmployees();
            } catch (error) {
                alert(error.message || "Unable to update employee role.");
                select.value = employee.role;
                select.disabled = false;
            }
        }
    }

    if (typeof window.renderSidebar === "function" && membership) {
        window.renderSidebar(membership);
    }

    if (!membership || !membership.business_id || !token) {
        showTableMessage("Please sign in to access employee management.");
        addEmployeeBtn.hidden = true;
        updateStatistics({});
        updatePagination({});
        return;
    }

    if (!state.isOwner) {
        addEmployeeBtn.hidden = true;
    }

    addEmployeeBtn.addEventListener("click", openModal);

    document.querySelectorAll("[data-close-employee-modal]")
        .forEach(function (button) {
            button.addEventListener("click", closeModal);
        });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeModal();
    });

    employeeForm.addEventListener("submit", handleCreateEmployee);
    tableBody.addEventListener("click", handleTableAction);
    tableBody.addEventListener("change", handleTableAction);

    searchInput.addEventListener("input", function () {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(function () {
            state.search = searchInput.value.trim();
            state.page = 1;
            loadEmployees();
        }, 350);
    });

    roleFilter.addEventListener("change", function () {
        state.role = roleFilter.value;
        state.page = 1;
        loadEmployees();
    });

    statusFilter.addEventListener("change", function () {
        state.status = statusFilter.value;
        state.page = 1;
        loadEmployees();
    });

    resetFiltersBtn.addEventListener("click", function () {
        searchInput.value = "";
        roleFilter.value = "";
        statusFilter.value = "";

        state.search = "";
        state.role = "";
        state.status = "";
        state.page = 1;

        loadEmployees();
    });

    previousBtn.addEventListener("click", function () {
        if (state.page > 1 && !state.loading) {
            state.page -= 1;
            loadEmployees();
        }
    });

    nextBtn.addEventListener("click", function () {
        if (state.page < state.totalPages && !state.loading) {
            state.page += 1;
            loadEmployees();
        }
    });

    loadEmployees();
});
