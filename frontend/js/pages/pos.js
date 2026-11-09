/*
 * SmartBiz Rwanda - Point of Sale
 */

document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("smartbiz_token");
    const storedMembership = sessionStorage.getItem("smartbiz_membership");

    if (!token || !storedMembership) {
        window.location.href = "login.html";
        return;
    }

    let membership;

    try {
        membership = JSON.parse(storedMembership);
    } catch {
        sessionStorage.removeItem("smartbiz_membership");
        window.location.href = "login.html";
        return;
    }

    const businessId = membership.business_id;
    const role = membership.role;

    if (
        !businessId ||
        membership.membership_status !== "active" ||
        (membership.business_status &&
            membership.business_status !== "active")
    ) {
        showMessage("Your business membership is not active.", false);
        return;
    }

    if (!["owner", "manager", "cashier"].includes(role)) {
        showMessage("You do not have permission to process sales.", false);
        return;
    }

    if (typeof window.renderSidebar === "function") {
        window.renderSidebar();
    }

    const elements = {
        message: document.getElementById("posMessage"),
        productSearch: document.getElementById("productSearch"),
        productGrid: document.getElementById("productGrid"),
        productCount: document.getElementById("productCount"),
        cartItems: document.getElementById("cartItems"),
        cartItemCount: document.getElementById("cartItemCount"),
        clearCartBtn: document.getElementById("clearCartBtn"),
        customerSelect: document.getElementById("customerSelect"),
        discountInput: document.getElementById("discountInput"),
        taxInput: document.getElementById("taxInput"),
        subtotalValue: document.getElementById("subtotalValue"),
        discountValue: document.getElementById("discountValue"),
        taxValue: document.getElementById("taxValue"),
        totalValue: document.getElementById("totalValue"),
        paymentMethod: document.getElementById("paymentMethod"),
        amountPaid: document.getElementById("amountPaid"),
        amountPaidField: document.getElementById("amountPaidField"),
        paymentHint: document.getElementById("paymentHint"),
        checkoutBtn: document.getElementById("checkoutBtn")
    };

    let products = [];
    let cart = [];
    let isSubmitting = false;

    const currencyFormatter = new Intl.NumberFormat("en-RW", {
        maximumFractionDigits: 0
    });

    function formatMoney(amount) {
        return `RWF ${currencyFormatter.format(amount)}`;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function showMessage(message, success = false) {
        elements.message.textContent = message;
        elements.message.classList.toggle("success", success);
        elements.message.hidden = false;
    }

    function clearMessage() {
        elements.message.textContent = "";
        elements.message.hidden = true;
        elements.message.classList.remove("success");
    }

    function getProductStock(product) {
        return Math.max(0, Number(product.stock_quantity) || 0);
    }

    function getCartQuantity(productId) {
        const item = cart.find(
            cartItem => Number(cartItem.product_id) === Number(productId)
        );

        return item ? item.quantity : 0;
    }

    function calculateTotals() {
        const subtotalCents = cart.reduce((total, item) => {
            const priceCents = Math.round(Number(item.selling_price) * 100);
            const quantityMilli = Math.round(item.quantity * 1000);

            return total + Math.round(
                (priceCents * quantityMilli) / 1000
            );
        }, 0);

        const discount = Math.round(
            (Number(elements.discountInput.value) || 0) * 100
        );

        const tax = Math.round(
            (Number(elements.taxInput.value) || 0) * 100
        );

        const totalCents = subtotalCents - discount + tax;

        return {
            subtotalCents,
            discountCents: discount,
            taxCents: tax,
            totalCents,
            subtotal: subtotalCents / 100,
            discount: discount / 100,
            tax: tax / 100,
            total: totalCents / 100
        };
    }

    function renderProducts() {
        elements.productCount.textContent =
            `${products.length} product${products.length === 1 ? "" : "s"}`;

        if (!products.length) {
            elements.productGrid.innerHTML =
                '<div class="pos-empty">No products found.</div>';
            return;
        }

        elements.productGrid.innerHTML = products.map(product => {
            const stock = getProductStock(product);
            const alreadyInCart = getCartQuantity(product.product_id);
            const available = stock - alreadyInCart;
            const isOut = available <= 0;

            let stockClass = "normal";
            let stockLabel = `${stock} ${escapeHTML(product.unit || "units")} available`;

            if (isOut) {
                stockClass = "out";
                stockLabel = "Out of stock";
            } else if (stock <= 5) {
                stockClass = "low";
            }

            return `
                <button
                    type="button"
                    class="pos-product-card"
                    data-product-id="${Number(product.product_id)}"
                    ${isOut ? "disabled" : ""}
                >
                    <span class="pos-product-name">
                        ${escapeHTML(product.product_name)}
                    </span>

                    <span class="pos-product-meta">
                        SKU: ${escapeHTML(product.sku || "Not set")}
                    </span>

                    <span class="pos-product-bottom">
                        <span class="pos-product-price">
                            ${formatMoney(Number(product.selling_price))}
                        </span>

                        <span class="pos-stock ${stockClass}">
                            ${stockLabel}
                        </span>
                    </span>
                </button>
            `;
        }).join("");
    }

    function renderCart() {
        const itemCount = cart.reduce(
            (total, item) => total + item.quantity,
            0
        );

        elements.cartItemCount.textContent =
            `${itemCount} item${itemCount === 1 ? "" : "s"}`;

        if (!cart.length) {
            elements.cartItems.innerHTML =
                '<div class="pos-empty">Your cart is empty.</div>';
        } else {
            elements.cartItems.innerHTML = cart.map(item => {
                const lineTotal = item.quantity * Number(item.selling_price);

                return `
                    <div class="pos-cart-item">
                        <div class="pos-cart-product">
                            <strong>${escapeHTML(item.product_name)}</strong>
                            <small>${formatMoney(Number(item.selling_price))} each</small>

                            <div class="pos-cart-controls">
                                <button
                                    type="button"
                                    class="pos-quantity-button"
                                    data-action="decrease"
                                    data-product-id="${item.product_id}"
                                    aria-label="Decrease quantity"
                                >−</button>

                                <input
                                    class="pos-quantity-input"
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    max="${getProductStock(item)}"
                                    value="${item.quantity}"
                                    data-quantity-id="${item.product_id}"
                                    aria-label="Quantity"
                                >

                                <button
                                    type="button"
                                    class="pos-quantity-button"
                                    data-action="increase"
                                    data-product-id="${item.product_id}"
                                    aria-label="Increase quantity"
                                >+</button>

                                <button
                                    type="button"
                                    class="pos-remove-button"
                                    data-action="remove"
                                    data-product-id="${item.product_id}"
                                >Remove</button>
                            </div>
                        </div>

                        <span class="pos-cart-line-total">
                            ${formatMoney(lineTotal)}
                        </span>
                    </div>
                `;
            }).join("");
        }

        updateTotals();
        renderProducts();
    }

    function updateTotals() {
        const totals = calculateTotals();

        elements.subtotalValue.textContent = formatMoney(totals.subtotal);
        elements.discountValue.textContent = formatMoney(totals.discount);
        elements.taxValue.textContent = formatMoney(totals.tax);
        elements.totalValue.textContent = formatMoney(totals.total);

        if (elements.paymentMethod.value === "credit") {
            elements.amountPaid.value = "0";
            elements.amountPaidField.hidden = true;
            elements.paymentHint.textContent =
                "This sale will be recorded as unpaid. Select a customer.";
        } else {
            elements.amountPaidField.hidden = false;
            elements.paymentHint.textContent =
                "Enter the amount received. A remaining balance requires a customer.";
        }
    }

    function addProduct(productId) {
        clearMessage();

        const product = products.find(
            item => Number(item.product_id) === Number(productId)
        );

        if (!product) return;

        const existing = cart.find(
            item => Number(item.product_id) === Number(productId)
        );

        const nextQuantity = existing ? existing.quantity + 1 : 1;

        if (nextQuantity > getProductStock(product)) {
            showMessage(`Not enough stock for ${product.product_name}.`);
            return;
        }

        if (existing) {
            existing.quantity = nextQuantity;
        } else {
            cart.push({
                product_id: Number(product.product_id),
                product_name: product.product_name,
                selling_price: Number(product.selling_price),
                stock_quantity: getProductStock(product),
                unit: product.unit,
                quantity: 1
            });
        }

        renderCart();
    }

    function updateQuantity(productId, quantity) {
        const item = cart.find(
            cartItem => Number(cartItem.product_id) === Number(productId)
        );

        if (!item) return;

        if (!Number.isFinite(quantity) || quantity <= 0) {
            cart = cart.filter(
                cartItem => Number(cartItem.product_id) !== Number(productId)
            );
            renderCart();
            return;
        }

        if (quantity > item.stock_quantity) {
            showMessage(`Only ${item.stock_quantity} units are available.`);
            renderCart();
            return;
        }

        if (Math.round(quantity * 1000) !== quantity * 1000) {
            showMessage("Quantity can have up to 3 decimal places.");
            renderCart();
            return;
        }

        item.quantity = quantity;
        renderCart();
    }

    async function loadProducts(search = "") {
        elements.productGrid.innerHTML =
            '<div class="pos-empty">Loading products...</div>';

        try {
            const response = await window.salesService.getPosProducts(
                businessId,
                search
            );

            products = Array.isArray(response.data) ? response.data : [];
            renderProducts();
        } catch (error) {
            elements.productGrid.innerHTML =
                '<div class="pos-empty">Unable to load products.</div>';
            showMessage(error.message);
        }
    }

    async function loadCustomers() {
        try {
            const response = await window.salesService.getCustomers(businessId);
            const customers = Array.isArray(response.data)
                ? response.data
                : [];

            elements.customerSelect.innerHTML =
                '<option value="">Walk-in customer</option>';

            customers.forEach(customer => {
                const option = document.createElement("option");
                option.value = customer.customer_id;
                option.textContent = customer.customer_name;
                elements.customerSelect.appendChild(option);
            });
        } catch (error) {
            // Customer loading should not prevent ordinary cash sales.
            console.warn("Customer list could not be loaded:", error.message);
        }
    }

    async function completeSale() {
        clearMessage();

        if (isSubmitting) return;

        if (!cart.length) {
            showMessage("Add products to the cart before checkout.");
            return;
        }

        const totals = calculateTotals();
        const customerId = elements.customerSelect.value;
        const paymentMethod = elements.paymentMethod.value;

        if (
            !Number.isSafeInteger(totals.discountCents) ||
            !Number.isSafeInteger(totals.taxCents) ||
            totals.discountCents < 0 ||
            totals.taxCents < 0
        ) {
            showMessage("Enter valid discount and tax amounts.");
            return;
        }

        if (totals.discountCents > totals.subtotalCents) {
            showMessage("Discount cannot exceed the subtotal.");
            return;
        }

        if (totals.totalCents <= 0) {
            showMessage("The sale total must be greater than zero.");
            return;
        }

        const amountPaid = paymentMethod === "credit"
            ? 0
            : Number(elements.amountPaid.value);

        if (
            !Number.isFinite(amountPaid) ||
            amountPaid < 0 ||
            Math.round(amountPaid * 100) !== amountPaid * 100
        ) {
            showMessage("Enter a valid payment amount with up to 2 decimal places.");
            return;
        }

        if (amountPaid * 100 > totals.totalCents) {
            showMessage("Amount received cannot exceed the sale total.");
            return;
        }

        if (amountPaid * 100 < totals.totalCents && !customerId) {
            showMessage("Select a customer for an unpaid or partially paid sale.");
            return;
        }

        if (paymentMethod === "credit" && !customerId) {
            showMessage("Select a customer for a credit sale.");
            return;
        }

        const saleData = {
            customer_id: customerId || null,
            discount_amount: totals.discount.toFixed(2),
            tax_amount: totals.tax.toFixed(2),
            payment_method: paymentMethod,
            amount_paid: amountPaid.toFixed(2),
            items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity.toFixed(3)
            }))
        };

        isSubmitting = true;
        elements.checkoutBtn.disabled = true;
        elements.checkoutBtn.textContent = "Processing...";

        try {
            const response = await window.salesService.createSale(
                businessId,
                saleData
            );

            const sale = response.data;

            cart = [];
            elements.discountInput.value = "0";
            elements.taxInput.value = "0";
            elements.amountPaid.value = "0";
            elements.customerSelect.value = "";
            elements.paymentMethod.value = "cash";

            renderCart();
            await loadProducts(elements.productSearch.value);

            showMessage(
                `Sale completed. Invoice: ${sale.invoice_number}`,
                true
            );

            elements.amountPaid.value = sale.total_amount;
        } catch (error) {
            showMessage(error.message);
        } finally {
            isSubmitting = false;
            elements.checkoutBtn.disabled = false;
            elements.checkoutBtn.textContent = "Complete sale";
        }
    }

    // Product selection.
    elements.productGrid.addEventListener("click", function (event) {
        const button = event.target.closest("[data-product-id]");

        if (button && !button.disabled) {
            addProduct(Number(button.dataset.productId));
        }
    });

    // Cart quantity buttons and remove action.
    elements.cartItems.addEventListener("click", function (event) {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const productId = Number(button.dataset.productId);
        const item = cart.find(
            cartItem => Number(cartItem.product_id) === productId
        );

        if (!item) return;

        if (button.dataset.action === "increase") {
            updateQuantity(productId, item.quantity + 1);
        }

        if (button.dataset.action === "decrease") {
            updateQuantity(productId, item.quantity - 1);
        }

        if (button.dataset.action === "remove") {
            cart = cart.filter(
                cartItem => Number(cartItem.product_id) !== productId
            );
            renderCart();
        }
    });

    // Manual quantity changes.
    elements.cartItems.addEventListener("change", function (event) {
        if (!event.target.matches("[data-quantity-id]")) return;

        updateQuantity(
            Number(event.target.dataset.quantityId),
            Number(event.target.value)
        );
    });

    // Search products when the user submits the search field.
    elements.productSearch.addEventListener("search", function () {
        loadProducts(elements.productSearch.value.trim());
    });

    elements.productSearch.addEventListener("change", function () {
        loadProducts(elements.productSearch.value.trim());
    });

    elements.productSearch.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            loadProducts(elements.productSearch.value.trim());
        }
    });

    elements.discountInput.addEventListener("input", updateTotals);
    elements.taxInput.addEventListener("input", updateTotals);
    elements.paymentMethod.addEventListener("change", updateTotals);

    elements.amountPaid.addEventListener("input", function () {
        clearMessage();
    });

    elements.clearCartBtn.addEventListener("click", function () {
        cart = [];
        renderCart();
        clearMessage();
    });

    elements.checkoutBtn.addEventListener("click", completeSale);

    renderCart();
    updateTotals();

    await Promise.all([
        loadProducts(),
        loadCustomers()
    ]);
});