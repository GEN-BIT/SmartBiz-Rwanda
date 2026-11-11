
/* =========================================================
   SMARTBIZ RWANDA - EXPENSE PAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const token = sessionStorage.getItem("smartbiz_token");

    let membership = {};

    try {
        membership = JSON.parse(
            sessionStorage.getItem("smartbiz_membership") || "{}"
        );
    } catch (error) {
        membership = {};
    }

    if (!token || !membership.business_id) {
        window.location.href = "login.html";
        return;
    }

    const userRole = membership.role;
    const canManageExpenses =
        userRole === "owner" || userRole === "manager";

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    const elements = {
        total: document.getElementById("total-expenses"),
        count: document.getElementById("expense-count"),
        average: document.getElementById("average-expense"),

        table: document.getElementById("expenses-table-body"),

        search: document.getElementById("expense-search"),
        categoryFilter: document.getElementById("expense-category-filter"),
        dateFilter: document.getElementById("expense-date-filter"),
        resetFilters: document.getElementById("reset-expense-filters"),

        modal: document.getElementById("expense-modal"),
        modalTitle: document.getElementById("expense-modal-title"),
        form: document.getElementById("expense-form"),
        formMessage: document.getElementById("expense-form-message"),

        expenseId: document.getElementById("expense-id"),
        category: document.getElementById("expense-category"),
        description: document.getElementById("expense-description"),
        amount: document.getElementById("expense-amount"),
        date: document.getElementById("expense-date"),
        paymentMethod: document.getElementById("expense-payment-method"),
        receipt: document.getElementById("expense-receipt"),

        addButton: document.getElementById("add-expense-btn"),
        closeButton: document.getElementById("close-expense-modal"),
        cancelButton: document.getElementById("cancel-expense-btn"),
        saveButton: document.getElementById("save-expense-btn"),

        previousButton: document.getElementById("expense-prev-page"),
        nextButton: document.getElementById("expense-next-page"),
        paginationInfo: document.getElementById("expense-pagination-info")
    };

    let allExpenses = [];
    let filteredExpenses = [];
    let currentPage = 1;

    const pageSize = 10;

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-RW", {
            style: "currency",
            currency: "RWF",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            const characters = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return characters[char];
        });
    }

    function getPayload(response) {
        if (response && response.data !== undefined) {
            return response.data;
        }

        return response;
    }

    function getExpenseArray(response) {
        const data = getPayload(response);

        if (Array.isArray(data)) {
            return data;
        }

        if (data && Array.isArray(data.expenses)) {
            return data.expenses;
        }

        if (data && data.data && Array.isArray(data.data.expenses)) {
            return data.data.expenses;
        }

        return [];
    }

    function showTableMessage(message) {
        elements.table.innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    function showFormMessage(message, type = "error") {
        elements.formMessage.textContent = message;
        elements.formMessage.className =
            `expense-form-message ${type}`;
    }

    function clearFormMessage() {
        elements.formMessage.textContent = "";
        elements.formMessage.className = "expense-form-message";
    }

    function getExpenseId(expense) {
        return expense.expense_id || expense.id;
    }

    function openModal(expense = null) {
        if (!canManageExpenses) {
            alert("You do not have permission to manage expenses.");
            return;
        }

        elements.form.reset();
        clearFormMessage();

        if (expense) {
            elements.modalTitle.textContent = "Edit Expense";

            elements.expenseId.value = getExpenseId(expense) || "";
            elements.category.value = expense.expense_category || "";
            elements.description.value = expense.description || "";
            elements.amount.value = expense.amount || "";
            elements.date.value = expense.expense_date
                ? String(expense.expense_date).substring(0, 10)
                : "";
            elements.paymentMethod.value = expense.payment_method || "";
            elements.receipt.value = expense.receipt_number || "";

            elements.saveButton.textContent = "Update Expense";
        } else {
            elements.modalTitle.textContent = "Add Expense";
            elements.expenseId.value = "";

            elements.date.value =
                new Date().toISOString().split("T")[0];

            elements.saveButton.textContent = "Save Expense";
        }

        elements.modal.classList.add("active");
    }

    function closeModal() {
        elements.modal.classList.remove("active");
        elements.form.reset();
        clearFormMessage();
    }

    function updateSummary() {
        const total = filteredExpenses.reduce(function (sum, expense) {
            return sum + Number(expense.amount || 0);
        }, 0);

        const count = filteredExpenses.length;
        const average = count > 0 ? total / count : 0;

        elements.total.textContent = formatCurrency(total);
        elements.count.textContent = count;
        elements.average.textContent = formatCurrency(average);
    }

    function renderExpenses() {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;

        const pageExpenses = filteredExpenses.slice(start, end);

        if (pageExpenses.length === 0) {
            showTableMessage("No expenses found.");
        } else {
            elements.table.innerHTML = pageExpenses.map(function (expense) {
                const id = getExpenseId(expense);

                const date = expense.expense_date
                    ? new Date(
                        String(expense.expense_date).substring(0, 10) +
                        "T00:00:00"
                    ).toLocaleDateString()
                    : "-";

                const actions = canManageExpenses
                    ? `
                        <div class="expense-actions">
                            <button
                                type="button"
                                class="edit-expense-btn"
                                data-id="${escapeHTML(id)}"
                            >
                                Edit
                            </button>
                        </div>
                    `
                    : "-";

                return `
                    <tr>
                        <td>${escapeHTML(date)}</td>
                        <td>${escapeHTML(expense.expense_category || "-")}</td>
                        <td>${escapeHTML(expense.description || "-")}</td>
                        <td>${escapeHTML(
                            String(expense.payment_method || "-")
                                .replaceAll("_", " ")
                        )}</td>
                        <td>${escapeHTML(expense.receipt_number || "-")}</td>
                        <td class="expense-amount">
                            ${escapeHTML(formatCurrency(expense.amount))}
                        </td>
                        <td>${actions}</td>
                    </tr>
                `;
            }).join("");
        }

        const totalPages = Math.max(
            1,
            Math.ceil(filteredExpenses.length / pageSize)
        );

        elements.paginationInfo.textContent =
            `Showing ${filteredExpenses.length === 0 ? 0 : start + 1}–` +
            `${Math.min(end, filteredExpenses.length)} of ` +
            `${filteredExpenses.length} expenses`;

        elements.previousButton.disabled = currentPage <= 1;
        elements.nextButton.disabled = currentPage >= totalPages;
    }

    function applyFilters() {
        const search = elements.search.value.toLowerCase();
        const category = elements.categoryFilter.value;
        const date = elements.dateFilter.value;

        filteredExpenses = allExpenses.filter(function (expense) {
            const searchableText = [
                expense.expense_category,
                expense.description,
                expense.receipt_number,
                expense.payment_method
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(search);

            const matchesCategory =
                !category || expense.expense_category === category;

            const matchesDate =
                !date ||
                String(expense.expense_date).substring(0, 10) === date;

            return matchesSearch && matchesCategory && matchesDate;
        });

        currentPage = 1;

        updateSummary();
        renderExpenses();
    }

    async function loadExpenses() {
        showTableMessage("Loading expenses...");

        try {
            const response = await window.expenseService.getExpenses();

            allExpenses = getExpenseArray(response);

            applyFilters();

            await loadSummary();
        } catch (error) {
            console.error("Expense loading error:", error);

            showTableMessage(
                error.message || "Unable to load expenses."
            );
        }
    }

    async function loadSummary() {
        try {
            const response =
                await window.expenseService.getExpenseSummary();

            const data = getPayload(response);
            const summary = data.summary || data;

            if (summary.total_expenses !== undefined) {
                elements.total.textContent =
                    formatCurrency(summary.total_expenses);
            }

            if (summary.expense_count !== undefined) {
                elements.count.textContent = summary.expense_count;
            }

            if (summary.average_expense !== undefined) {
                elements.average.textContent =
                    formatCurrency(summary.average_expense);
            }
        } catch (error) {
            console.warn(
                "Expense summary could not be loaded:",
                error
            );
        }
    }

    async function saveExpense(event) {
        event.preventDefault();

        if (!canManageExpenses) {
            showFormMessage("You do not have permission to manage expenses.");
            return;
        }

        const amount = Number(elements.amount.value);

        if (!Number.isFinite(amount) || amount <= 0) {
            showFormMessage("Please enter a valid expense amount.");
            return;
        }

        const expenseData = {
            expense_category: elements.category.value,
            description: elements.description.value,
            amount: amount,
            expense_date: elements.date.value,
            payment_method: elements.paymentMethod.value,
            receipt_number: elements.receipt.value || null
        };

        if (
            !expenseData.expense_category ||
            !expenseData.description ||
            !expenseData.expense_date ||
            !expenseData.payment_method
        ) {
            showFormMessage("Please complete all required fields.");
            return;
        }

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = "Saving...";

        try {
            const expenseId = elements.expenseId.value;

            if (expenseId) {
                await window.expenseService.updateExpense(
                    expenseId,
                    expenseData
                );
            } else {
                await window.expenseService.createExpense(
                    expenseData
                );
            }

            closeModal();
            await loadExpenses();

        } catch (error) {
            console.error("Expense save error:", error);

            showFormMessage(
                error.message || "Unable to save expense."
            );
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent =
                elements.expenseId.value
                    ? "Update Expense"
                    : "Save Expense";
        }
    }

    // Add expense
    elements.addButton.addEventListener("click", function () {
        openModal();
    });

    // Close modal
    elements.closeButton.addEventListener("click", closeModal);
    elements.cancelButton.addEventListener("click", closeModal);

    elements.modal.addEventListener("click", function (event) {
        if (event.target === elements.modal) {
            closeModal();
        }
    });

    // Save expense
    elements.form.addEventListener("submit", saveExpense);

    // Search and filters
    elements.search.addEventListener("input", applyFilters);

    elements.categoryFilter.addEventListener(
        "change",
        applyFilters
    );

    elements.dateFilter.addEventListener(
        "change",
        applyFilters
    );

    elements.resetFilters.addEventListener("click", function () {
        elements.search.value = "";
        elements.categoryFilter.value = "";
        elements.dateFilter.value = "";

        applyFilters();
    });

    // Edit expense
    elements.table.addEventListener("click", function (event) {
        const button = event.target.closest(".edit-expense-btn");

        if (!button) {
            return;
        }

        const expense = allExpenses.find(function (item) {
            return String(getExpenseId(item)) === button.dataset.id;
        });

        if (expense) {
            openModal(expense);
        }
    });

    // Pagination
    elements.previousButton.addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            renderExpenses();
        }
    });

    elements.nextButton.addEventListener("click", function () {
        const totalPages = Math.ceil(
            filteredExpenses.length / pageSize
        );

        if (currentPage < totalPages) {
            currentPage++;
            renderExpenses();
        }
    });

    // Hide add button for roles without permission
    if (!canManageExpenses) {
        elements.addButton.style.display = "none";
    }

    // Initial loading
    loadExpenses();
});
