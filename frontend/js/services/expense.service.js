
/*
 * SmartBiz Rwanda
 * Expense API Service
 *
 * Connects the Expenses frontend to the existing backend routes.
 */

(function () {
    "use strict";

    const API_BASE_URL = (
        window.SMARTBIZ_CONFIG?.API_BASE_URL ||
        "http://localhost:5000/api/v1"
    ).replace(/\/+$/, "");

    function getToken() {
        return sessionStorage.getItem("smartbiz_token");
    }

    function buildQueryString(params = {}) {
        const query = new URLSearchParams();

        Object.entries(params).forEach(function ([key, value]) {
            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                query.set(key, String(value));
            }
        });

        const queryString = query.toString();

        return queryString ? `?${queryString}` : "";
    }

    async function request(endpoint, options = {}) {
        const token = getToken();

        if (!token) {
            throw new Error("Your session has expired. Please log in again.");
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
        };

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                method: options.method || "GET",
                headers,
                body: options.body !== undefined
                    ? JSON.stringify(options.body)
                    : undefined
            }
        );

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            if (response.status === 401) {
                sessionStorage.removeItem("smartbiz_token");
                sessionStorage.removeItem("smartbiz_membership");

                window.location.replace("login.html");
            }

            throw new Error(
                result.message || "Unable to complete the expense request."
            );
        }

        return result;
    }

    function businessEndpoint(businessId) {
        if (!businessId) {
            throw new Error("Business information is missing.");
        }

        return `/businesses/${encodeURIComponent(businessId)}/expenses`;
    }

    const expenseService = {

        /*
         * Get expense records with optional filters and pagination.
         */
        async getExpenses(businessId, params = {}) {
            const endpoint =
                businessEndpoint(businessId) +
                buildQueryString(params);

            return request(endpoint);
        },

        /*
         * Get total expenses, average, category and payment summaries.
         */
        async getExpenseSummary(businessId, params = {}) {
            const endpoint =
                businessEndpoint(businessId) +
                "/summary" +
                buildQueryString(params);

            return request(endpoint);
        },

        /*
         * Get one expense by ID.
         */
        async getExpense(businessId, expenseId) {
            return request(
                `${businessEndpoint(businessId)}/${encodeURIComponent(expenseId)}`
            );
        },

        /*
         * Create a new expense.
         */
        async createExpense(businessId, expenseData) {
            return request(
                businessEndpoint(businessId),
                {
                    method: "POST",
                    body: expenseData
                }
            );
        },

        /*
         * Update an existing expense.
         */
        async updateExpense(businessId, expenseId, expenseData) {
            return request(
                `${businessEndpoint(businessId)}/${encodeURIComponent(expenseId)}`,
                {
                    method: "PUT",
                    body: expenseData
                }
            );
        }

    };

    /*
     * Make the service available globally.
     * The page JavaScript uses this exact name.
     */
    window.expenseService = expenseService;

})();
