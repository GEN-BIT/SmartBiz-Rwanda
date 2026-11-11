/*
 * SmartBiz Rwanda - Suppliers Page
 */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    let membership;
    let businessId;
    let currentPage = 1;
    const pageSize = 10;
    let editingSupplierId = null;
    let totalPages = 1;
    let searchTimer = null;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function showMessage(message, type = "error") {
        const element = $("supplierMessage");
        element.textContent = message;
        element.className = `supplier-message ${type}`;
        element.hidden = false;
    }

    function hideMessage() {
        $("supplierMessage").hidden = true;
        $("supplierMessage").textContent = "";
    }

    function showFormMessage(message, type = "error") {
        const element = $("supplierFormMessage");
        element.textContent = message;
        element.className = `modal-form-message ${type}`;
        element.hidden = false;
    }

    function hideFormMessage() {
        $("supplierFormMessage").hidden = true;
        $("supplierFormMessage").textContent = "";
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

    function setUserDetails() {
        const name = membership.user_name ||
            membership.full_name ||
            membership.name ||
            membership.email ||
            "User";

        $("currentUserName").textContent = name;
        $("currentUserRole").textContent = membership.role || "Team member";
        $("currentUserAvatar").textContent = name.charAt(0).toUpperCase();
    }

    function openModal(supplier = null) {
        editingSupplierId = supplier ? supplier.supplier_id : null;
        $("supplierModalTitle").textContent = supplier ? "Edit supplier" : "Add supplier";
        $("saveSupplierBtn").textContent = supplier ? "Save changes" : "Save supplier";

        $("supplierName").value = supplier?.supplier_name || "";
        $("supplierContact").value = supplier?.contact_person || "";
        $("supplierPhone").value = supplier?.phone || "";
        $("supplierEmail").value = supplier?.email || "";
        $("supplierAddress").value = supplier?.address || "";

        hideFormMessage();
        $("supplierModal").hidden = false;
        document.body.classList.add("modal-open");
        $("supplierName").focus();
    }

    function closeModal() {
        $("supplierModal").hidden = true;
        document.body.classList.remove("modal-open");
        $("supplierForm").reset();
        editingSupplierId = null;
        hideFormMessage();
    }

    function renderRows(suppliers) {
        const body = $("supplierTableBody");

        if (!suppliers.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="7" class="table-empty">
                        No suppliers found. Add a supplier to get started.
                    </td>
                </tr>`;
            return;
        }

        body.innerHTML = suppliers.map((supplier) => {
            const active = supplier.status === "active";
            const supplierId = Number(supplier.supplier_id);

            return `
                <tr>
                    <td>
                        <div class="supplier-name-cell">
                            <strong>${escapeHTML(supplier.supplier_name)}</strong>
                            <small>Supplier #${escapeHTML(supplier.supplier_id)}</small>
                        </div>
                    </td>
                    <td>${escapeHTML(supplier.contact_person || "—")}</td>
                    <td>${escapeHTML(supplier.phone || "—")}</td>
                    <td>${escapeHTML(supplier.email || "—")}</td>
                    <td>
                        <span class="supplier-status ${active ? "active" : "inactive"}">
                            ${escapeHTML(supplier.status)}
                        </span>
                    </td>
                    <td>${formatDate(supplier.created_at)}</td>
                    <td>
                        <div class="supplier-actions">
                            <button class="supplier-action-btn" type="button"
                                data-action="edit" data-id="${supplierId}">Edit</button>
                            <button class="supplier-action-btn ${active ? "danger" : ""}"
                                type="button" data-action="status" data-id="${supplierId}"
                                data-status="${active ? "inactive" : "active"}">
                                ${active ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join("");
    }

    async function loadSummary() {
        try {
            const [allResult, activeResult, inactiveResult] = await Promise.all([
                window.supplierService.getSuppliers(businessId, { page: 1, limit: 1 }),
                window.supplierService.getSuppliers(businessId, {
                    page: 1, limit: 1, status: "active"
                }),
                window.supplierService.getSuppliers(businessId, {
                    page: 1, limit: 1, status: "inactive"
                })
            ]);

            $("totalSuppliers").textContent =
                Number(allResult.pagination?.total || 0).toLocaleString();

            $("activeSuppliers").textContent =
                Number(activeResult.pagination?.total || 0).toLocaleString();

            $("inactiveSuppliers").textContent =
                Number(inactiveResult.pagination?.total || 0).toLocaleString();
        } catch (error) {
            console.error("Supplier summary:", error);
        }
    }

    async function loadSuppliers() {
        hideMessage();
        $("supplierTableBody").innerHTML =
            '<tr><td colspan="7" class="table-empty">Loading suppliers...</td></tr>';

        const filters = {
            page: currentPage,
            limit: pageSize,
            search: $("supplierSearch").value.trim(),
            status: $("supplierStatusFilter").value
        };

        try {
            const result = await window.supplierService.getSuppliers(
                businessId,
                filters
            );

            const suppliers = Array.isArray(result.data) ? result.data : [];
            const pagination = result.pagination || {};

            totalPages = Math.max(1, Number(pagination.total_pages) || 1);
            currentPage = Number(pagination.page) || currentPage;

            renderRows(suppliers);

            const total = Number(pagination.total || 0);
            const start = total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
            const end = Math.min(currentPage * pageSize, total);

            $("supplierPaginationInfo").textContent =
                `Showing ${start}-${end} of ${total} suppliers`;

            $("supplierPageNumber").textContent =
                `Page ${currentPage} of ${totalPages}`;

            $("supplierPrevPage").disabled = currentPage <= 1;
            $("supplierNextPage").disabled = currentPage >= totalPages;

            await loadSummary();
        } catch (error) {
            console.error(error);
            $("supplierTableBody").innerHTML =
                '<tr><td colspan="7" class="table-empty">Unable to load suppliers.</td></tr>';
            showMessage(error.message || "Unable to load suppliers.");
        }
    }

    async function saveSupplier(event) {
        event.preventDefault();
        hideFormMessage();

        const supplierData = {
            supplier_name: $("supplierName").value,
            contact_person: $("supplierContact").value,
            phone: $("supplierPhone").value,
            email: $("supplierEmail").value,
            address: $("supplierAddress").value
        };

        if (!supplierData.supplier_name.trim()) {
            showFormMessage("Supplier name is required.");
            $("supplierName").focus();
            return;
        }

        const button = $("saveSupplierBtn");
        button.disabled = true;
        button.textContent = "Saving...";

        try {
            if (editingSupplierId) {
                await window.supplierService.updateSupplier(
                    businessId,
                    editingSupplierId,
                    supplierData
                );
            } else {
                await window.supplierService.createSupplier(
                    businessId,
                    supplierData
                );
            }

            closeModal();
            currentPage = 1;
            await loadSuppliers();
            showMessage(
                editingSupplierId
                    ? "Supplier updated successfully."
                    : "Supplier created successfully.",
                "success"
            );
        } catch (error) {
            showFormMessage(error.message || "Unable to save supplier.");
        } finally {
            button.disabled = false;
            button.textContent = editingSupplierId ? "Save changes" : "Save supplier";
        }
    }

    async function handleTableAction(event) {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const supplierId = button.dataset.id;
        const action = button.dataset.action;

        if (action === "edit") {
            const row = button.closest("tr");
            const cells = row.querySelectorAll("td");

            try {
                const result = await window.supplierService.getSupplier(
                    businessId,
                    supplierId
                );
                const supplier = result.data;
                openModal(supplier);
            } catch (error) {
                showMessage(error.message || "Unable to load supplier details.");
            }
            return;
        }

        if (action === "status") {
            const nextStatus = button.dataset.status;
            const confirmed = window.confirm(
                `Are you sure you want to ${nextStatus === "active" ? "activate" : "deactivate"} this supplier?`
            );

            if (!confirmed) return;

            button.disabled = true;

            try {
                await window.supplierService.updateSupplierStatus(
                    businessId,
                    supplierId,
                    nextStatus
                );
                await loadSuppliers();
                showMessage("Supplier status updated successfully.", "success");
            } catch (error) {
                showMessage(error.message || "Unable to update supplier status.");
                button.disabled = false;
            }
        }
    }

    function initialiseSidebar() {
        if (typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }

        const menuButton = $("mobileMenuBtn");
        if (menuButton) {
            menuButton.addEventListener("click", () => {
                document.body.classList.toggle("sidebar-open");
            });
        }

        const overlay = $("sidebarOverlay");
        if (overlay) {
            overlay.addEventListener("click", () => {
                document.body.classList.remove("sidebar-open");
            });
        }
    }

    function initialise() {
        const token = sessionStorage.getItem("smartbiz_token");

        try {
            membership = JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch (error) {
            membership = null;
        }

        if (!token || !membership) {
            window.location.href = "login.html";
            return;
        }

        if (
            membership.membership_status !== "active" ||
            (membership.business_status &&
                membership.business_status !== "active")
        ) {
            window.location.href = "login.html";
            return;
        }

        if (!["owner", "manager", "stock_manager"].includes(membership.role)) {
            document.querySelector(".suppliers-page").innerHTML = `
                <div class="supplier-panel" style="padding:30px;text-align:center">
                    <h2>Access restricted</h2>
                    <p>Your role does not have permission to manage suppliers.</p>
                    <a class="secondary-btn" href="dashboard.html">Return to dashboard</a>
                </div>`;
            return;
        }

        businessId = membership.business_id;
        if (!businessId) {
            window.location.href = "login.html";
            return;
        }

        setUserDetails();
        initialiseSidebar();

        $("addSupplierBtn").addEventListener("click", () => openModal());
        $("closeSupplierModal").addEventListener("click", closeModal);
        $("cancelSupplierBtn").addEventListener("click", closeModal);
        $("supplierForm").addEventListener("submit", saveSupplier);
        $("supplierTableBody").addEventListener("click", handleTableAction);

        $("supplierSearch").addEventListener("input", () => {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(() => {
                currentPage = 1;
                loadSuppliers();
            }, 300);
        });

        $("supplierStatusFilter").addEventListener("change", () => {
            currentPage = 1;
            loadSuppliers();
        });

        $("supplierPrevPage").addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                loadSuppliers();
            }
        });

        $("supplierNextPage").addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadSuppliers();
            }
        });

        $("supplierModal").addEventListener("click", (event) => {
            if (event.target === $("supplierModal")) closeModal();
        });

        loadSuppliers();
    }

    document.addEventListener("DOMContentLoaded", initialise);
})();
