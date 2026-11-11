
/* =========================================================
   SMARTBIZ RWANDA - REPORT SERVICE
   Expense reporting through the existing Expense API
   ========================================================= */

(function () {
    "use strict";

    async function getExpenseReport(filters = {}) {
        if (!window.expenseService) {
            throw new Error("Expense service is not loaded.");
        }

        return window.expenseService.getExpenseSummary(filters);
    }

    window.reportService = {
        getExpenseReport
    };

})();
