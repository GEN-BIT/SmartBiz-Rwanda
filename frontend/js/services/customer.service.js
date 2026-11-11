
(function () {
    "use strict";

    const basePath = (businessId) =>
        `/businesses/${encodeURIComponent(businessId)}/customers`;

    const customerService = {
        async getCustomers(businessId, filters = {}) {
            const params = new URLSearchParams();

            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    params.append(key, value);
                }
            });

            const query = params.toString();

            return window.authService.request(
                `${basePath(businessId)}${query ? `?${query}` : ""}`
            );
        },

        async getCustomerById(businessId, customerId) {
            return window.authService.request(
                `${basePath(businessId)}/${encodeURIComponent(customerId)}`
            );
        },

        async createCustomer(businessId, customerData) {
            return window.authService.request(basePath(businessId), {
                method: "POST",
                body: JSON.stringify(customerData)
            });
        },

        async updateCustomer(businessId, customerId, customerData) {
            return window.authService.request(
                `${basePath(businessId)}/${encodeURIComponent(customerId)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(customerData)
                }
            );
        },

        async setCustomerStatus(businessId, customerId, status) {
            return window.authService.request(
                `${basePath(businessId)}/${encodeURIComponent(customerId)}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ status })
                }
            );
        },

        async getCustomerHistory(businessId, customerId) {
            return window.authService.request(
                `${basePath(businessId)}/${encodeURIComponent(customerId)}/history`
            );
        }
    };

    window.customerService = customerService;
})();
