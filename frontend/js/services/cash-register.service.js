/*
 * SmartBiz Rwanda - Cash Register API Service
 * Handles authenticated cash register requests.
 */

window.cashRegisterService = {

    // Send an authenticated request to the backend.
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


    // Retrieve the authenticated employee's current open register.
    async getCurrentRegister(businessId) {

        return this.request(
            `/businesses/${encodeURIComponent(businessId)}/cash-register/current`
        );

    },


    // Open a new cash register.
    async openRegister(businessId, registerData) {

        return this.request(
            `/businesses/${encodeURIComponent(businessId)}/cash-register/open`,
            {
                method: "POST",
                body: JSON.stringify(registerData)
            }
        );

    },


    // Retrieve a specific register.
    async getRegisterById(businessId, registerId) {

        return this.request(
            `/businesses/${encodeURIComponent(businessId)}/cash-register/${encodeURIComponent(registerId)}`
        );

    },


    // Retrieve register history using supported backend filters.
    async getRegisterHistory(businessId, filters = {}) {

        const query = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                query.set(key, value);
            }

        });

        const suffix = query.toString()
            ? `?${query.toString()}`
            : "";

        return this.request(
            `/businesses/${encodeURIComponent(businessId)}/cash-register/history${suffix}`
        );

    },


    // Close an open cash register.
    async closeRegister(businessId, registerId, registerData) {

        return this.request(
            `/businesses/${encodeURIComponent(businessId)}/cash-register/${encodeURIComponent(registerId)}/close`,
            {
                method: "POST",
                body: JSON.stringify(registerData)
            }
        );

    }

};