
/*
 * SmartBiz Rwanda sidebar component
 * Role-based navigation with active page highlighting.
 */

window.renderSidebar = function (membership) {
    const mount = document.getElementById("sidebarMount");

    if (!mount || !membership) return;

    const businessName = membership.business_name || "My Business";
    const role = String(membership.role || "owner").toLowerCase();
    const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";

    const menuItemsByRole = {
        owner: [
            ["⌂", "Dashboard", "dashboard.html"],
            ["↗", "Sales", "sales.html"],
            ["▣", "Products", "products.html"],
            ["▦", "Categories", "categories.html"],
            ["▤", "Inventory", "inventory.html"],
            ["♙", "Customers", "customers.html"],
            ["♧", "Suppliers", "suppliers.html"],
            ["▧", "Purchases", "purchases.html"],
            ["＋", "Expenses", "expenses.html"],
            ["▥", "Reports", "reports.html"],
            ["♟", "Employees", "employees.html"],
            ["⚙", "Settings", "settings.html"]
        ],

        manager: [
            ["⌂", "Dashboard", "dashboard.html"],
            ["↗", "Sales", "sales.html"],
            ["▣", "Products", "products.html"],
            ["▤", "Inventory", "inventory.html"],
            ["♙", "Customers", "customers.html"],
            ["♧", "Suppliers", "suppliers.html"],
            ["▧", "Purchases", "purchases.html"],
            ["＋", "Expenses", "expenses.html"],
            ["▥", "Reports", "reports.html"]
        ],

        cashier: [
            ["⌂", "Dashboard", "dashboard.html"],
            ["▣", "Point of Sale", "pos.html"],
            ["↗", "Sales", "sales.html"],
            ["♙", "Customers", "customers.html"],
            ["▤", "Cash Register", "cash-register.html"]
        ],

        stock_manager: [
            ["⌂", "Dashboard", "dashboard.html"],
            ["▣", "Products", "products.html"],
            ["▦", "Categories", "categories.html"],
            ["▤", "Inventory", "inventory.html"],
            ["♧", "Suppliers", "suppliers.html"],
            ["▧", "Purchases", "purchases.html"]
        ]
    };

    const menuItems = menuItemsByRole[role] || menuItemsByRole.owner;

    const escapeHTML = function (value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character];
        });
    };

    const menuHTML = menuItems.map(function (item) {
        const isActive = item[2] === currentPage;

        return `
            <a href="${item[2]}"
               class="sidebar-link ${isActive ? "active" : ""}"
               ${isActive ? 'aria-current="page"' : ""}>
                <span class="sidebar-link-icon">${item[0]}</span>
                <span>${item[1]}</span>
            </a>
        `;
    }).join("");

    mount.innerHTML = `
        <aside class="sidebar" id="mainSidebar">
            <div class="sidebar-brand">
                <div class="brand-logo">S</div>
                <div class="brand-name">
                    SmartBiz <span>Rwanda</span>
                </div>
            </div>

            <div class="sidebar-business">
                ${escapeHTML(businessName)}
            </div>

            <div class="sidebar-section-label">WORKSPACE</div>

            <nav class="sidebar-nav">
                ${menuHTML}
            </nav>

            <div class="sidebar-footer">
                <a href="profile.html"
                   class="sidebar-link ${currentPage === "profile.html" ? "active" : ""}">
                    <span class="sidebar-link-icon">♙</span>
                    <span>My Profile</span>
                </a>

                <button class="logout-button" id="logoutButton">
                    ↪ &nbsp; Sign out
                </button>
            </div>
        </aside>
    `;

    const sidebar = document.getElementById("mainSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("visible");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
    }

    function openSidebar() {
        if (sidebar) sidebar.classList.add("open");
        if (overlay) overlay.classList.add("visible");
        if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", function () {
            if (sidebar && sidebar.classList.contains("open")) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    document.querySelectorAll(".sidebar-link").forEach(function (link) {
        link.addEventListener("click", closeSidebar);
    });

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            window.authService.clearSession();
            window.location.replace("login.html");
        });
    }

    const mobileMoreButton = document.getElementById("mobileMoreButton");

    if (mobileMoreButton) {
        mobileMoreButton.addEventListener("click", openSidebar);
    }
};
