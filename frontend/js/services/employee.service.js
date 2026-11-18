
/*
 * SmartBiz Rwanda - Employee API service
 */

(function () {
    const API_BASE_URL = window.SMARTBIZ_CONFIG.API_BASE_URL;

    async function request(endpoint, options = {}) {
        const token = sessionStorage.getItem("smartbiz_token");

        if (!token) {
            throw new Error("Your session has expired. Please sign in again.");
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok) {
            throw new Error(
                result.message || "The employee request could not be completed."
            );
        }

        return result;
    }

    function getEmployees(businessId, filters = {}) {
        const params = new URLSearchParams();

        params.set("page", filters.page || 1);
        params.set("limit", filters.limit || 10);

        if (filters.search) params.set("search", filters.search);
        if (filters.role) params.set("role", filters.role);
        if (filters.status) params.set("status", filters.status);

        return request(
            `/businesses/${encodeURIComponent(businessId)}/employees?${params.toString()}`
        );
    }

    function createEmployee(businessId, employeeData) {
        return request(
            `/businesses/${encodeURIComponent(businessId)}/employees`,
            {
                method: "POST",
                body: JSON.stringify(employeeData)
            }
        );
    }

    function updateEmployee(businessId, employeeId, updates) {
        return request(
            `/businesses/${encodeURIComponent(businessId)}/employees/${encodeURIComponent(employeeId)}`,
            {
                method: "PATCH",
                body: JSON.stringify(updates)
            }
        );
    }

    window.employeeService = {
        getEmployees,
        createEmployee,
        updateEmployee
    };
})();
