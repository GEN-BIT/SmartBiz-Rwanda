
/*
 * SmartBiz Rwanda - Category Management
 * Tenant-scoped category listing, statistics, pagination and CRUD.
 */

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

    const businessId = membership.business_id;

    if (!token || !businessId) {
        window.location.replace("login.html");
        return;
    }

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    const state = {
        categories: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        limit: 10,
        editingCategoryId: null,
        loading: false
    };

    const elements = {
        tableBody: document.getElementById("categoriesTableBody"),
        search: document.getElementById("categorySearch"),
        statusFilter: document.getElementById("categoryStatusFilter"),
        modal: document.getElementById("categoryModal"),
        form: document.getElementById("categoryForm"),
        categoryName: document.getElementById("categoryName"),
        categoryDescription: document.getElementById("categoryDescription"),
        message: document.getElementById("categoryMessage"),
        formMessage: document.getElementById("categoryFormMessage"),
        saveButton: document.getElementById("saveCategoryBtn"),
        pageInfo: document.getElementById("categoriesPageInfo"),
        previousButton: document.getElementById("previousCategoriesPage"),
        nextButton: document.getElementById("nextCategoriesPage"),
        total: document.getElementById("totalCategories"),
        active: document.getElementById("activeCategories"),
        inactive: document.getElementById("inactiveCategories")
    };

    initializePage();

    function getResponseData(response) {
        return response && response.data !== undefined
            ? response.data
            : response;
    }

    function getPagination(response) {
        return response?.pagination ||
            response?.data?.pagination ||
            {};
    }

    function getErrorMessage(error) {
        return error?.message || "Something went wrong. Please try again.";
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

        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleDateString();
    }

    function showMessage(message, type = "info") {
        if (!elements.message) return;

        elements.message.textContent = message;
        elements.message.className = `category-message ${type}`;
    }

    function showFormMessage(message, type = "error") {
        if (!elements.formMessage) return;

        elements.formMessage.textContent = message;
        elements.formMessage.className = `category-message ${type}`;
    }

    function clearMessages() {
        showMessage("");
        showFormMessage("");
    }

    async function initializePage() {
        if (!elements.tableBody || !elements.form) {
            console.error("Category page is missing required HTML elements.");
            return;
        }

        bindEvents();
        await loadCategories();
        await loadCategoryStatistics();
    }

    function bindEvents() {
        document.getElementById("addCategoryBtn")
            ?.addEventListener("click", openAddModal);

        document.getElementById("closeCategoryModal")
            ?.addEventListener("click", closeModal);

        document.getElementById("cancelCategoryBtn")
            ?.addEventListener("click", closeModal);

        elements.form.addEventListener("submit", saveCategory);

        elements.search?.addEventListener("input", function () {
            state.currentPage = 1;
            loadCategories();
        });

        elements.statusFilter?.addEventListener("change", function () {
            state.currentPage = 1;
            loadCategories();
        });

        elements.previousButton?.addEventListener("click", function () {
            if (state.currentPage > 1) {
                state.currentPage--;
                loadCategories();
            }
        });

        elements.nextButton?.addEventListener("click", function () {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                loadCategories();
            }
        });

        elements.tableBody.addEventListener("click", handleTableActions);

        elements.modal?.addEventListener("click", function (event) {
            if (event.target === elements.modal) closeModal();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeModal();
        });
    }

    async function loadCategories() {
        if (state.loading) return;

        state.loading = true;
        showMessage("Loading categories...", "info");

        try {
            const filters = {
                search: elements.search?.value || "",
                status: elements.statusFilter?.value || "",
                page: state.currentPage,
                limit: state.limit
            };

            const response = await window.categoryService.getCategories(
                businessId,
                filters
            );

            const result = getResponseData(response);

            state.categories = Array.isArray(result) ? result : [];

            const pagination = getPagination(response);

            state.totalItems = Number(
                pagination.totalItems ??
                pagination.total_items ??
                state.categories.length
            );

            state.totalPages = Math.max(
                1,
                Number(
                    pagination.totalPages ??
                    pagination.total_pages ??
                    Math.ceil(state.totalItems / state.limit)
                )
            );

            if (state.currentPage > state.totalPages) {
                state.currentPage = state.totalPages;
            }

            renderCategories();
            updatePagination();

            showMessage("");
        } catch (error) {
            console.error("Category loading error:", error);

            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="6">Unable to load categories. Please try again.</td>
                </tr>
            `;

            showMessage(getErrorMessage(error), "error");
        } finally {
            state.loading = false;
        }
    }

    function renderCategories() {
        if (!state.categories.length) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="6">No categories found.</td>
                </tr>
            `;
            return;
        }

        elements.tableBody.innerHTML = state.categories.map(function (category) {
            const status = category.status === "active"
                ? "active"
                : "inactive";

            const productCount = Number(category.product_count || 0);

            return `
                <tr>
                    <td class="category-name-cell">
                        <strong>${escapeHTML(category.category_name)}</strong>
                    </td>

                    <td>${escapeHTML(category.description || "—")}</td>

                    <td>${productCount}</td>

                    <td>
                        <span class="category-status ${status}">
                            ${status}
                        </span>
                    </td>

                    <td>${formatDate(category.created_at)}</td>

                    <td>
                        <div class="category-actions">
                            <button type="button"
                                class="category-edit-btn"
                                data-action="edit"
                                data-id="${escapeHTML(category.category_id)}">
                                Edit
                            </button>

                            <button type="button"
                                class="category-status-btn"
                                data-action="status"
                                data-id="${escapeHTML(category.category_id)}"
                                data-status="${status === "active" ? "inactive" : "active"}">
                                ${status === "active" ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function loadCategoryStatistics() {
        try {
            const requests = await Promise.all([
                window.categoryService.getCategories(
                    businessId,
                    { page: 1, limit: 1 }
                ),
                window.categoryService.getCategories(
                    businessId,
                    { page: 1, limit: 1, status: "active" }
                ),
                window.categoryService.getCategories(
                    businessId,
                    { page: 1, limit: 1, status: "inactive" }
                )
            ]);

            const totals = requests.map(function (response) {
                const pagination = getPagination(response);
                const data = getResponseData(response);

                return Number(
                    pagination.totalItems ??
                    pagination.total_items ??
                    (Array.isArray(data) ? data.length : 0)
                );
            });

            if (elements.total) elements.total.textContent = totals[0];
            if (elements.active) elements.active.textContent = totals[1];
            if (elements.inactive) elements.inactive.textContent = totals[2];
        } catch (error) {
            console.error("Category statistics could not be loaded:", error);
        }
    }

    function updatePagination() {
        if (elements.pageInfo) {
            elements.pageInfo.textContent =
                `Page ${state.currentPage} of ${state.totalPages} (${state.totalItems} categories)`;
        }

        if (elements.previousButton) {
            elements.previousButton.disabled = state.currentPage <= 1;
        }

        if (elements.nextButton) {
            elements.nextButton.disabled =
                state.currentPage >= state.totalPages;
        }
    }

    function openAddModal() {
        state.editingCategoryId = null;
        elements.form.reset();

        document.getElementById("categoryModalTitle").textContent =
            "Add Category";

        elements.saveButton.textContent = "Save Category";
        elements.saveButton.disabled = false;

        clearMessages();
        elements.modal.classList.add("active");
    }

    async function openEditModal(categoryId) {
        try {
            clearMessages();

            const response = await window.categoryService.getCategory(
                businessId,
                categoryId
            );

            const category = getResponseData(response);

            if (!category || !category.category_id) {
                throw new Error("Category details could not be found.");
            }

            state.editingCategoryId = category.category_id;

            document.getElementById("categoryModalTitle").textContent =
                "Edit Category";

            elements.saveButton.textContent = "Update Category";

            elements.categoryName.value = category.category_name || "";
            elements.categoryDescription.value = category.description || "";

            elements.modal.classList.add("active");
        } catch (error) {
            showMessage(getErrorMessage(error), "error");
        }
    }

    function closeModal() {
        if (!elements.modal) return;

        elements.modal.classList.remove("active");
        elements.form.reset();
        state.editingCategoryId = null;

        if (elements.saveButton) {
            elements.saveButton.textContent = "Save Category";
            elements.saveButton.disabled = false;
        }

        clearMessages();
    }

    async function saveCategory(event) {
        event.preventDefault();

        const categoryData = {
            category_name: elements.categoryName.value.trim(),
            description: elements.categoryDescription.value.trim()
        };

        if (!categoryData.category_name) {
            showFormMessage("Category name is required.");
            return;
        }

        const editingId = state.editingCategoryId;

        try {
            elements.saveButton.disabled = true;
            elements.saveButton.textContent = "Saving...";

            if (editingId) {
                await window.categoryService.updateCategory(
                    businessId,
                    editingId,
                    categoryData
                );
            } else {
                await window.categoryService.createCategory(
                    businessId,
                    categoryData
                );

                state.currentPage = 1;
            }

            closeModal();
            showMessage(
                editingId
                    ? "Category updated successfully."
                    : "Category created successfully.",
                "success"
            );

            await loadCategories();
            await loadCategoryStatistics();
        } catch (error) {
            showFormMessage(getErrorMessage(error), "error");
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent = "Save Category";
        }
    }

    async function handleTableActions(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const categoryId = button.dataset.id;

        if (button.dataset.action === "edit") {
            await openEditModal(categoryId);
        }

        if (button.dataset.action === "status") {
            await changeCategoryStatus(
                categoryId,
                button.dataset.status
            );
        }
    }

    async function changeCategoryStatus(categoryId, status) {
        const category = state.categories.find(function (item) {
            return String(item.category_id) === String(categoryId);
        });

        if (!category) return;

        const action = status === "active" ? "activate" : "deactivate";

        if (!window.confirm(
            `Are you sure you want to ${action} "${category.category_name}"?`
        )) {
            return;
        }

        try {
            await window.categoryService.updateStatus(
                businessId,
                categoryId,
                status
            );

            showMessage(
                `Category ${status === "active" ? "activated" : "deactivated"} successfully.`,
                "success"
            );

            await loadCategories();
            await loadCategoryStatistics();
        } catch (error) {
            showMessage(getErrorMessage(error), "error");
        }
    }
});
