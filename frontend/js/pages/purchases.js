/*
 * SmartBiz Rwanda - Purchases Page
 */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    let membership;
    let businessId;
    let currentPage = 1;
    let totalPages = 1;
    let suppliers = [];
    let products = [];
    let searchTimer = null;

    const pageSize = 10;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#039;"
        })[char]);
    }

    function money(value) {
        const amount = Number(value || 0);
        return `RWF ${amount.toLocaleString("en-RW", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}`;
    }

    function showMessage(message, type = "error") {
        $("purchaseMessage").textContent = message;
        $("purchaseMessage").className = `purchase-message ${type}`;
        $("purchaseMessage").hidden = false;
    }

    function hideMessage() {
        $("purchaseMessage").hidden = true;
        $("purchaseMessage").textContent = "";
    }

    function showFormMessage(message) {
        $("purchaseFormMessage").textContent = message;
        $("purchaseFormMessage").className = "modal-form-message error";
        $("purchaseFormMessage").hidden = false;
    }

    function hideFormMessage() {
        $("purchaseFormMessage").hidden = true;
        $("purchaseFormMessage").textContent = "";
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric"
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

    async function loadReferenceData() {
        const [supplierResult, productResult] = await Promise.all([
            window.supplierService.getSuppliers(businessId, {
                page: 1, limit: 100, status: "active"
            }),
            window.purchaseService.request(
                `/businesses/${businessId}/products?page=1&limit=100&status=active`,
                { method: "GET" }
            )
        ]);

        suppliers = Array.isArray(supplierResult.data) ? supplierResult.data : [];
        products = Array.isArray(productResult.data) ? productResult.data : [];

        $("purchaseSupplier").innerHTML =
            '<option value="">Select supplier</option>' +
            suppliers.map((supplier) => `
                <option value="${escapeHTML(supplier.supplier_id)}">
                    ${escapeHTML(supplier.supplier_name)}
                </option>
            `).join("");
    }

    function getItemRows() {
        return [...$("purchaseItemsContainer").querySelectorAll(".purchase-item-row")];
    }

    function addPurchaseItem() {
        const row = document.createElement("div");
        row.className = "purchase-item-row";

        const productOptions = products.map((product) => `
            <option value="${escapeHTML(product.product_id)}"
                data-cost="${escapeHTML(product.cost_price || 0)}">
                ${escapeHTML(product.product_name)}
                ${product.sku ? ` (${escapeHTML(product.sku)})` : ""}
            </option>
        `).join("");

        row.innerHTML = `
            <select class="item-product" aria-label="Product" required>
                <option value="">Select product</option>
                ${productOptions}
            </select>
            <input class="item-quantity" type="number" min="0.001" step="0.001"
                value="1" aria-label="Quantity" required>
            <input class="item-unit-cost" type="number" min="0" step="0.01"
                value="0" aria-label="Unit cost" required>
            <span class="item-line-total">${money(0)}</span>
            <button class="remove-purchase-item" type="button"
                aria-label="Remove item">×</button>
        `;

        $("purchaseItemsContainer").appendChild(row);

        row.querySelector(".item-product").addEventListener("change", (event) => {
            const selected = event.target.selectedOptions[0];
            const cost = selected?.dataset.cost || "0";
            row.querySelector(".item-unit-cost").value = Number(cost).toFixed(2);
            calculateTotals();
        });

        row.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", calculateTotals);
        });

        row.querySelector(".remove-purchase-item").addEventListener("click", () => {
            row.remove();
            calculateTotals();
        });

        calculateTotals();
    }

    function calculateTotals() {
        let subtotal = 0;

        getItemRows().forEach((row) => {
            const quantity = Number(row.querySelector(".item-quantity").value || 0);
            const cost = Number(row.querySelector(".item-unit-cost").value || 0);
            const lineTotal = quantity > 0 && cost >= 0 ? quantity * cost : 0;

            subtotal += lineTotal;
            row.querySelector(".item-line-total").textContent = money(lineTotal);
        });

        const tax = Math.max(0, Number($("purchaseTax").value || 0));
        const paid = Math.max(0, Number($("purchaseAmountPaid").value || 0));
        const total = subtotal + tax;
        const balance = Math.max(0, total - paid);

        $("purchaseSubtotal").textContent = money(subtotal);
        $("purchaseTaxDisplay").textContent = money(tax);
        $("purchaseTotal").textContent = money(total);
        $("purchaseBalance").textContent = money(balance);
    }

    async function loadPurchases() {
        hideMessage();
        $("purchaseTableBody").innerHTML =
            '<tr><td colspan="9" class="table-empty">Loading purchases...</td></tr>';

        const filters = {
            page: currentPage,
            limit: pageSize,
            search: $("purchaseSearch").value.trim(),
            purchase_status: $("purchaseStatusFilter").value,
            payment_status: $("purchasePaymentFilter").value
        };

        try {
            const result = await window.purchaseService.getPurchases(
                businessId,
                filters
            );

            const purchases = Array.isArray(result.data) ? result.data : [];
            const pagination = result.pagination || {};

            currentPage = Number(pagination.page) || currentPage;
            totalPages = Math.max(1, Number(pagination.total_pages) || 1);

            renderPurchases(purchases);
            updatePagination(Number(pagination.total || 0));

            $("totalPurchases").textContent =
                Number(pagination.total || 0).toLocaleString();

            await loadPurchaseSummary();
        } catch (error) {
            console.error(error);
            $("purchaseTableBody").innerHTML =
                '<tr><td colspan="9" class="table-empty">Unable to load purchases.</td></tr>';
            showMessage(error.message || "Unable to load purchases.");
        }
    }

    function renderPurchases(purchases) {
        if (!purchases.length) {
            $("purchaseTableBody").innerHTML = `
                <tr><td colspan="9" class="table-empty">
                    No purchases found. Create your first purchase to get started.
                </td></tr>`;
            return;
        }

        $("purchaseTableBody").innerHTML = purchases.map((purchase) => `
            <tr>
                <td>
                    <div class="purchase-number-cell">
                        <strong>${escapeHTML(purchase.purchase_number)}</strong>
                        <small>#${escapeHTML(purchase.purchase_id)}</small>
                    </div>
                </td>
                <td>${escapeHTML(purchase.supplier_name || "—")}</td>
                <td>${formatDate(purchase.created_at)}</td>
                <td>${money(purchase.total_amount)}</td>
                <td>${money(purchase.amount_paid)}</td>
                <td>${money(purchase.balance_due)}</td>
                <td><span class="payment-status ${escapeHTML(purchase.payment_status)}">
                    ${escapeHTML(purchase.payment_status)}
                </span></td>
                <td><span class="purchase-status ${escapeHTML(purchase.purchase_status)}">
                    ${escapeHTML(purchase.purchase_status)}
                </span></td>
                <td><a class="purchase-view-link"
                    href="purchase-details.html?purchaseId=${encodeURIComponent(purchase.purchase_id)}">
                    View details
                </a></td>
            </tr>
        `).join("");
    }

    function updatePagination(total) {
        const start = total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
        const end = Math.min(currentPage * pageSize, total);

        $("purchasePaginationInfo").textContent =
            `Showing ${start}-${end} of ${total} purchases`;

        $("purchasePageNumber").textContent =
            `Page ${currentPage} of ${totalPages}`;

        $("purchasePrevPage").disabled = currentPage <= 1;
        $("purchaseNextPage").disabled = currentPage >= totalPages;
    }

    async function loadPurchaseSummary() {
        try {
            const [pending, received] = await Promise.all([
                window.purchaseService.getPurchases(businessId, {
                    page: 1, limit: 1, purchase_status: "pending"
                }),
                window.purchaseService.getPurchases(businessId, {
                    page: 1, limit: 1, purchase_status: "received"
                })
            ]);

            $("pendingPurchases").textContent =
                Number(pending.pagination?.total || 0).toLocaleString();

            $("receivedPurchases").textContent =
                Number(received.pagination?.total || 0).toLocaleString();

            // The current schema has no aggregate purchase summary endpoint.
            // Show the balance of the records on the currently displayed page.
            const visibleRows = [...$("purchaseTableBody").querySelectorAll("tr")];
            let balance = 0;

            visibleRows.forEach((row) => {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 6) {
                    const value = cells[5].textContent.replace(/[^\d.-]/g, "");
                    balance += Number(value) || 0;
                }
            });

            $("purchaseOutstanding").textContent = money(balance);
        } catch (error) {
            console.error("Purchase summary:", error);
        }
    }

    function openPurchaseModal() {
        $("purchaseForm").reset();
        $("purchaseItemsContainer").innerHTML = "";
        $("purchaseTax").value = "0";
        $("purchaseAmountPaid").value = "0";
        hideFormMessage();

        if (!products.length) {
            showFormMessage("No products are available. Add products before creating a purchase.");
        } else {
            addPurchaseItem();
        }

        calculateTotals();
        $("purchaseModal").hidden = false;
        document.body.classList.add("modal-open");
    }

    function closePurchaseModal() {
        $("purchaseModal").hidden = true;
        document.body.classList.remove("modal-open");
        $("purchaseForm").reset();
        $("purchaseItemsContainer").innerHTML = "";
        hideFormMessage();
    }

    async function savePurchase(event) {
        event.preventDefault();
        hideFormMessage();

        if (!$("purchaseSupplier").value) {
            showFormMessage("Select a supplier.");
            return;
        }

        const rows = getItemRows();
        if (!rows.length) {
            showFormMessage("Add at least one purchase item.");
            return;
        }

        const items = [];

        for (const row of rows) {
            const productId = row.querySelector(".item-product").value;
            const quantity = row.querySelector(".item-quantity").value;
            const unitCost = row.querySelector(".item-unit-cost").value;

            if (!productId) {
                showFormMessage("Select a product for every purchase item.");
                return;
            }

            if (!quantity || Number(quantity) <= 0) {
                showFormMessage("Every item quantity must be greater than zero.");
                return;
            }

            if (unitCost === "" || Number(unitCost) < 0) {
                showFormMessage("Enter a valid unit cost for every item.");
                return;
            }

            items.push({
                product_id: Number(productId),
                quantity: String(quantity),
                unit_cost: String(unitCost)
            });
        }

        const productIds = items.map((item) => item.product_id);
        if (new Set(productIds).size !== productIds.length) {
            showFormMessage("A product can only appear once. Combine its quantities into one item.");
            return;
        }

        const data = {
            supplier_id: Number($("purchaseSupplier").value),
            tax_amount: String($("purchaseTax").value || "0"),
            amount_paid: String($("purchaseAmountPaid").value || "0"),
            notes: $("purchaseNotes").value,
            items
        };

        const button = $("savePurchaseBtn");
        button.disabled = true;
        button.textContent = "Creating...";

        try {
            const result = await window.purchaseService.createPurchase(businessId, data);
            closePurchaseModal();
            currentPage = 1;
            await loadPurchases();

            const purchaseId = result.data?.purchase_id;
            showMessage(
                `Purchase ${result.data?.purchase_number || ""} created successfully. It is pending receipt.`,
                "success"
            );

            if (purchaseId) {
                window.setTimeout(() => {
                    window.location.href =
                        `purchase-details.html?purchaseId=${encodeURIComponent(purchaseId)}`;
                }, 700);
            }
        } catch (error) {
            showFormMessage(error.message || "Unable to create purchase.");
        } finally {
            button.disabled = false;
            button.textContent = "Create purchase";
        }
    }

    function initialiseSidebar() {
        if (typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }

        $("mobileMenuBtn")?.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-open");
        });

        $("sidebarOverlay")?.addEventListener("click", () => {
            document.body.classList.remove("sidebar-open");
        });
    }

    async function initialise() {
        const token = sessionStorage.getItem("smartbiz_token");

        try {
            membership = JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch (error) {
            membership = null;
        }

        if (!token || !membership ||
            membership.membership_status !== "active" ||
            (membership.business_status && membership.business_status !== "active")) {
            window.location.href = "login.html";
            return;
        }

        if (!["owner", "manager", "stock_manager"].includes(membership.role)) {
            document.querySelector(".purchases-page").innerHTML = `
                <div class="purchase-panel" style="padding:30px;text-align:center">
                    <h2>Access restricted</h2>
                    <p>Your role does not have permission to manage purchases.</p>
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

        $("newPurchaseBtn").addEventListener("click", openPurchaseModal);
        $("closePurchaseModal").addEventListener("click", closePurchaseModal);
        $("cancelPurchaseBtn").addEventListener("click", closePurchaseModal);
        $("purchaseForm").addEventListener("submit", savePurchase);
        $("addPurchaseItemBtn").addEventListener("click", addPurchaseItem);

        $("purchaseTax").addEventListener("input", calculateTotals);
        $("purchaseAmountPaid").addEventListener("input", calculateTotals);

        $("purchaseSearch").addEventListener("input", () => {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(() => {
                currentPage = 1;
                loadPurchases();
            }, 300);
        });

        $("purchaseStatusFilter").addEventListener("change", () => {
            currentPage = 1;
            loadPurchases();
        });

        $("purchasePaymentFilter").addEventListener("change", () => {
            currentPage = 1;
            loadPurchases();
        });

        $("purchasePrevPage").addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                loadPurchases();
            }
        });

        $("purchaseNextPage").addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadPurchases();
            }
        });

        $("purchaseModal").addEventListener("click", (event) => {
            if (event.target === $("purchaseModal")) closePurchaseModal();
        });

        try {
            await loadReferenceData();
            await loadPurchases();
        } catch (error) {
            showMessage(error.message || "Unable to load suppliers and products.");
        }
    }

    document.addEventListener("DOMContentLoaded", initialise);
})();
