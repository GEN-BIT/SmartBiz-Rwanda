
const loginForm = document.getElementById("loginForm");
const formMessage = document.getElementById("formMessage");
const loginButton = document.getElementById("loginButton");


// Display field errors
function showError(fieldId, message) {

    const element = document.getElementById(fieldId + "Error");

    element.textContent = message;
    element.classList.add("show");

}


// Clear field errors
function clearError(fieldId) {

    const element = document.getElementById(fieldId + "Error");

    element.textContent = "";
    element.classList.remove("show");

}


// Display general messages
function showMessage(message, type) {

    formMessage.textContent = message;
    formMessage.className = "form-message show " + type;

}


// Password visibility
const passwordToggle = document.getElementById("passwordToggle");

passwordToggle.addEventListener("click", function () {

    const passwordInput = document.getElementById("password");

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        passwordToggle.textContent = "Hide";

    } else {

        passwordInput.type = "password";
        passwordToggle.textContent = "Show";

    }

});


// Login submission
loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    const password = document.getElementById("password").value;

    clearError("email");
    clearError("password");

    formMessage.className = "form-message";

    let hasError = false;


    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        showError("email", "Enter a valid email address.");

        hasError = true;

    }


    // Validate password
    if (!password) {

        showError("password", "Enter your password.");

        hasError = true;

    }


    if (hasError) {

        showMessage(
            "Please correct the highlighted fields.",
            "error"
        );

        return;

    }


    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";


    try {

        const result = await authService.login({
            email: email,
            password: password
        });

        const data = result.data;

        const memberships = data.memberships || [];

        // Find an approved, active business membership.
        const activeMembership = memberships.find(membership =>
            String(membership.business_status).toLowerCase() === "active" &&
            String(membership.membership_status).toLowerCase() === "active"
        );

        // Find a pending business membership if no active one exists.
        const pendingMembership = memberships.find(membership =>
            String(membership.business_status).toLowerCase() === "pending"
        );


        if (!activeMembership) {

            authService.clearSession();

            if (pendingMembership) {

                showMessage(
                    "Your login was successful, but your business is still awaiting approval. You cannot access the dashboard until it is approved.",
                    "error"
                );

            } else {

                showMessage(
                    "Your business is not currently active. Please contact the SmartBiz administrator.",
                    "error"
                );

            }

            loginButton.disabled = false;
            loginButton.textContent = "Sign in to SmartBiz";

            return;

        }


        // Save the authenticated session.
        authService.saveSession(
            data.token,
            activeMembership
        );

        showMessage(
            "Login successful. Opening your business workspace...",
            "success"
        );

        loginButton.textContent = "Login successful";


        // Open the dashboard.
        setTimeout(function () {

            window.location.href = "dashboard.html";

        }, 1000);


    } catch (error) {

        authService.clearSession();

        showMessage(error.message, "error");

        loginButton.disabled = false;
        loginButton.textContent = "Sign in to SmartBiz";

    }

});
