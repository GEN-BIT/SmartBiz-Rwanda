/*
 * SmartBiz Rwanda Inventory API Service
 */

window.inventoryService = {
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
            throw new Error(result.message || "The request could not be completed.");
        }

        return result;
    },

    async getInventory(businessId, filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        return this.request(
            `/businesses/${businessId}/inventory?${params.toString()}`
        );
    },

    async getSummary(businessId) {
        return this.request(
            `/businesses/${businessId}/inventory/summary`
        );
    },

    async getMovements(businessId, filters = {}) {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });

        return this.request(
            `/businesses/${businessId}/inventory/movements?${params.toString()}`
        );
    },

    async adjustStock(businessId, adjustmentData) {
        return this.request(
            `/businesses/${businessId}/inventory/adjustments`,
            {
                method: "POST",
                body: JSON.stringify(adjustmentData)
            }
        );
    }
};