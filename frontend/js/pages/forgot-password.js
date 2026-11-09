// Get the recovery form
const forgotPasswordForm = document.getElementById(
    "forgotPasswordForm"
);

// Get the message area
const formMessage = document.getElementById("formMessage");


// Display an error
function showError(fieldId, message) {

    const errorElement = document.getElementById(
        fieldId + "Error"
    );

    errorElement.textContent = message;

    errorElement.classList.add("show");

}


// Clear an error
function clearError(fieldId) {

    const errorElement = document.getElementById(
        fieldId + "Error"
    );

    errorElement.textContent = "";

    errorElement.classList.remove("show");

}


// Display a general message
function showMessage(message, type) {

    formMessage.textContent = message;

    formMessage.className = "form-message show " + type;

}


// Handle form submission
forgotPasswordForm.addEventListener("submit", function (event) {

    event.preventDefault();

    // Get email
    const email = document.getElementById("email").value.trim();

    // Clear previous errors
    clearError("email");

    formMessage.textContent = "";

    formMessage.className = "form-message";

    let hasError = false;


    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email === "") {

        showError("email", "Please enter your email address.");

        hasError = true;

    } else if (!emailPattern.test(email)) {

        showError("email", "Please enter a valid email address.");

        hasError = true;

    }


    // Stop if invalid
    if (hasError) {

        showMessage(
            "Please enter a valid email address.",
            "error"
        );

        return;

    }


    // Frontend validation only
    showMessage(
        "Your email address is valid. Password recovery will be available once the recovery API is connected.",
        "success"
    );

});