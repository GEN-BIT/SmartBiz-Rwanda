/*
 * SmartBiz Rwanda Supplier Service
 * Handles supplier API requests.
 */

window.supplierService = {
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
            throw new Error(result.message || "Unable to complete the supplier request.");
        }

        return result;
    },

    async getSuppliers(businessId, filters = {}) {
        const query = new URLSearchParams();
        if (filters.page) query.set("page", filters.page);
        if (filters.limit) query.set("limit", filters.limit);
        if (filters.search) query.set("search", filters.search);
        if (filters.status) query.set("status", filters.status);

        const suffix = query.toString();
        return this.request(
            `/businesses/${businessId}/suppliers${suffix ? `?${suffix}` : ""}`,
            { method: "GET" }
        );
    },

    async getSupplier(businessId, supplierId) {
        return this.request(
            `/businesses/${businessId}/suppliers/${supplierId}`,
            { method: "GET" }
        );
    },

    async createSupplier(businessId, data) {
        return this.request(
            `/businesses/${businessId}/suppliers`,
            { method: "POST", body: JSON.stringify(data) }
        );
    },

    async updateSupplier(businessId, supplierId, data) {
        return this.request(
            `/businesses/${businessId}/suppliers/${supplierId}`,
            { method: "PUT", body: JSON.stringify(data) }
        );
    },

    async updateSupplierStatus(businessId, supplierId, status) {
        return this.request(
            `/businesses/${businessId}/suppliers/${supplierId}/status`,
            { method: "PATCH", body: JSON.stringify({ status }) }
        );
    },

    async getSupplierPurchases(businessId, supplierId, filters = {}) {
        const query = new URLSearchParams();
        if (filters.page) query.set("page", filters.page);
        if (filters.limit) query.set("limit", filters.limit);

        const suffix = query.toString();
        return this.request(
            `/businesses/${businessId}/suppliers/${supplierId}/purchases${suffix ? `?${suffix}` : ""}`,
            { method: "GET" }
        );
    }
};
