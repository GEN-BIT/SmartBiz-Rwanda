/*
 * SmartBiz Rwanda Category Service
 * Handles category API requests.
 */

window.categoryService = {
    async getCategories(businessId, token) {
        return window.authService.request(
            `/businesses/${encodeURIComponent(businessId)}/categories`,
            {
                method: "GET",
                headers: { Authorization: "Bearer " + token }
            }
        );
    },

    async getCategory(businessId, categoryId, token) {
        return window.authService.request(
            `/businesses/${encodeURIComponent(businessId)}/categories/${encodeURIComponent(categoryId)}`,
            {
                method: "GET",
                headers: { Authorization: "Bearer " + token }
            }
        );
    },

    async createCategory(businessId, data, token) {
        return window.authService.request(
            `/businesses/${encodeURIComponent(businessId)}/categories`,
            {
                method: "POST",
                headers: { Authorization: "Bearer " + token },
                body: JSON.stringify(data)
            }
        );
    },

    async updateCategory(businessId, categoryId, data, token) {
        return window.authService.request(
            `/businesses/${encodeURIComponent(businessId)}/categories/${encodeURIComponent(categoryId)}`,
            {
                method: "PUT",
                headers: { Authorization: "Bearer " + token },
                body: JSON.stringify(data)
            }
        );
    },

    async updateStatus(businessId, categoryId, status, token) {
        return window.authService.request(
            `/businesses/${encodeURIComponent(businessId)}/categories/${encodeURIComponent(categoryId)}/status`,
            {
                method: "PATCH",
                headers: { Authorization: "Bearer " + token },
                body: JSON.stringify({ status })
            }
        );
    }
};