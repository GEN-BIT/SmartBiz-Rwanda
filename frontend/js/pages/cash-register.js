/*
 * SmartBiz Rwanda - Cash Register Page
 * Handles register opening, closing, current balances and history.
 */

document.addEventListener("DOMContentLoaded", function () {

    // ---------------------------------------------------------
    // SESSION AND PAGE ELEMENTS
    // ---------------------------------------------------------

    const token = sessionStorage.getItem("smartbiz_token");

    let membership = null;

    try {
        membership = JSON.parse(
            sessionStorage.getItem("smartbiz_membership")
        );
    } catch {
        membership = null;
    }

    if (!token || !membership || !membership.business_id) {

        sessionStorage.removeItem("smartbiz_token");
        sessionStorage.removeItem("smartbiz_membership");

        window.location.href = "login.html";
        return;

    }

    const businessId = membership.business_id;
    const employeeId = membership.employee_id;
    const userRole = String(membership.role || "").toLowerCase();

    const allowedRoles = ["owner", "manager", "cashier"];

    if (!allowedRoles.includes(userRole)) {

        alert("You do not have permission to access the cash register.");

        window.location.href = "dashboard.html";
        return;

    }


    // ---------------------------------------------------------
    // PAGE ELEMENTS
    // ---------------------------------------------------------

    const registerStatusIcon =
        document.getElementById("registerStatusIcon");

    const registerStatus =
        document.getElementById("registerStatus");

    const registerStatusDescription =
        document.getElementById("registerStatusDescription");

    const openRegisterBtn =
        document.getElementById("openRegisterBtn");

    const closeRegisterBtn =
        document.getElementById("closeRegisterBtn");

    const openingBalanceElement =
        document.getElementById("openingBalance");

    const expectedBalanceElement =
        document.getElementById("expectedBalance");

    const closingBalanceElement =
        document.getElementById("closingBalance");

    const registerDifferenceElement =
        document.getElementById("registerDifference");

    const sessionBadge =
        document.getElementById("sessionBadge");

    const sessionRegisterId =
        document.getElementById("sessionRegisterId");

    const sessionOpenedAt =
        document.getElementById("sessionOpenedAt");

    const sessionCashier =
        document.getElementById("sessionCashier");

    const sessionStatus =
        document.getElementById("sessionStatus");

    const historyBody =
        document.getElementById("registerHistoryBody");

    const filterHistoryBtn =
        document.getElementById("filterHistoryBtn");

    const historyStartDate =
        document.getElementById("historyStartDate");

    const historyEndDate =
        document.getElementById("historyEndDate");

    const openRegisterModal =
        document.getElementById("openRegisterModal");

    const closeRegisterModal =
        document.getElementById("closeRegisterModal");

    const openRegisterForm =
        document.getElementById("openRegisterForm");

    const closeRegisterForm =
        document.getElementById("closeRegisterForm");

    const openingAmount =
        document.getElementById("openingAmount");

    const openingNotes =
        document.getElementById("openingNotes");

    const closingAmount =
        document.getElementById("closingAmount");

    const closingNotes =
        document.getElementById("closingNotes");

    const openRegisterMessage =
        document.getElementById("openRegisterMessage");

    const closeRegisterMessage =
        document.getElementById("closeRegisterMessage");

    const confirmOpenRegisterBtn =
        document.getElementById("confirmOpenRegisterBtn");

    const confirmCloseRegisterBtn =
        document.getElementById("confirmCloseRegisterBtn");

    const currentDateElement =
        document.getElementById("currentDate");


    // ---------------------------------------------------------
    // PAGE STATE
    // ---------------------------------------------------------

    let currentRegister = null;
    let currentHistoryPage = 1;
    const historyLimit = 20;


    // ---------------------------------------------------------
    // GENERAL HELPERS
    // ---------------------------------------------------------

    function formatMoney(value) {

        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "RWF 0";
        }

        return new Intl.NumberFormat("en-RW", {
            style: "currency",
            currency: "RWF",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-RW", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);

    }


    function showMessage(element, message, type = "error") {

        if (!element) {
            return;
        }

        element.textContent = message;
        element.className = `form-message show ${type}`;

    }


    function clearMessage(element) {

        if (!element) {
            return;
        }

        element.textContent = "";
        element.className = "form-message";

    }


    function setButtonLoading(button, loading, originalText) {

        if (!button) {
            return;
        }

        button.disabled = loading;
        button.textContent = loading
            ? "Please wait..."
            : originalText;

    }


    function createCell(value) {

        const cell = document.createElement("td");

        cell.textContent =
            value === undefined || value === null || value === ""
                ? "—"
                : String(value);

        return cell;

    }


    function setCurrentDate() {

        if (!currentDateElement) {
            return;
        }

        currentDateElement.textContent =
            new Intl.DateTimeFormat("en-RW", {
                dateStyle: "full"
            }).format(new Date());

    }


    // ---------------------------------------------------------
    // MODAL HELPERS
    // ---------------------------------------------------------

    function showModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");

    }


    function hideModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

    }


    document.querySelectorAll("[data-close-modal]").forEach(button => {

        button.addEventListener("click", function () {

            const modalId = button.getAttribute("data-close-modal");

            hideModal(document.getElementById(modalId));

        });

    });


    [openRegisterModal, closeRegisterModal].forEach(modal => {

        if (!modal) {
            return;
        }

        modal.addEventListener("click", function (event) {

            if (event.target === modal) {
                hideModal(modal);
            }

        });

    });


    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            hideModal(openRegisterModal);
            hideModal(closeRegisterModal);
        }

    });


    // ---------------------------------------------------------
    // STATUS AND BALANCE DISPLAY
    // ---------------------------------------------------------

    function resetRegisterDisplay() {

        currentRegister = null;

        if (registerStatusIcon) {
            registerStatusIcon.textContent = "○";
        }

        if (registerStatus) {
            registerStatus.textContent = "No Open Register";
        }

        if (registerStatusDescription) {
            registerStatusDescription.textContent =
                "Open a cash register to begin recording cash sales.";
        }

        if (openRegisterBtn) {
            openRegisterBtn.style.display = "";
            openRegisterBtn.disabled = false;
        }

        if (closeRegisterBtn) {
            closeRegisterBtn.style.display = "none";
        }

        if (openingBalanceElement) {
            openingBalanceElement.textContent = formatMoney(0);
        }

        if (expectedBalanceElement) {
            expectedBalanceElement.textContent = formatMoney(0);
        }

        if (closingBalanceElement) {
            closingBalanceElement.textContent = "—";
        }

        if (registerDifferenceElement) {
            registerDifferenceElement.textContent = "—";
        }

        if (sessionBadge) {
            sessionBadge.textContent = "No Active Session";
        }

        if (sessionRegisterId) {
            sessionRegisterId.textContent = "—";
        }

        if (sessionOpenedAt) {
            sessionOpenedAt.textContent = "—";
        }

        if (sessionCashier) {
            sessionCashier.textContent =
                membership.full_name || membership.employee_name || "Current employee";
        }

        if (sessionStatus) {
            sessionStatus.textContent = "Not Open";
        }

    }


    function displayCurrentRegister(register) {

        if (!register) {
            resetRegisterDisplay();
            return;
        }

        currentRegister = register;

        if (registerStatusIcon) {
            registerStatusIcon.textContent = "●";
        }

        if (registerStatus) {
            registerStatus.textContent = "Register Open";
        }

        if (registerStatusDescription) {
            registerStatusDescription.textContent =
                "Your cash register is active and ready for transactions.";
        }

        if (openRegisterBtn) {
            openRegisterBtn.style.display = "none";
        }

        if (closeRegisterBtn) {
            closeRegisterBtn.style.display = "";
            closeRegisterBtn.disabled = false;
        }

        if (openingBalanceElement) {
            openingBalanceElement.textContent =
                formatMoney(register.opening_balance);
        }

        if (expectedBalanceElement) {
            expectedBalanceElement.textContent =
                formatMoney(register.expected_balance);
        }

        if (closingBalanceElement) {
            closingBalanceElement.textContent = "Not closed";
        }

        if (registerDifferenceElement) {
            registerDifferenceElement.textContent = "Not available";
        }

        if (sessionBadge) {
            sessionBadge.textContent = "Active Session";
        }

        if (sessionRegisterId) {
            sessionRegisterId.textContent =
                register.register_id ?? "—";
        }

        if (sessionOpenedAt) {
            sessionOpenedAt.textContent =
                formatDate(register.opened_at);
        }

        if (sessionCashier) {
            sessionCashier.textContent =
                register.employee_name ||
                membership.full_name ||
                membership.employee_name ||
                "Current employee";
        }

        if (sessionStatus) {
            sessionStatus.textContent = "Open";
        }

    }


    // ---------------------------------------------------------
    // CURRENT REGISTER
    // ---------------------------------------------------------

    async function loadCurrentRegister() {

        try {

            const response =
                await window.cashRegisterService.getCurrentRegister(
                    businessId
                );

            displayCurrentRegister(response.data || null);

        } catch (error) {

            console.error("Current register error:", error);

            if (registerStatusDescription) {
                registerStatusDescription.textContent = error.message;
            }

        }

    }


    // ---------------------------------------------------------
    // OPEN REGISTER
    // ---------------------------------------------------------

    if (openRegisterBtn) {

        openRegisterBtn.addEventListener("click", function () {

            clearMessage(openRegisterMessage);

            if (openRegisterForm) {
                openRegisterForm.reset();
            }

            showModal(openRegisterModal);

        });

    }


    if (openRegisterForm) {

        openRegisterForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            clearMessage(openRegisterMessage);

            const openingBalanceValue =
                openingAmount ? openingAmount.value : "";

            if (
                openingBalanceValue === "" ||
                !Number.isFinite(Number(openingBalanceValue)) ||
                Number(openingBalanceValue) < 0
            ) {

                showMessage(
                    openRegisterMessage,
                    "Enter a valid opening balance.",
                    "error"
                );

                return;

            }

            const registerData = {
                opening_balance: Number(openingBalanceValue),
                notes: openingNotes ? openingNotes.value : ""
            };

            setButtonLoading(
                confirmOpenRegisterBtn,
                true,
                "Open Register"
            );

            try {

                await window.cashRegisterService.openRegister(
                    businessId,
                    registerData
                );

                showMessage(
                    openRegisterMessage,
                    "Cash register opened successfully.",
                    "success"
                );

                hideModal(openRegisterModal);

                openRegisterForm.reset();

                await loadCurrentRegister();
                await loadRegisterHistory(1);

            } catch (error) {

                showMessage(
                    openRegisterMessage,
                    error.message,
                    "error"
                );

            } finally {

                setButtonLoading(
                    confirmOpenRegisterBtn,
                    false,
                    "Open Register"
                );

            }

        });

    }


    // ---------------------------------------------------------
    // CLOSE REGISTER
    // ---------------------------------------------------------

    if (closeRegisterBtn) {

        closeRegisterBtn.addEventListener("click", function () {

            if (!currentRegister) {
                return;
            }

            clearMessage(closeRegisterMessage);

            if (closeRegisterForm) {
                closeRegisterForm.reset();
            }

            showModal(closeRegisterModal);

        });

    }


    if (closeRegisterForm) {

        closeRegisterForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            clearMessage(closeRegisterMessage);

            if (!currentRegister || !currentRegister.register_id) {

                showMessage(
                    closeRegisterMessage,
                    "No active cash register was found.",
                    "error"
                );

                return;

            }

            const closingBalanceValue =
                closingAmount ? closingAmount.value : "";

            if (
                closingBalanceValue === "" ||
                !Number.isFinite(Number(closingBalanceValue)) ||
                Number(closingBalanceValue) < 0
            ) {

                showMessage(
                    closeRegisterMessage,
                    "Enter a valid closing balance.",
                    "error"
                );

                return;

            }

            const registerData = {
                closing_balance: Number(closingBalanceValue),
                notes: closingNotes ? closingNotes.value : ""
            };

            setButtonLoading(
                confirmCloseRegisterBtn,
                true,
                "Close Register"
            );

            try {

                await window.cashRegisterService.closeRegister(
                    businessId,
                    currentRegister.register_id,
                    registerData
                );

                showMessage(
                    closeRegisterMessage,
                    "Cash register closed successfully.",
                    "success"
                );

                hideModal(closeRegisterModal);

                closeRegisterForm.reset();

                await loadCurrentRegister();
                await loadRegisterHistory(1);

            } catch (error) {

                showMessage(
                    closeRegisterMessage,
                    error.message,
                    "error"
                );

            } finally {

                setButtonLoading(
                    confirmCloseRegisterBtn,
                    false,
                    "Close Register"
                );

            }

        });

    }


    // ---------------------------------------------------------
    // REGISTER HISTORY
    // ---------------------------------------------------------

    function renderHistory(registers) {

        if (!historyBody) {
            return;
        }

        historyBody.replaceChildren();

        if (!Array.isArray(registers) || registers.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 7;
            cell.textContent = "No cash register history found.";
            cell.className = "empty-state";

            row.appendChild(cell);
            historyBody.appendChild(row);

            return;

        }

        registers.forEach(register => {

            const row = document.createElement("tr");

            row.appendChild(
                createCell(register.register_id)
            );

            row.appendChild(
                createCell(register.employee_name)
            );

            row.appendChild(
                createCell(formatDate(register.opened_at))
            );

            row.appendChild(
                createCell(formatDate(register.closed_at))
            );

            row.appendChild(
                createCell(formatMoney(register.opening_balance))
            );

            row.appendChild(
                createCell(
                    register.closing_balance === null
                        ? "—"
                        : formatMoney(register.closing_balance)
                )
            );

            const statusCell = createCell(register.status);

            statusCell.classList.add(
                String(register.status).toLowerCase() === "open"
                    ? "status-open"
                    : "status-closed"
            );

            row.appendChild(statusCell);

            historyBody.appendChild(row);

        });

    }


    async function loadRegisterHistory(page = 1) {

        if (!historyBody) {
            return;
        }

        historyBody.innerHTML =
            '<tr><td colspan="7">Loading register history...</td></tr>';

        const filters = {
            page: page,
            limit: historyLimit
        };

        // The backend currently supports status, page and limit.
        // Date fields are intentionally not sent because the backend
        // does not currently implement start_date or end_date filters.

        const statusFilter =
            document.getElementById("historyStatus");

        if (statusFilter && statusFilter.value) {
            filters.status = statusFilter.value;
        }

        try {

            const response =
                await window.cashRegisterService.getRegisterHistory(
                    businessId,
                    filters
                );

            const result = response.data || {};

            const registers = Array.isArray(result.data)
                ? result.data
                : [];

            currentHistoryPage =
                result.pagination?.page || page;

            renderHistory(registers);

            renderHistoryPagination(
                result.pagination || {}
            );

        } catch (error) {

            console.error("Register history error:", error);

            historyBody.innerHTML = "";

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 7;
            cell.textContent = error.message;

            row.appendChild(cell);
            historyBody.appendChild(row);

        }

    }


    // ---------------------------------------------------------
    // HISTORY PAGINATION
    // ---------------------------------------------------------

    function renderHistoryPagination(pagination) {

        let paginationContainer =
            document.getElementById("registerHistoryPagination");

        if (!paginationContainer) {

            paginationContainer = document.createElement("div");

            paginationContainer.id = "registerHistoryPagination";
            paginationContainer.className = "history-pagination";

            if (historyBody && historyBody.closest("table")) {

                historyBody.closest("table").insertAdjacentElement(
                    "afterend",
                    paginationContainer
                );

            } else {
                return;
            }

        }

        paginationContainer.replaceChildren();

        const totalPages = Number(pagination.total_pages || 0);
        const currentPage = Number(pagination.page || 1);

        if (totalPages <= 1) {
            return;
        }

        const previousButton = document.createElement("button");

        previousButton.type = "button";
        previousButton.textContent = "Previous";
        previousButton.disabled = currentPage <= 1;

        previousButton.addEventListener("click", function () {
            loadRegisterHistory(currentPage - 1);
        });

        const pageText = document.createElement("span");

        pageText.textContent =
            `Page ${currentPage} of ${totalPages}`;

        const nextButton = document.createElement("button");

        nextButton.type = "button";
        nextButton.textContent = "Next";
        nextButton.disabled = currentPage >= totalPages;

        nextButton.addEventListener("click", function () {
            loadRegisterHistory(currentPage + 1);
        });

        paginationContainer.append(
            previousButton,
            pageText,
            nextButton
        );

    }


    if (filterHistoryBtn) {

        filterHistoryBtn.addEventListener("click", function () {

            // Date filters are not yet supported by the backend.
            // Reload the available history using supported filters.
            loadRegisterHistory(1);

        });

    }


    // ---------------------------------------------------------
    // SIDEBAR
    // ---------------------------------------------------------

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }


    // ---------------------------------------------------------
    // INITIAL PAGE LOAD
    // ---------------------------------------------------------

    setCurrentDate();

    resetRegisterDisplay();

    loadCurrentRegister();

    loadRegisterHistory(1);

});