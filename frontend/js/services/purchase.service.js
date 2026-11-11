/*
 * SmartBiz Rwanda Purchase Service
 */

window.purchaseService = {
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
            throw new Error(result.message || "Unable to complete the purchase request.");
        }

        return result;
    },

    async getPurchases(businessId, filters = {}) {
        const query = new URLSearchParams();

        ["page", "limit", "search", "purchase_status", "payment_status"].forEach((key) => {
            if (filters[key] !== undefined && filters[key] !== "") {
                query.set(key, filters[key]);
            }
        });

        const suffix = query.toString();
        return this.request(
            `/businesses/${businessId}/purchases${suffix ? `?${suffix}` : ""}`,
            { method: "GET" }
        );
    },

    async getPurchase(businessId, purchaseId) {
        return this.request(
            `/businesses/${businessId}/purchases/${purchaseId}`,
            { method: "GET" }
        );
    },

    async createPurchase(businessId, data) {
        return this.request(
            `/businesses/${businessId}/purchases`,
            {
                method: "POST",
                body: JSON.stringify(data)
            }
        );
    },

    async receivePurchase(businessId, purchaseId) {
        return this.request(
            `/businesses/${businessId}/purchases/${purchaseId}/receive`,
            { method: "POST" }
        );
    }
};
