
const registerForm = document.getElementById("registerForm");
const formMessage = document.getElementById("formMessage");
const registerButton = document.getElementById("registerButton");


// Show a field error
function showError(fieldId, message) {

    const element = document.getElementById(fieldId + "Error");

    if (element) {
        element.textContent = message;
        element.classList.add("show");
    }

}


// Clear a field error
function clearError(fieldId) {

    const element = document.getElementById(fieldId + "Error");

    if (element) {
        element.textContent = "";
        element.classList.remove("show");
    }

}


// Display a general message
function showMessage(message, type) {

    formMessage.textContent = message;
    formMessage.className = "form-message show " + type;

}


// Password visibility
document.querySelectorAll(".password-toggle").forEach(button => {

    button.addEventListener("click", function () {

        const input = document.getElementById(
            button.getAttribute("data-target")
        );

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
        } else {
            input.type = "password";
            button.textContent = "Show";
        }

    });

});


// Registration submission
registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const businessName =
        document.getElementById("businessName").value.trim();

    const businessType =
        document.getElementById("businessType").value;

    const fullName =
        document.getElementById("ownerName").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const terms =
        document.getElementById("terms").checked;


    const fields = [
        "businessName",
        "businessType",
        "ownerName",
        "email",
        "phone",
        "password",
        "confirmPassword",
        "terms"
    ];

    fields.forEach(clearError);

    formMessage.className = "form-message";

    let hasError = false;


    if (!businessName) {
        showError("businessName", "Enter your business name.");
        hasError = true;
    }

    if (!businessType) {
        showError("businessType", "Select your business type.");
        hasError = true;
    }

    if (!fullName) {
        showError("ownerName", "Enter your full name.");
        hasError = true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showError("email", "Enter a valid email address.");
        hasError = true;
    }

    if (!phone) {
        showError("phone", "Enter your phone number.");
        hasError = true;
    }

    if (password.length < 12) {
        showError(
            "password",
            "Your password must contain at least 12 characters."
        );
        hasError = true;
    }

    if (confirmPassword !== password || !confirmPassword) {
        showError(
            "confirmPassword",
            "Your passwords must match."
        );
        hasError = true;
    }

    if (!terms) {
        showError(
            "terms",
            "Please accept the terms to continue."
        );
        hasError = true;
    }

    if (hasError) {
        showMessage(
            "Please correct the highlighted fields.",
            "error"
        );
        return;
    }


    // Prevent repeated submissions
    registerButton.disabled = true;
    registerButton.textContent = "Creating account...";


    try {

        // These names match the backend registration service.
        const registrationData = {
            fullName: fullName,
            email: email,
            phone: phone,
            businessName: businessName,
            businessType: businessType,
            password: password
        };

        const result = await authService.register(registrationData);

        showMessage(
            result.message ||
            "Registration successful. Your business is awaiting approval.",
            "success"
        );

        // Clear password fields after successful registration
        document.getElementById("password").value = "";
        document.getElementById("confirmPassword").value = "";

        registerButton.textContent = "Registration successful";

    } catch (error) {

        showMessage(error.message, "error");

        registerButton.disabled = false;
        registerButton.textContent = "Create business account";

    }

});
