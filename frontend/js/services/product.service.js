
(function () {
    const BASE_PATH = "/businesses";

    function getBusinessPath(businessId) {
        if (!businessId) {
            throw new Error("Business ID is required.");
        }

        return `${BASE_PATH}/${encodeURIComponent(businessId)}/products`;
    }

    async function request(endpoint, options = {}) {
        if (!window.authService ||
            typeof window.authService.request !== "function") {
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

    function buildQueryString(filters = {}) {
        const query = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                query.set(key, value);
            }
        });

        const queryString = query.toString();
        return queryString ? `?${queryString}` : "";
    }

    window.productService = {
        async getProducts(businessId, filters = {}) {
            const endpoint =
                getBusinessPath(businessId) + buildQueryString(filters);

            return request(endpoint, {
                method: "GET"
            });
        },

        async getProduct(businessId, productId) {
            if (!productId) {
                throw new Error("Product ID is required.");
            }

            const endpoint =
                `${getBusinessPath(businessId)}/${encodeURIComponent(productId)}`;

            return request(endpoint, {
                method: "GET"
            });
        },

        async createProduct(businessId, productData) {
            return request(getBusinessPath(businessId), {
                method: "POST",
                body: JSON.stringify(productData)
            });
        },

        async updateProduct(businessId, productId, productData) {
            if (!productId) {
                throw new Error("Product ID is required.");
            }

            const endpoint =
                `${getBusinessPath(businessId)}/${encodeURIComponent(productId)}`;

            return request(endpoint, {
                method: "PUT",
                body: JSON.stringify(productData)
            });
        },

        async updateProductStatus(businessId, productId, status) {
            if (!productId) {
                throw new Error("Product ID is required.");
            }

            if (!["active", "inactive"].includes(status)) {
                throw new Error("Invalid product status.");
            }

            const endpoint =
                `${getBusinessPath(businessId)}/${encodeURIComponent(productId)}/status`;

            return request(endpoint, {
                method: "PATCH",
                body: JSON.stringify({ status })
            });
        }
    };
})();
