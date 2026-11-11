
/*
 * SmartBiz Rwanda
 * Expenses Page
 *
 * Expense listing, filtering, summary, pagination,
 * adding and editing expenses.
 */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const token = sessionStorage.getItem("smartbiz_token");
    const savedMembership = sessionStorage.getItem("smartbiz_membership");

    let membership;

    if (!token || !savedMembership) {
        window.location.replace("login.html");
        return;
    }

    try {
        membership = JSON.parse(savedMembership);
    } catch (error) {
        sessionStorage.removeItem("smartbiz_token");
        sessionStorage.removeItem("smartbiz_membership");
        window.location.replace("login.html");
        return;
    }

    const businessId = membership.business_id;
    const role = String(membership.role || "").toLowerCase();

    if (
        String(membership.business_status || "").toLowerCase() !== "active" ||
        String(membership.membership_status || "").toLowerCase() !== "active"
    ) {
        window.location.replace("login.html");
        return;
    }

    if (!businessId) {
        showPageError("Your business information could not be found.");
        return;
    }

    if (!["owner", "manager"].includes(role)) {
        showPageError(
            "You do not have permission to manage business expenses."
        );
        return;
    }

    if (!window.expenseService) {
        showPageError(
            "The Expense API service has not loaded. Check the script paths in expenses.html."
        );
        console.error("window.expenseService is undefined.");
        return;
    }

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
        previous: document.getElementById("expense-prev-page"),
        next: document.getElementById("expense-next-page"),
        paginationInfo: document.getElementById("expense-pagination-info"),
        modal: document.getElementById("expense-modal"),
        modalTitle: document.getElementById("expense-modal-title"),
        form: document.getElementById("expense-form"),
        expenseId: document.getElementById("expense-id"),
        category: document.getElementById("expense-category"),
        description: document.getElementById("expense-description"),
        amount: document.getElementById("expense-amount"),
        date: document.getElementById("expense-date"),
        paymentMethod: document.getElementById("expense-payment-method"),
        receipt: document.getElementById("expense-receipt"),
        message: document.getElementById("expense-form-message"),
        saveButton: document.getElementById("save-expense-btn"),
        addButton: document.getElementById("add-expense-btn")
    };

    const state = {
        page: 1,
        limit: 20,
        totalPages: 1,
        search: "",
        category: "",
        date: ""
    };

    let searchTimer;

    /* ---------------------------------------------
       GENERAL HELPERS
    --------------------------------------------- */

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-RW", {
            style: "currency",
            currency: "RWF",
            maximumFractionDigits: 0
        }).format(Number(value || 0));
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

    function formatDate(value) {
        if (!value) return "—";

        const dateString = String(value).slice(0, 10);
        const parts = dateString.split("-");

        if (parts.length !== 3) return "—";

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

        if (Number.isNaN(date.getTime())) return "—";

        return new Intl.DateTimeFormat("en-RW", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function getToday() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function paymentMethodLabel(value) {
        const labels = {
            cash: "Cash",
            mobile_money: "Mobile Money",
            bank_transfer: "Bank Transfer",
            card: "Card",
            other: "Other"
        };

        return labels[value] || value || "—";
    }

    function getFilterParams() {
        const params = {};

        if (state.search) {
            params.search = state.search;
        }

        if (state.category) {
            params.category = state.category;
        }

        if (state.date) {
            params.date_from = state.date;
            params.date_to = state.date;
        }

        return params;
    }

    /* ---------------------------------------------
       PAGE ERROR DISPLAY
    --------------------------------------------- */

    function showPageError(message) {
        const table = document.getElementById("expenses-table-body");

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="table-message">
                        ${escapeHTML(message)}
                    </td>
                </tr>
            `;
        }

        const summaryIds = [
            "total-expenses",
            "expense-count",
            "average-expense"
        ];

        summaryIds.forEach(function (id) {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = "—";
            }
        });

        console.error(message);
    }

    /* ---------------------------------------------
       LOAD EXPENSES AND SUMMARY
    --------------------------------------------- */

    async function loadExpenses() {
        elements.table.innerHTML = `
            <tr>
                <td colspan="7" class="table-message">
                    Loading expenses...
                </td>
            </tr>
        `;

        try {
            const filters = getFilterParams();

            const listParams = {
                ...filters,
                page: state.page,
                limit: state.limit
            };

            const [expenseResult, summaryResult] = await Promise.all([
                window.expenseService.getExpenses(
                    businessId,
                    listParams
                ),

                window.expenseService.getExpenseSummary(
                    businessId,
                    filters
                )
            ]);

            renderExpenses(
                expenseResult.data || [],
                expenseResult.pagination || {}
            );

            renderSummary(summaryResult.data || {});

        } catch (error) {
            console.error("Expense loading error:", error);

            elements.table.innerHTML = `
                <tr>
                    <td colspan="7" class="table-message">
                        ${escapeHTML(
                            error.message || "Unable to load expenses."
                        )}
                    </td>
                </tr>
            `;

            elements.paginationInfo.textContent =
                "Unable to load expense records.";
        }
    }

    /* ---------------------------------------------
       SUMMARY CARDS
    --------------------------------------------- */

    function renderSummary(data) {
        const summary = data.summary || {};

        const totalAmount = Number(summary.total_amount || 0);
        const totalExpenses = Number(summary.total_expenses || 0);
        const averageAmount = Number(summary.average_amount || 0);

        elements.total.textContent = formatCurrency(totalAmount);
        elements.count.textContent = totalExpenses.toLocaleString("en-RW");
        elements.average.textContent = formatCurrency(averageAmount);
    }

    /* ---------------------------------------------
       EXPENSE TABLE
    --------------------------------------------- */

    function renderExpenses(expenses, pagination) {
        elements.table.replaceChildren();

        if (!expenses.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 7;
            cell.className = "table-message";
            cell.textContent = "No expenses found.";

            row.appendChild(cell);
            elements.table.appendChild(row);
        } else {
            expenses.forEach(function (expense) {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${escapeHTML(formatDate(expense.expense_date))}</td>

                    <td>${escapeHTML(expense.expense_category)}</td>

                    <td>${escapeHTML(expense.description || "—")}</td>

                    <td>
                        <span class="expense-payment">
                            ${escapeHTML(
                                paymentMethodLabel(expense.payment_method)
                            )}
                        </span>
                    </td>

                    <td>${escapeHTML(expense.receipt_number || "—")}</td>

                    <td class="expense-amount">
                        ${escapeHTML(formatCurrency(expense.amount))}
                    </td>

                    <td>
                        <div class="expense-actions">
                            <button
                                type="button"
                                class="edit-expense"
                                data-id="${escapeHTML(expense.expense_id)}"
                            >
                                Edit
                            </button>
                        </div>
                    </td>
                `;

                elements.table.appendChild(row);
            });
        }

        state.totalPages = Math.max(
            1,
            Number(pagination.total_pages || 1)
        );

        const total = Number(pagination.total || 0);
        const start = total === 0
            ? 0
            : ((state.page - 1) * state.limit) + 1;

        const end = Math.min(state.page * state.limit, total);

        elements.paginationInfo.textContent =
            `Showing ${start}–${end} of ${total} expenses`;

        elements.previous.disabled = state.page <= 1;
        elements.next.disabled = state.page >= state.totalPages;
    }

    /* ---------------------------------------------
       MODAL CONTROLS
    --------------------------------------------- */

    function openModal(expense = null) {
        elements.form.reset();
        elements.expenseId.value = "";
        elements.message.textContent = "";
        elements.message.classList.remove("visible");

        if (expense) {
            elements.modalTitle.textContent = "Edit Expense";

            elements.expenseId.value = expense.expense_id;
            elements.category.value = expense.expense_category || "";
            elements.description.value = expense.description || "";
            elements.amount.value = expense.amount || "";
            elements.date.value = String(
                expense.expense_date || ""
            ).slice(0, 10);

            elements.paymentMethod.value =
                expense.payment_method || "cash";

            elements.receipt.value = expense.receipt_number || "";

            elements.saveButton.textContent = "Update Expense";
        } else {
            elements.modalTitle.textContent = "Add Expense";
            elements.date.value = getToday();
            elements.paymentMethod.value = "cash";
            elements.saveButton.textContent = "Save Expense";
        }

        elements.modal.classList.add("active");
        document.body.style.overflow = "hidden";

        elements.category.focus();
    }

    function closeModal() {
        elements.modal.classList.remove("active");
        document.body.style.overflow = "";
        elements.form.reset();
        elements.message.textContent = "";
        elements.message.classList.remove("visible");
    }

    function showFormMessage(message) {
        elements.message.textContent = message;
        elements.message.classList.add("visible");
    }

    /* ---------------------------------------------
       CREATE OR UPDATE EXPENSE
    --------------------------------------------- */

    async function saveExpense(event) {
        event.preventDefault();

        const expenseId = elements.expenseId.value;

        const expenseData = {
            expense_category: elements.category.value,
            description: elements.description.value,
            amount: elements.amount.value,
            expense_date: elements.date.value,
            payment_method: elements.paymentMethod.value,
            receipt_number: elements.receipt.value
        };

        if (
            !expenseData.expense_category ||
            !expenseData.amount ||
            !expenseData.expense_date ||
            !expenseData.payment_method
        ) {
            showFormMessage("Please complete all required fields.");
            return;
        }

        if (Number(expenseData.amount) <= 0) {
            showFormMessage("The expense amount must be greater than zero.");
            return;
        }

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = "Saving...";

        try {
            if (expenseId) {
                await window.expenseService.updateExpense(
                    businessId,
                    expenseId,
                    expenseData
                );
            } else {
                await window.expenseService.createExpense(
                    businessId,
                    expenseData
                );
            }

            closeModal();

            await loadExpenses();

        } catch (error) {
            console.error("Saving expense error:", error);
            showFormMessage(
                error.message || "Unable to save the expense."
            );
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent = expenseId
                ? "Update Expense"
                : "Save Expense";
        }
    }

    /* ---------------------------------------------
       EDIT EXISTING EXPENSE
    --------------------------------------------- */

    async function editExpense(expenseId) {
        try {
            const result = await window.expenseService.getExpense(
                businessId,
                expenseId
            );

            if (!result.data) {
                throw new Error("Expense information was not found.");
            }

            openModal(result.data);

        } catch (error) {
            console.error("Edit expense error:", error);
            alert(error.message || "Unable to open this expense.");
        }
    }

    /* ---------------------------------------------
       EVENT LISTENERS
    --------------------------------------------- */

    elements.addButton.addEventListener("click", function () {
        openModal();
    });

    document.getElementById("close-expense-modal")
        .addEventListener("click", closeModal);

    document.getElementById("cancel-expense-btn")
        .addEventListener("click", closeModal);

    elements.modal.addEventListener("click", function (event) {
        if (event.target === elements.modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" &&
            elements.modal.classList.contains("active")) {
            closeModal();
        }
    });

    elements.form.addEventListener("submit", saveExpense);

    elements.table.addEventListener("click", function (event) {
        const editButton = event.target.closest(".edit-expense");

        if (editButton) {
            editExpense(editButton.dataset.id);
        }
    });

    elements.search.addEventListener("input", function () {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(function () {
            state.search = elements.search.value.trim();
            state.page = 1;
            loadExpenses();
        }, 350);
    });

    elements.categoryFilter.addEventListener("change", function () {
        state.category = elements.categoryFilter.value;
        state.page = 1;
        loadExpenses();
    });

    elements.dateFilter.addEventListener("change", function () {
        state.date = elements.dateFilter.value;
        state.page = 1;
        loadExpenses();
    });

    elements.resetFilters.addEventListener("click", function () {
        elements.search.value = "";
        elements.categoryFilter.value = "";
        elements.dateFilter.value = "";

        state.search = "";
        state.category = "";
        state.date = "";
        state.page = 1;

        loadExpenses();
    });

    elements.previous.addEventListener("click", function () {
        if (state.page > 1) {
            state.page--;
            loadExpenses();
        }
    });

    elements.next.addEventListener("click", function () {
        if (state.page < state.totalPages) {
            state.page++;
            loadExpenses();
        }
    });

    /* ---------------------------------------------
       INITIAL PAGE LOAD
    --------------------------------------------- */

    loadExpenses();
});
