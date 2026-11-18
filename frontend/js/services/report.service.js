/*
 * SmartBiz Rwanda - Report API Service
 */

(function () {
    "use strict";

    async function getDashboardReport(businessId, filters = {}, token) {
        if (!window.SMARTBIZ_CONFIG || !window.SMARTBIZ_CONFIG.API_BASE_URL) {
            throw new Error("API configuration is missing.");
        }

        if (!token) {
            throw new Error("Your session has expired. Please log in again.");
        }

        if (!businessId) {
            throw new Error("Business information is missing.");
        }

        const params = new URLSearchParams();

        if (filters.date_from) {
            params.set("date_from", filters.date_from);
        }

        if (filters.date_to) {
            params.set("date_to", filters.date_to);
        }

        const query = params.toString();

        const endpoint =
            `/businesses/${encodeURIComponent(businessId)}/reports/dashboard` +
            (query ? `?${query}` : "");

        const response = await fetch(
            window.SMARTBIZ_CONFIG.API_BASE_URL + endpoint,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
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
            if (response.status === 401) {
                throw new Error("Your session has expired. Please log in again.");
            }

            if (response.status === 403) {
                throw new Error("You do not have permission to access business reports.");
            }

            throw new Error(
                result.message || "Unable to load business reports."
            );
        }

        if (!result || !result.data) {
            throw new Error("The report response is incomplete.");
        }

        return result.data;
    }

    window.reportService = {
        getDashboardReport
    };
})();