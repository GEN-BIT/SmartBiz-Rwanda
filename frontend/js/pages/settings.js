
document.addEventListener("DOMContentLoaded", function () {
    function getMembership() {
        try {
            return JSON.parse(
                sessionStorage.getItem("smartbiz_membership")
            );
        } catch (error) {
            return null;
        }
    }

    function initializeSidebar() {
        const membership = getMembership();

        if (membership && typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }

        if (!membership) {
            const notice = document.getElementById("settingsNotice");

            if (notice) {
                notice.textContent =
                    "No active business membership was found. Sign in to access business settings.";
            }
        }
    }

    function initializeTabs() {
        const tabButtons = document.querySelectorAll(
            "[data-settings-tab]"
        );

        const panels = document.querySelectorAll(
            "[data-settings-panel]"
        );

        tabButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                const selectedTab = button.dataset.settingsTab;

                tabButtons.forEach(function (item) {
                    item.classList.toggle("active", item === button);
                });

                panels.forEach(function (panel) {
                    panel.classList.toggle(
                        "active",
                        panel.dataset.settingsPanel === selectedTab
                    );
                });
            });
        });
    }

    initializeSidebar();
    initializeTabs();
});
