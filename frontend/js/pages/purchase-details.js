/*
 * SmartBiz Rwanda - Purchase Details Page
 */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    let membership;
    let businessId;
    let purchaseId;
    let currentPurchase;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#039;"
        })[char]);
    }

    function money(value) {
        return `RWF ${Number(value || 0).toLocaleString("en-RW", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })}`;
    }

    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function showMessage(message, type = "error") {
        $("purchaseDetailsMessage").textContent = message;
        $("purchaseDetailsMessage").className = `purchase-message ${type}`;
        $("purchaseDetailsMessage").hidden = false;
    }

    function setUserDetails() {
        const name = membership.user_name ||
            membership.full_name ||
            membership.name ||
            membership.email ||
            "User";

        $("currentUserName").textContent = name;
        $("currentUserRole").textContent = membership.role || "Team member";
        $("currentUserAvatar").textContent = name.charAt(0).toUpperCase();
    }

    function renderItems(items) {
        if (!Array.isArray(items) || !items.length) {
            $("purchaseDetailItems").innerHTML =
                '<tr><td colspan="5" class="table-empty">No purchase items found.</td></tr>';
            return;
        }

        $("purchaseDetailItems").innerHTML = items.map((item) => `
            <tr>
                <td><strong>${escapeHTML(item.product_name)}</strong></td>
                <td>${escapeHTML(item.sku || "—")}</td>
                <td>${Number(item.quantity || 0).toLocaleString("en-RW", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3
                })} ${escapeHTML(item.unit || "")}</td>
                <td>${money(item.unit_cost)}</td>
                <td>${money(item.subtotal)}</td>
            </tr>
        `).join("");
    }

    function renderPurchase(purchase, items) {
        currentPurchase = purchase;

        $("purchaseNumberHeading").textContent =
            purchase.purchase_number || `Purchase #${purchase.purchase_id}`;

        $("purchaseCreatedDate").textContent =
            `Created ${formatDate(purchase.created_at)}`;

        $("purchaseStatusBadge").textContent = purchase.purchase_status;
        $("purchaseStatusBadge").className =
            `purchase-status ${purchase.purchase_status}`;

        $("detailSupplierName").textContent = purchase.supplier_name || "—";
        $("detailSupplierContact").textContent =
            purchase.contact_person || "Contact person not provided";
        $("detailSupplierPhone").textContent =
            purchase.supplier_phone || "Phone not provided";
        $("detailSupplierEmail").textContent =
            purchase.supplier_email || "Email not provided";

        $("detailPurchaseNumber").textContent = purchase.purchase_number || "—";
        $("detailPurchaseDate").textContent = formatDate(purchase.created_at);
        $("detailPurchaseStatus").textContent = purchase.purchase_status || "—";
        $("detailPaymentStatus").textContent = purchase.payment_status || "—";

        $("detailSubtotal").textContent = money(purchase.subtotal);
        $("detailTax").textContent = money(purchase.tax_amount);
        $("detailTotal").textContent = money(purchase.total_amount);
        $("detailAmountPaid").textContent = money(purchase.amount_paid);
        $("detailBalance").textContent = money(purchase.balance_due);

        if (purchase.notes) {
            $("purchaseNotesCard").hidden = false;
            $("detailPurchaseNotes").textContent = purchase.notes;
        }

        renderItems(items);

        const canReceive = ["owner", "manager", "stock_manager"].includes(membership.role);
        $("receivePurchaseBtn").hidden =
            purchase.purchase_status !== "pending" || !canReceive;
    }

    async function loadPurchase() {
        try {
            const result = await window.purchaseService.getPurchase(
                businessId,
                purchaseId
            );

            if (!result.data?.purchase) {
                throw new Error("Purchase details were not returned by the server.");
            }

            renderPurchase(result.data.purchase, result.data.items || []);
        } catch (error) {
            console.error(error);
            $("purchaseNumberHeading").textContent = "Unable to load purchase";
            $("purchaseDetailItems").innerHTML =
                `<tr><td colspan="5" class="table-empty">${escapeHTML(error.message)}</td></tr>`;
            showMessage(error.message || "Unable to load purchase details.");
        }
    }

    async function receivePurchase() {
        if (!currentPurchase || currentPurchase.purchase_status !== "pending") {
            return;
        }

        const confirmed = window.confirm(
            "Confirm that the goods for this purchase have arrived. Receiving will increase inventory and record stock movements."
        );

        if (!confirmed) return;

        const button = $("receivePurchaseBtn");
        button.disabled = true;
        button.textContent = "Receiving...";

        try {
            await window.purchaseService.receivePurchase(businessId, purchaseId);
            await loadPurchase();
            showMessage(
                "Purchase received successfully. Inventory and stock movements have been updated.",
                "success"
            );
        } catch (error) {
            showMessage(error.message || "Unable to receive this purchase.");
        } finally {
            button.disabled = false;
            button.textContent = "Receive purchase";
        }
    }

    function initialiseSidebar() {
        if (typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }

        $("mobileMenuBtn")?.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-open");
        });

        $("sidebarOverlay")?.addEventListener("click", () => {
            document.body.classList.remove("sidebar-open");
        });
    }

    function initialise() {
        const token = sessionStorage.getItem("smartbiz_token");

        try {
            membership = JSON.parse(
                sessionStorage.getItem("smartbiz_membership") || "null"
            );
        } catch (error) {
            membership = null;
        }

        if (!token || !membership ||
            membership.membership_status !== "active" ||
            (membership.business_status && membership.business_status !== "active")) {
            window.location.href = "login.html";
            return;
        }

        businessId = membership.business_id;
        purchaseId = new URLSearchParams(window.location.search).get("purchaseId");

        if (!businessId || !purchaseId) {
            window.location.href = "purchases.html";
            return;
        }

        setUserDetails();
        initialiseSidebar();

        $("receivePurchaseBtn").addEventListener("click", receivePurchase);
        loadPurchase();
    }

    document.addEventListener("DOMContentLoaded", initialise);
})();
