/*
 * SmartBiz Rwanda - Sales API Service
 */

window.salesService = {
    async request(endpoint, options = {}) {
        const token = sessionStorage.getItem("smartbiz_token");

        if (!token) {
            throw new Error("Your session has expired. Please log in again.");
        }

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
        } catch {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error(
                result.message || "The request could not be completed."
            );
        }

        return result;
    },

    async getPosProducts(businessId, search = "") {
        const query = new URLSearchParams();

        if (search) {
            query.set("search", search);
        }

        const suffix = query.toString() ? `?${query.toString()}` : "";

        return this.request(
            `/businesses/${businessId}/pos/products${suffix}`
        );
    },

    async createSale(businessId, saleData) {
        return this.request(
            `/businesses/${businessId}/sales`,
            {
                method: "POST",
                body: JSON.stringify(saleData)
            }
        );
    },

    async getCustomers(businessId) {
        return this.request(
            `/businesses/${businessId}/customers?limit=100`
        );
    },

    async getSales(businessId, filters = {}) {
        const query = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                query.set(key, value);
            }
        });

        const suffix = query.toString() ? `?${query.toString()}` : "";

        return this.request(
            `/businesses/${businessId}/sales${suffix}`
        );
    },

    async getSaleById(businessId, saleId) {
        return this.request(
            `/businesses/${businessId}/sales/${saleId}`
        );
    }
};