
/*
 * SmartBiz Rwanda Customer Service
 * Handles customer API requests.
 */

window.customerService = {

    async request(endpoint, options = {}) {
        const token = sessionStorage.getItem("smartbiz_token");

        const response = await fetch(
            `${window.SMARTBIZ_CONFIG.API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    ...options.headers
                }
            }
        );

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error(
                result.message || "Unable to complete the customer request."
            );
        }

        return result;
    },

    async getCustomers(businessId, filters = {}) {
        const query = new URLSearchParams();

        if (filters.page) query.set("page", filters.page);
        if (filters.limit) query.set("limit", filters.limit);
        if (filters.search) query.set("search", filters.search);
        if (filters.status) query.set("status", filters.status);

        const queryString = query.toString();

        return this.request(
            `/businesses/${businessId}/customers${queryString ? `?${queryString}` : ""}`,
            { method: "GET" }
        );
    },

    async getCustomerById(businessId, customerId) {
        return this.request(
            `/businesses/${businessId}/customers/${customerId}`,
            { method: "GET" }
        );
    },

    async createCustomer(businessId, customerData) {
        return this.request(
            `/businesses/${businessId}/customers`,
            {
                method: "POST",
                body: JSON.stringify(customerData)
            }
        );
    },

    async updateCustomer(businessId, customerId, customerData) {
        return this.request(
            `/businesses/${businessId}/customers/${customerId}`,
            {
                method: "PUT",
                body: JSON.stringify(customerData)
            }
        );
    },

    async updateCustomerStatus(businessId, customerId, status) {
        return this.request(
            `/businesses/${businessId}/customers/${customerId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({ status })
            }
        );
    },

    async getCustomerHistory(businessId, customerId) {
        return this.request(
            `/businesses/${businessId}/customers/${customerId}/history`,
            { method: "GET" }
        );
    },

    async getDebts(businessId, filters = {}) {
        const query = new URLSearchParams();

        if (filters.page) query.set("page", filters.page);
        if (filters.limit) query.set("limit", filters.limit);
        if (filters.search) query.set("search", filters.search);

        const queryString = query.toString();

        return this.request(
            `/businesses/${businessId}/debts${queryString ? `?${queryString}` : ""}`,
            { method: "GET" }
        );
    },

    async recordDebtPayment(businessId, saleId, paymentData) {
        return this.request(
            `/businesses/${businessId}/debts/${saleId}/payments`,
            {
                method: "POST",
                body: JSON.stringify(paymentData)
            }
        );
    }
};
