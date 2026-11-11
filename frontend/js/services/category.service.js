
/*
 * SmartBiz Rwanda Category Service
 * Handles category API requests.
 */

(function () {
    const BASE_PATH = "/businesses";

    function getBusinessPath(businessId) {
        if (!businessId) {
            throw new Error("Business ID is required.");
        }

        return `${BASE_PATH}/${encodeURIComponent(businessId)}/categories`;
    }

    function buildQueryString(filters = {}) {
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

        const queryString = query.toString();
        return queryString ? `?${queryString}` : "";
    }

    function request(endpoint, options = {}) {
        if (
            !window.authService ||
            typeof window.authService.request !== "function"
        ) {
            throw new Error("Authentication service is not available.");
        }

        return window.authService.request(endpoint, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
    }

    window.categoryService = {
        async getCategories(businessId, filters = {}) {
            const endpoint =
                getBusinessPath(businessId) +
                buildQueryString(filters);

            return request(endpoint, { method: "GET" });
        },

        async getCategory(businessId, categoryId) {
            if (!categoryId) {
                throw new Error("Category ID is required.");
            }

            return request(
                `${getBusinessPath(businessId)}/${encodeURIComponent(categoryId)}`,
                { method: "GET" }
            );
        },

        async createCategory(businessId, data) {
            return request(getBusinessPath(businessId), {
                method: "POST",
                body: JSON.stringify(data)
            });
        },

        async updateCategory(businessId, categoryId, data) {
            if (!categoryId) {
                throw new Error("Category ID is required.");
            }

            return request(
                `${getBusinessPath(businessId)}/${encodeURIComponent(categoryId)}`,
                {
                    method: "PUT",
                    body: JSON.stringify(data)
                }
            );
        },

        async updateStatus(businessId, categoryId, status) {
            if (!categoryId) {
                throw new Error("Category ID is required.");
            }

            if (!["active", "inactive"].includes(status)) {
                throw new Error("Invalid category status.");
            }

            return request(
                `${getBusinessPath(businessId)}/${encodeURIComponent(categoryId)}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ status })
                }
            );
        }
    };
})();

