document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("employeeModal");
    const addEmployeeBtn = document.getElementById("addEmployeeBtn");
    const employeeForm = document.getElementById("employeeForm");
    const formMessage = document.getElementById("employeeFormMessage");

    const searchInput = document.getElementById("employeeSearch");
    const roleFilter = document.getElementById("employeeRoleFilter");
    const statusFilter = document.getElementById("employeeStatusFilter");
    const resetFiltersBtn = document.getElementById("resetEmployeeFilters");

    const employeesTableBody = document.getElementById("employeesTableBody");

    let employees = [];

    function getMembership() {
        try {
            return JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch (error) {
            return null;
        }
    }

    function openModal() {
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        formMessage.textContent = "";
    }

    function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = "";
        employeeForm.reset();
        formMessage.textContent = "";
    }

    function formatRole(role) {
        const roles = {
            owner: "Owner",
            manager: "Manager",
            cashier: "Cashier",
            stock_manager: "Stock Manager"
        };

        return roles[role] || role || "—";
    }

    function updateStatistics() {
        const total = employees.length;
        const active = employees.filter(function (employee) {
            return employee.status === "active";
        }).length;

        const inactive = employees.filter(function (employee) {
            return employee.status === "inactive";
        }).length;

        document.getElementById("totalEmployees").textContent = total;
        document.getElementById("activeEmployees").textContent = active;
        document.getElementById("inactiveEmployees").textContent = inactive;

        document.getElementById("employeeCount").textContent =
            total + (total === 1 ? " employee" : " employees");
    }

    function renderEmployees() {
        const searchValue = searchInput.value.toLowerCase();
        const selectedRole = roleFilter.value;
        const selectedStatus = statusFilter.value;

        const filteredEmployees = employees.filter(function (employee) {
            const name = (employee.full_name || "").toLowerCase();
            const email = (employee.email || "").toLowerCase();

            const matchesSearch =
                name.includes(searchValue) || email.includes(searchValue);

            const matchesRole =
                !selectedRole || employee.role === selectedRole;

            const matchesStatus =
                !selectedStatus || employee.status === selectedStatus;

            return matchesSearch && matchesRole && matchesStatus;
        });

        if (filteredEmployees.length === 0) {
            employeesTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="employee-empty">
                        No employee records are available.
                    </td>
                </tr>
            `;
            return;
        }

        employeesTableBody.innerHTML = filteredEmployees.map(function (employee) {
            const statusClass = employee.status === "active"
                ? "status-active"
                : "status-inactive";

            return `
                <tr>
                    <td>
                        <strong>${escapeHTML(employee.full_name || "Unnamed employee")}</strong>
                        <br>
                        <small>${escapeHTML(employee.email || "")}</small>
                    </td>
                    <td>${escapeHTML(formatRole(employee.role))}</td>
                    <td>${escapeHTML(employee.hired_at || "—")}</td>
                    <td>
                        <span class="${statusClass}">
                            ${escapeHTML(employee.status || "Unknown")}
                        </span>
                    </td>
                    <td>—</td>
                </tr>
            `;
        }).join("");
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
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

    addEmployeeBtn.addEventListener("click", openModal);

    document.querySelectorAll("[data-close-employee-modal]").forEach(function (button) {
        button.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    searchInput.addEventListener("input", renderEmployees);
    roleFilter.addEventListener("change", renderEmployees);
    statusFilter.addEventListener("change", renderEmployees);

    resetFiltersBtn.addEventListener("click", function () {
        searchInput.value = "";
        roleFilter.value = "";
        statusFilter.value = "";
        renderEmployees();
    });

    employeeForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const membership = getMembership();

        if (!membership || !membership.business_id) {
            formMessage.textContent =
                "Your business session could not be identified. Please sign in again.";
            return;
        }

        formMessage.textContent =
            "Employee saving is not connected yet. The employee API contract must be completed before records can be created.";
    });

    const membership = getMembership();

    if (!membership) {
        document.getElementById("employeesTableBody").innerHTML = `
            <tr>
                <td colspan="5" class="employee-empty">
                    Please sign in to access employee management.
                </td>
            </tr>
        `;
    }

    updateStatistics();

    document.getElementById("employeePageInfo").textContent = "Page 1";
});