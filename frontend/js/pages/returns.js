document.addEventListener("DOMContentLoaded", function () {
    const returnModal = document.getElementById("returnModal");
    const detailsModal = document.getElementById("returnDetailsModal");
    const returnForm = document.getElementById("returnForm");

    const newReturnBtn = document.getElementById("newReturnBtn");
    const returnSearch = document.getElementById("returnSearch");
    const statusFilter = document.getElementById("returnStatusFilter");

    const returnsTableBody = document.getElementById("returnsTableBody");
    const returnFormMessage = document.getElementById("returnFormMessage");

    let returns = [];

    function getMembership() {
        try {
            return JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch (error) {
            return null;
        }
    }

    function openModal(modal) {
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal(modal) {
        modal.hidden = true;

        if (returnModal.hidden && detailsModal.hidden) {
            document.body.style.overflow = "";
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

    function formatMoney(amount) {
        const number = Number(amount);

        if (!Number.isFinite(number)) {
            return "RWF —";
        }

        return "RWF " + number.toLocaleString("en-RW");
    }

    function updateStatistics() {
        const total = returns.length;

        const completed = returns.filter(function (item) {
            return item.status === "completed";
        }).length;

        const pending = returns.filter(function (item) {
            return item.status === "pending";
        }).length;

        const refundValue = returns.reduce(function (sum, item) {
            return sum + (Number(item.refund_amount) || 0);
        }, 0);

        document.getElementById("totalReturns").textContent = total;
        document.getElementById("completedReturns").textContent = completed;
        document.getElementById("pendingReturns").textContent = pending;

        document.getElementById("totalRefundValue").textContent =
            formatMoney(refundValue);

        document.getElementById("returnsCount").textContent =
            total + (total === 1 ? " record" : " records");
    }

    function renderReturns() {
        const search = returnSearch.value.toLowerCase();
        const selectedStatus = statusFilter.value;

        const filtered = returns.filter(function (item) {
            const returnReference = String(item.return_reference || "").toLowerCase();
            const saleReference = String(item.sale_reference || "").toLowerCase();

            const matchesSearch =
                returnReference.includes(search) ||
                saleReference.includes(search);

            const matchesStatus =
                !selectedStatus || item.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            returnsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="returns-empty">
                        No return records are available.
                    </td>
                </tr>
            `;
            return;
        }

        returnsTableBody.innerHTML = filtered.map(function (item, index) {
            return `
                <tr>
                    <td>${escapeHTML(item.return_reference || "—")}</td>
                    <td>${escapeHTML(item.sale_reference || "—")}</td>
                    <td>${escapeHTML(item.return_date || "—")}</td>
                    <td>${escapeHTML(item.reason || "—")}</td>
                    <td>${formatMoney(item.refund_amount)}</td>
                    <td>
    <span class="return-status ${escapeHTML(item.status || "pending")}">
        ${escapeHTML(item.status || "Unknown")}
    </span>
</td>
                    <td>
                        <button class="btn btn-secondary btn-sm"
                                type="button"
                                data-return-index="${index}">
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function showReturnDetails(item) {
        const content = document.getElementById("returnDetailsContent");

        content.innerHTML = `
            <div class="return-detail-row">
                <span>Return reference</span>
                <strong>${escapeHTML(item.return_reference || "—")}</strong>
            </div>
            <div class="return-detail-row">
                <span>Sale reference</span>
                <strong>${escapeHTML(item.sale_reference || "—")}</strong>
            </div>
            <div class="return-detail-row">
                <span>Return date</span>
                <strong>${escapeHTML(item.return_date || "—")}</strong>
            </div>
            <div class="return-detail-row">
                <span>Reason</span>
                <strong>${escapeHTML(item.reason || "—")}</strong>
            </div>
            <div class="return-detail-row">
                <span>Refund amount</span>
                <strong>${formatMoney(item.refund_amount)}</strong>
            </div>
            <div class="return-detail-row">
                <span>Status</span>
                <strong>${escapeHTML(item.status || "Unknown")}</strong>
            </div>
        `;

        openModal(detailsModal);
    }

    newReturnBtn.addEventListener("click", function () {
        returnForm.reset();
        returnFormMessage.textContent = "";

        if (!getMembership()) {
            returnFormMessage.textContent =
                "Please sign in to access your business.";
        }

        openModal(returnModal);
    });

    document.querySelectorAll("[data-close-return-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeModal(returnModal);
        });
    });

    document.querySelectorAll("[data-close-details-modal]").forEach(function (button) {
        button.addEventListener("click", function () {
            closeModal(detailsModal);
        });
    });

    [returnModal, detailsModal].forEach(function (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (!detailsModal.hidden) {
                closeModal(detailsModal);
            } else if (!returnModal.hidden) {
                closeModal(returnModal);
            }
        }
    });

    returnForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const membership = getMembership();

        if (!membership || !membership.business_id) {
            returnFormMessage.textContent =
                "Your business session could not be identified. Please sign in again.";
            return;
        }

        returnFormMessage.textContent =
            "Return submission is awaiting connection to the verified sales and returns API. No transaction has been created.";
    });

    returnSearch.addEventListener("input", renderReturns);
    statusFilter.addEventListener("change", renderReturns);

    document.getElementById("filterReturnsBtn").addEventListener("click", function () {
        renderReturns();
    });

    document.getElementById("resetReturnsBtn").addEventListener("click", function () {
        returnSearch.value = "";
        statusFilter.value = "";
        document.getElementById("returnStartDate").value = "";
        document.getElementById("returnEndDate").value = "";

        renderReturns();
    });

    returnsTableBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-return-index]");

        if (!button) {
            return;
        }

        const index = Number(button.dataset.returnIndex);

        if (returns[index]) {
            showReturnDetails(returns[index]);
        }
    });

    const membership = getMembership();

    if (membership && typeof window.renderSidebar === "function") {
        window.renderSidebar(membership);
    }

    if (!membership) {
        returnsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="returns-empty">
                    Please sign in to access returns management.
                </td>
            </tr>
        `;
    }

    updateStatistics();
    renderReturns();
});