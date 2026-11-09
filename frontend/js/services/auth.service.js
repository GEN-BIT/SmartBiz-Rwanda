/*
 * SmartBiz Rwanda authentication service
 * Handles communication with the authentication API.
 */

window.authService = {

    // Send a request to the backend
    async request(endpoint, options = {}) {

        const response = await fetch(
            window.SMARTBIZ_CONFIG.API_BASE_URL + endpoint,
            {
                ...options,
                headers: {
                    "Content-Type": "application/json",
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
                result.message || "Something went wrong. Please try again."
            );
        }

        return result;
    },


    // Register a business and its owner
    async register(formData) {

        return await this.request("/auth/register", {
            method: "POST",
            body: JSON.stringify(formData)
        });

    },


    // Log in an existing user
    async login(credentials) {

        return await this.request("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials)
        });

    },


    // Retrieve the authenticated user
    async getMe(token) {

        return await this.request("/auth/me", {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token
            }
        });

    },


    // Store the login session for this browser tab
    saveSession(token, membership) {

        sessionStorage.setItem("smartbiz_token", token);

        sessionStorage.setItem(
            "smartbiz_membership",
            JSON.stringify(membership)
        );

    },


    // Remove the login session
    clearSession() {

        sessionStorage.removeItem("smartbiz_token");

        sessionStorage.removeItem("smartbiz_membership");

    }

};
