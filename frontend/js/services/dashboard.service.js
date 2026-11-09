/*
 * SmartBiz Rwanda Dashboard Service
 * Handles dashboard data requests.
 */

window.dashboardService = {

    async getDashboard(businessId, token) {
        if (!businessId || !token) {
            throw new Error("Business ID and authentication token are required.");
        }

        return await window.authService.request(
            `/businesses/${encodeURIComponent(businessId)}/dashboard`,
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );
    }

};