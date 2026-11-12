
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

    function formatLabel(value) {
        if (!value) return "Not available";

        return String(value)
            .replace(/_/g, " ")
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value || "Not available";
        }
    }

    function initializeProfile() {
        const membership = getMembership();

        if (!membership) {
            setText("profileDisplayName", "No active membership");
            setText("profileRole", "Please sign in to view your account");
            setText("accountIdentity", "No authenticated session");
            setText("userName", "Guest");

            const notice = document.getElementById("profileNotice");

            if (notice) {
                notice.textContent =
                    "No active business membership was found in this browser session.";
            }

            return;
        }

        const role = formatLabel(membership.role);
        const membershipStatus = formatLabel(
            membership.membership_status
        );
        const businessStatus = formatLabel(
            membership.business_status
        );

        setText("profileDisplayName", "SmartBiz Account");
        setText("profileRole", role);
        setText("userName", role);

        setText("profileAvatar", role.charAt(0).toUpperCase());

        setText("membershipStatus", membershipStatus);
        setText("businessStatus", businessStatus);

        setText("accountIdentity", "Authenticated business account");
        setText("accountRole", role);
        setText("accountBusinessId", membership.business_id || "Not available");

        setText("membershipRole", role);
        setText("membershipStatusDetail", membershipStatus);
        setText("businessStatusDetail", businessStatus);

        if (typeof window.renderSidebar === "function") {
            window.renderSidebar(membership);
        }
    }

    initializeProfile();
});
