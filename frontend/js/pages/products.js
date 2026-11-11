
document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("smartbiz_token");

    let membership = {};

    try {
        membership = JSON.parse(
            sessionStorage.getItem("smartbiz_membership") || "{}"
        );
    } catch (error) {
        console.error("Membership information could not be read:", error);
    }

    if (!token || !membership.business_id) {
        window.location.href = "login.html";
        return;
    }

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    } else {
        console.error("Sidebar component is not available.");
    }

    const businessId = membership.business_id;

    const state = {
        products: [],
        categories: [],
        currentPage: 1,
        totalPages: 1,
        limit: 10,
        editingProductId: null
    };

    const elements = {
        tableBody: document.getElementById("productsTableBody"),
        search: document.getElementById("productSearch"),
        categoryFilter: document.getElementById("productCategoryFilter"),
        statusFilter: document.getElementById("productStatusFilter"),
        modal: document.getElementById("productModal"),
        form: document.getElementById("productForm"),
        categoryInput: document.getElementById("productCategory"),
        message: document.getElementById("productMessage"),
        formMessage: document.getElementById("productFormMessage"),
        saveButton: document.getElementById("saveProductBtn"),
        pageInfo: document.getElementById("productsPageInfo"),
        previousButton: document.getElementById("previousProductsPage"),
        nextButton: document.getElementById("nextProductsPage")
    };

    if (!businessId) {
        showMessage(
            "Your business session could not be found. Please log in again.",
            "error"
        );
        return;
    }

    initializePage();

    function getResponseData(response) {
        if (response && response.data !== undefined) {
            return response.data;
        }

        return response;
    }

    function getErrorMessage(error) {
        return error?.message || "Something went wrong. Please try again.";
    }

    function showMessage(message, type = "info") {
        elements.message.textContent = message;
        elements.message.className = `product-message ${type}`;
    }

    function showFormMessage(message, type = "error") {
        elements.formMessage.textContent = message;
        elements.formMessage.className = `product-message ${type}`;
    }

    function clearMessages() {
        elements.message.textContent = "";
        elements.formMessage.textContent = "";
        elements.message.className = "product-message";
        elements.formMessage.className = "product-message";
    }

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

    function formatMoney(value) {
        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-RW", {
            maximumFractionDigits: 2
        }).format(amount) + " RWF";
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString();
    }

    async function initializePage() {
        bindEvents();
        await loadCategories();
        await loadProducts();
    }

    function bindEvents() {
        document.getElementById("addProductBtn")
            .addEventListener("click", openAddModal);

        document.getElementById("closeProductModal")
            .addEventListener("click", closeModal);

        document.getElementById("cancelProductBtn")
            .addEventListener("click", closeModal);

        elements.form.addEventListener("submit", saveProduct);

        elements.search.addEventListener("input", function () {
            state.currentPage = 1;
            loadProducts();
        });

        elements.categoryFilter.addEventListener("change", function () {
            state.currentPage = 1;
            loadProducts();
        });

        elements.statusFilter.addEventListener("change", function () {
            state.currentPage = 1;
            loadProducts();
        });

        elements.previousButton.addEventListener("click", function () {
            if (state.currentPage > 1) {
                state.currentPage--;
                loadProducts();
            }
        });

        elements.nextButton.addEventListener("click", function () {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                loadProducts();
            }
        });

        elements.tableBody.addEventListener("click", handleTableActions);

        elements.modal.addEventListener("click", function (event) {
            if (event.target === elements.modal) {
                closeModal();
            }
        });
    }

    async function loadCategories() {
        try {
            if (!window.categoryService ||
                typeof window.categoryService.getCategories !== "function") {
                throw new Error(
                    "Category service is unavailable or getCategories() is missing."
                );
            }

            const response =
                await window.categoryService.getCategories(businessId);

            const categories = getResponseData(response);

            state.categories = Array.isArray(categories)
                ? categories
                : [];

            populateCategorySelects();
        } catch (error) {
            console.error("Category loading error:", error);
            showMessage(
                "Products can still load, but categories could not be loaded: " +
                getErrorMessage(error),
                "error"
            );
        }
    }

    function populateCategorySelects() {
        const activeCategories = state.categories.filter(function (category) {
            return category.status === "active";
        });

        const filterOptions = activeCategories.map(function (category) {
            return `<option value="${escapeHTML(category.category_id)}">
                ${escapeHTML(category.category_name)}
            </option>`;
        }).join("");

        const formOptions = activeCategories.map(function (category) {
            return `<option value="${escapeHTML(category.category_id)}">
                ${escapeHTML(category.category_name)}
            </option>`;
        }).join("");

        elements.categoryFilter.innerHTML =
            '<option value="">All categories</option>' + filterOptions;

        elements.categoryInput.innerHTML =
            '<option value="">Select category</option>' + formOptions;
    }

    async function loadProducts() {
        try {
            showMessage("Loading products...", "info");

            const filters = {
                search: elements.search.value.trim(),
                category_id: elements.categoryFilter.value,
                status: elements.statusFilter.value,
                page: state.currentPage,
                limit: state.limit
            };

            const response = await window.productService.getProducts(
                businessId,
                filters
            );

            const result = getResponseData(response);

            state.products = Array.isArray(result) ? result : [];

            const pagination = response?.pagination ||
                response?.data?.pagination ||
                {};

            state.totalPages = Number(
                pagination.totalPages ||
                pagination.total_pages ||
                1
            );

            if (state.totalPages < 1) {
                state.totalPages = 1;
            }

            renderProducts();
            updateStatistics(pagination);
            updatePagination(pagination);

            showMessage("", "info");
        } catch (error) {
            console.error("Product loading error:", error);

            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8">Unable to load products.</td>
                </tr>
            `;

            showMessage(getErrorMessage(error), "error");
        }
    }

    function renderProducts() {
        if (state.products.length === 0) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8">No products found.</td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = state.products.map(function (product) {
            const status = product.status || "inactive";
            const stock = Number(product.stock_quantity || 0);
            const reorderLevel = Number(product.reorder_level || 0);
            const isLowStock = stock <= reorderLevel;

            return `
                <tr>
                    <td class="product-name-cell">
                        <strong>${escapeHTML(product.product_name)}</strong>
                        <small>${escapeHTML(product.unit || "Unit")}</small>
                    </td>

                    <td>
                        ${escapeHTML(product.sku || "—")}
                        <br>
                        <small>${escapeHTML(product.barcode || "—")}</small>
                    </td>

                    <td>${escapeHTML(product.category_name || "Uncategorized")}</td>

                    <td>${formatMoney(product.cost_price)}</td>

                    <td>${formatMoney(product.selling_price)}</td>

                    <td class="${isLowStock ? "product-stock-low" : "product-stock-normal"}">
                        ${stock}
                    </td>

                    <td>
                        <span class="product-status ${escapeHTML(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        <div class="product-actions">
                            <button type="button"
                                class="product-edit-btn"
                                data-action="edit"
                                data-id="${escapeHTML(product.product_id)}">
                                Edit
                            </button>

                            <button type="button"
                                class="product-status-btn"
                                data-action="status"
                                data-id="${escapeHTML(product.product_id)}"
                                data-status="${status === "active" ? "inactive" : "active"}">
                                ${status === "active" ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function updateStatistics(pagination = {}) {
        const activeCount = state.products.filter(
            product => product.status === "active"
        ).length;

        const inactiveCount = state.products.filter(
            product => product.status === "inactive"
        ).length;

        const lowStockCount = state.products.filter(function (product) {
            return Number(product.stock_quantity || 0) <=
                Number(product.reorder_level || 0);
        }).length;

        document.getElementById("totalProducts").textContent =
            pagination.totalItems ??
            pagination.total_items ??
            state.products.length;

        document.getElementById("activeProducts").textContent = activeCount;
        document.getElementById("inactiveProducts").textContent = inactiveCount;
        document.getElementById("lowStockProducts").textContent = lowStockCount;
    }

    function updatePagination(pagination = {}) {
        const totalItems = Number(
            pagination.totalItems ??
            pagination.total_items ??
            state.products.length
        );

        elements.pageInfo.textContent =
            `Page ${state.currentPage} of ${state.totalPages} (${totalItems} products)`;

        elements.previousButton.disabled = state.currentPage <= 1;
        elements.nextButton.disabled =
            state.currentPage >= state.totalPages;
    }

    function openAddModal() {
        state.editingProductId = null;
        elements.form.reset();

        document.getElementById("productModalTitle").textContent =
            "Add Product";

        document.getElementById("saveProductBtn").textContent =
            "Save Product";

        document.getElementById("productReorderLevel").value = 0;

        clearMessages();
        elements.modal.classList.add("active");
    }

    async function openEditModal(productId) {
        try {
            clearMessages();

            const response = await window.productService.getProduct(
                businessId,
                productId
            );

            const product = getResponseData(response);

            if (!product || !product.product_id) {
                throw new Error("Product details could not be found.");
            }

            state.editingProductId = product.product_id;

            document.getElementById("productModalTitle").textContent =
                "Edit Product";

            document.getElementById("saveProductBtn").textContent =
                "Update Product";

            document.getElementById("productName").value =
                product.product_name || "";

            elements.categoryInput.value = product.category_id || "";

            document.getElementById("productSku").value =
                product.sku || "";

            document.getElementById("productBarcode").value =
                product.barcode || "";

            document.getElementById("productCostPrice").value =
                product.cost_price ?? 0;

            document.getElementById("productSellingPrice").value =
                product.selling_price ?? 0;

            document.getElementById("productUnit").value =
                product.unit || "";

            document.getElementById("productReorderLevel").value =
                product.reorder_level ?? 0;

            document.getElementById("productDescription").value =
                product.description || "";

            elements.modal.classList.add("active");
        } catch (error) {
            showMessage(getErrorMessage(error), "error");
        }
    }

    function closeModal() {
        elements.modal.classList.remove("active");
        elements.form.reset();
        state.editingProductId = null;
        clearMessages();
    }

    async function saveProduct(event) {
        event.preventDefault();

        const productData = {
            product_name: document.getElementById("productName").value.trim(),
            category_id: elements.categoryInput.value,
            sku: document.getElementById("productSku").value.trim(),
            barcode: document.getElementById("productBarcode").value.trim(),
            cost_price: Number(
                document.getElementById("productCostPrice").value
            ),
            selling_price: Number(
                document.getElementById("productSellingPrice").value
            ),
            unit: document.getElementById("productUnit").value.trim(),
            reorder_level: Number(
                document.getElementById("productReorderLevel").value || 0
            ),
            description: document.getElementById("productDescription").value.trim()
        };

        if (!productData.product_name || !productData.category_id ||
            !productData.unit) {
            showFormMessage("Please complete all required fields.");
            return;
        }

        if (productData.cost_price < 0 ||
            productData.selling_price < 0 ||
            productData.reorder_level < 0) {
            showFormMessage("Prices and reorder level cannot be negative.");
            return;
        }

        try {
            elements.saveButton.disabled = true;
            elements.saveButton.textContent = "Saving...";

            if (state.editingProductId) {
                await window.productService.updateProduct(
                    businessId,
                    state.editingProductId,
                    productData
                );

                showMessage("Product updated successfully.", "success");
            } else {
                await window.productService.createProduct(
                    businessId,
                    productData
                );

                state.currentPage = 1;
                showMessage("Product created successfully.", "success");
            }

            closeModal();
            await loadProducts();
        } catch (error) {
            showFormMessage(getErrorMessage(error), "error");
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent =
                state.editingProductId ? "Update Product" : "Save Product";
        }
    }

    async function handleTableActions(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const productId = button.dataset.id;
        const action = button.dataset.action;

        if (action === "edit") {
            await openEditModal(productId);
        }

        if (action === "status") {
            await changeProductStatus(
                productId,
                button.dataset.status
            );
        }
    }

    async function changeProductStatus(productId, status) {
        const product = state.products.find(function (item) {
            return String(item.product_id) === String(productId);
        });

        if (!product) return;

        const actionText = status === "active"
            ? "activate"
            : "deactivate";

        if (!window.confirm(
            `Are you sure you want to ${actionText} "${product.product_name}"?`
        )) {
            return;
        }

        try {
            await window.productService.updateProductStatus(
                businessId,
                productId,
                status
            );

            showMessage(
                `Product ${status === "active" ? "activated" : "deactivated"} successfully.`,
                "success"
            );

            await loadProducts();
        } catch (error) {
            showMessage(getErrorMessage(error), "error");
        }
    }
});
