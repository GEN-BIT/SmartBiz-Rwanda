/*
 * SmartBiz Rwanda Inventory Management
 */

document.addEventListener("DOMContentLoaded", async function () {

    const token = sessionStorage.getItem("smartbiz_token");
    const storedMembership = sessionStorage.getItem("smartbiz_membership");

    // Check authentication.
    if (!token || !storedMembership) {
        window.location.href = "login.html";
        return;
    }

    let membership;

    try {
        membership = JSON.parse(storedMembership);
    } catch (error) {
        sessionStorage.clear();
        window.location.href = "login.html";
        return;
    }

    if (
        !membership.business_id ||
        membership.membership_status !== "active" ||
        (membership.business_status && membership.business_status !== "active")
    ) {
        window.location.href = "login.html";
        return;
    }

    const businessId = membership.business_id;
    const userRole = membership.role;

    const canManageInventory = [
        "owner",
        "manager",
        "stock_manager"
    ].includes(userRole);

    const pageSize = 10;

    let inventoryPage = 1;
    let movementPage = 1;
    let inventoryTotalPages = 1;
    let movementTotalPages = 1;
    let searchTimer = null;

    // HTML elements.
    const inventoryTableBody = document.getElementById("inventoryTableBody");
    const movementsTableBody = document.getElementById("movementsTableBody");

    const adjustmentModal = document.getElementById("adjustmentModal");
    const adjustmentForm = document.getElementById("adjustmentForm");

    const openAdjustmentButton = document.getElementById("openAdjustmentButton");
    const saveAdjustmentButton = document.getElementById("saveAdjustmentButton");

    // Display the user's name.
    document.getElementById("userName").textContent =
        membership.full_name ||
        membership.user_name ||
        membership.business_name ||
        "SmartBiz User";

    // Only authorized roles can adjust stock.
    if (!canManageInventory) {
        openAdjustmentButton.classList.add("hidden");
    }

    // Render the shared sidebar.
    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    // Prevent HTML injection when displaying database values.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }

    function formatQuantity(value) {
        return Number(value || 0).toLocaleString("en-RW", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
        });
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-RW", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    function showAlert(message, type = "success") {
        const alert = document.getElementById("inventoryAlert");

        alert.textContent = message;
        alert.className = `inventory-alert ${type}`;

        window.setTimeout(function () {
            alert.classList.add("hidden");
        }, 5000);
    }

    function showLoading(tableBody, columns) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${columns}" class="inventory-empty">
                    Loading data...
                </td>
            </tr>
        `;
    }

    function showEmpty(tableBody, columns, message) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${columns}" class="inventory-empty">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    function stockStatusBadge(status) {
        const labels = {
            normal: "Normal",
            low: "Low Stock",
            out: "Out of Stock"
        };

        return `
            <span class="inventory-stock-badge inventory-stock-${status}">
                ${labels[status] || "Unknown"}
            </span>
        `;
    }

    // Load summary cards.
    async function loadSummary() {
        const response = await window.inventoryService.getSummary(businessId);
        const summary = response.data || {};

        document.getElementById("totalProducts").textContent =
            Number(summary.total_products || 0).toLocaleString();

        document.getElementById("productsInStock").textContent =
            Number(summary.products_in_stock || 0).toLocaleString();

        document.getElementById("lowStockProducts").textContent =
            Number(summary.low_stock || 0).toLocaleString();

        document.getElementById("outOfStockProducts").textContent =
            Number(summary.out_of_stock || 0).toLocaleString();
    }

    // Load inventory products.
    async function loadInventory() {
        showLoading(inventoryTableBody, 7);

        const filters = {
            page: inventoryPage,
            limit: pageSize,
            search: document.getElementById("inventorySearch").value.trim(),
            stock_status: document.getElementById("stockStatusFilter").value,
            status: document.getElementById("productStatusFilter").value
        };

        try {
            const response = await window.inventoryService.getInventory(
                businessId,
                filters
            );

            const products = response.data || [];
            const pagination = response.pagination || {};

            inventoryTotalPages = Math.max(1, Number(pagination.total_pages || 1));

            if (!products.length) {
                showEmpty(inventoryTableBody, 7, "No inventory products found.");
            } else {
                inventoryTableBody.innerHTML = products.map(function (product) {

                    const actionButton = canManageInventory
                        ? `
                            <button
                                type="button"
                                class="inventory-action-button"
                                data-adjust-product="${escapeHTML(product.product_id)}"
                            >
                                Adjust
                            </button>
                        `
                        : `<span>View only</span>`;

                    return `
                        <tr>
                            <td>
                                <div class="inventory-product-name">
                                    ${escapeHTML(product.product_name)}
                                </div>
                                <div class="inventory-product-unit">
                                    ${escapeHTML(product.unit || "piece")}
                                </div>
                            </td>

                            <td>${escapeHTML(product.sku || "—")}</td>

                            <td>${escapeHTML(product.category_name || "Uncategorized")}</td>

                            <td>
                                <strong>${formatQuantity(product.stock_quantity)}</strong>
                            </td>

                            <td>${formatQuantity(product.reorder_level)}</td>

                            <td>${stockStatusBadge(product.stock_status)}</td>

                            <td>${actionButton}</td>
                        </tr>
                    `;
                }).join("");
            }

            const total = Number(pagination.total || 0);

            document.getElementById("inventoryPaginationInfo").textContent =
                `Page ${inventoryPage} of ${inventoryTotalPages} (${total} products)`;

            document.getElementById("inventoryPreviousPage").disabled =
                inventoryPage <= 1;

            document.getElementById("inventoryNextPage").disabled =
                inventoryPage >= inventoryTotalPages;

        } catch (error) {
            showEmpty(inventoryTableBody, 7, error.message);
            showAlert(error.message, "error");
        }
    }

    // Load products for the adjustment form.
    async function loadAdjustmentProducts() {
        if (!canManageInventory) return;

        const select = document.getElementById("adjustmentProduct");

        try {
            const response = await window.inventoryService.getInventory(
                businessId,
                {
                    page: 1,
                    limit: 100,
                    status: "active"
                }
            );

            const products = response.data || [];

            select.innerHTML = `
                <option value="">Select a product</option>
                ${products.map(function (product) {
                    return `
                        <option value="${escapeHTML(product.product_id)}">
                            ${escapeHTML(product.product_name)}
                            — Stock: ${formatQuantity(product.stock_quantity)}
                        </option>
                    `;
                }).join("")}
            `;

        } catch (error) {
            showAlert(error.message, "error");
        }
    }

    // Load stock movement history.
    async function loadMovements() {
        showLoading(movementsTableBody, 6);

        try {
            const response = await window.inventoryService.getMovements(
                businessId,
                {
                    page: movementPage,
                    limit: pageSize,
                    movement_type: document.getElementById("movementTypeFilter").value
                }
            );

            const movements = response.data || [];
            const pagination = response.pagination || {};

            movementTotalPages = Math.max(1, Number(pagination.total_pages || 1));

            if (!movements.length) {
                showEmpty(movementsTableBody, 6, "No stock movements found.");
            } else {
                movementsTableBody.innerHTML = movements.map(function (movement) {

                    const reducingTypes = [
                        "sale",
                        "purchase_return",
                        "damage",
                        "expired"
                    ];

                    let isReduction = reducingTypes.includes(movement.movement_type);

                    if (
                        movement.movement_type === "adjustment" &&
                        movement.reference_type === "decrease"
                    ) {
                        isReduction = true;
                    }

                    const sign = isReduction ? "−" : "+";

                    return `
                        <tr>
                            <td>${escapeHTML(formatDate(movement.created_at))}</td>

                            <td>
                                <div class="inventory-product-name">
                                    ${escapeHTML(movement.product_name)}
                                </div>
                                <div class="inventory-product-unit">
                                    ${escapeHTML(movement.sku || "No SKU")}
                                </div>
                            </td>

                            <td>${escapeHTML(
                                movement.movement_type.replaceAll("_", " ")
                            )}</td>

                            <td>
                                <strong>
                                    ${sign}${formatQuantity(movement.quantity)}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(movement.reference_type || "—")}
                            </td>

                            <td>${escapeHTML(movement.notes || "—")}</td>
                        </tr>
                    `;
                }).join("");
            }

            const total = Number(pagination.total || 0);

            document.getElementById("movementPaginationInfo").textContent =
                `Page ${movementPage} of ${movementTotalPages} (${total} movements)`;

            document.getElementById("movementPreviousPage").disabled =
                movementPage <= 1;

            document.getElementById("movementNextPage").disabled =
                movementPage >= movementTotalPages;

        } catch (error) {
            showEmpty(movementsTableBody, 6, error.message);
            showAlert(error.message, "error");
        }
    }

    // Open adjustment modal.
    async function openAdjustment(productId = "") {
        if (!canManageInventory) return;

        adjustmentForm.reset();

        await loadAdjustmentProducts();

        if (productId) {
            document.getElementById("adjustmentProduct").value = productId;
        }

        adjustmentModal.classList.remove("hidden");
    }

    function closeAdjustment() {
        adjustmentModal.classList.add("hidden");
        adjustmentForm.reset();
    }

    // Open modal from the page button.
    openAdjustmentButton.addEventListener("click", function () {
        openAdjustment();
    });

    // Open modal from a product row.
    inventoryTableBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-adjust-product]");

        if (!button || !canManageInventory) return;

        openAdjustment(button.dataset.adjustProduct);
    });

    // Close modal.
    document.getElementById("closeAdjustmentButton")
        .addEventListener("click", closeAdjustment);

    document.getElementById("cancelAdjustmentButton")
        .addEventListener("click", closeAdjustment);

    // Close when clicking outside the modal.
    adjustmentModal.addEventListener("click", function (event) {
        if (event.target === adjustmentModal) {
            closeAdjustment();
        }
    });

    // Save stock adjustment.
    adjustmentForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!canManageInventory) {
            showAlert("You do not have permission to adjust stock.", "error");
            return;
        }

        const adjustmentData = {
            product_id: document.getElementById("adjustmentProduct").value,
            adjustment_type: document.getElementById("adjustmentType").value,
            quantity: document.getElementById("adjustmentQuantity").value,
            notes: document.getElementById("adjustmentNotes").value.trim()
        };

        if (
            !adjustmentData.product_id ||
            !adjustmentData.adjustment_type ||
            !adjustmentData.quantity ||
            Number(adjustmentData.quantity) <= 0
        ) {
            showAlert("Please complete all required adjustment fields.", "error");
            return;
        }

        saveAdjustmentButton.disabled = true;
        saveAdjustmentButton.textContent = "Saving...";

        try {
            const response = await window.inventoryService.adjustStock(
                businessId,
                adjustmentData
            );

            closeAdjustment();

            await Promise.all([
                loadInventory(),
                loadSummary(),
                loadMovements()
            ]);

            showAlert(
                response.message || "Stock adjustment completed successfully."
            );

        } catch (error) {
            showAlert(error.message, "error");
        } finally {
            saveAdjustmentButton.disabled = false;
            saveAdjustmentButton.textContent = "Save Adjustment";
        }
    });

    // Inventory search.
    document.getElementById("inventorySearch")
        .addEventListener("input", function () {
            clearTimeout(searchTimer);

            searchTimer = setTimeout(function () {
                inventoryPage = 1;
                loadInventory();
            }, 400);
        });

    // Inventory filters.
    document.getElementById("stockStatusFilter")
        .addEventListener("change", function () {
            inventoryPage = 1;
            loadInventory();
        });

    document.getElementById("productStatusFilter")
        .addEventListener("change", function () {
            inventoryPage = 1;
            loadInventory();
        });

    document.getElementById("clearInventoryFilters")
        .addEventListener("click", function () {
            document.getElementById("inventorySearch").value = "";
            document.getElementById("stockStatusFilter").value = "";
            document.getElementById("productStatusFilter").value = "active";

            inventoryPage = 1;
            loadInventory();
        });

    // Inventory pagination.
    document.getElementById("inventoryPreviousPage")
        .addEventListener("click", function () {
            if (inventoryPage > 1) {
                inventoryPage--;
                loadInventory();
            }
        });

    document.getElementById("inventoryNextPage")
        .addEventListener("click", function () {
            if (inventoryPage < inventoryTotalPages) {
                inventoryPage++;
                loadInventory();
            }
        });

    // Movement filters.
    document.getElementById("movementTypeFilter")
        .addEventListener("change", function () {
            movementPage = 1;
            loadMovements();
        });

    document.getElementById("refreshMovements")
        .addEventListener("click", loadMovements);

    // Movement pagination.
    document.getElementById("movementPreviousPage")
        .addEventListener("click", function () {
            if (movementPage > 1) {
                movementPage--;
                loadMovements();
            }
        });

    document.getElementById("movementNextPage")
        .addEventListener("click", function () {
            if (movementPage < movementTotalPages) {
                movementPage++;
                loadMovements();
            }
        });

    // Switch between stock and movement views.
    document.querySelectorAll(".inventory-tab").forEach(function (tab) {

        tab.addEventListener("click", function () {

            document.querySelectorAll(".inventory-tab").forEach(function (item) {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            const selectedTab = tab.dataset.tab;

            document.getElementById("stockPanel")
                .classList.toggle("hidden", selectedTab !== "stock");

            document.getElementById("movementsPanel")
                .classList.toggle("hidden", selectedTab !== "movements");

            if (selectedTab === "movements") {
                loadMovements();
            }
        });

    });

    // Initial page loading.
    try {
        await Promise.all([
            loadSummary(),
            loadInventory()
        ]);
    } catch (error) {
        showAlert(error.message, "error");
    }

});

