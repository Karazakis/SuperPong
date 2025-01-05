document.getElementById("signup-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const usernameErrorDiv = document.getElementById("username-error");
    const emailErrorDiv = document.getElementById("email-error");
    const passwordErrorDiv = document.getElementById("password-error");

    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    function isValidUsername(username) {
        username = username.replace(/[<>]/g, '');
    
        if (/\s/.test(username)) {
            return "Username cannot contain spaces.";
        }
        if (username.length < 3) {
            return "Username must be at least 3 characters long.";
        }
        if (username.length > 20) {
			return "Username cannot be over 20 characters long.";
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return "Username can contain only letters, numbers and underscore.";
        }
        return "";
    }
    

    function isValidEmail(email) {
        email = email.replace(/[<>]/g, '');
    
        if (email.length > 40) {
            return "Email address cannot be over 40 characters long.";
        }
        if (!/^(?!.*\.\.)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            return "Insert a valid email address.";
        }
        return "";
    }
    
    

    function isValidPassword(password) {
        if (password.length < 8) {
            return "Password must have at least 8 characters";
        }
        if (!/[A-Z]/.test(password)) {
            return "Password must have at least one uppercase character.";
        }
        if (!/[a-z]/.test(password)) {
            return "Password must have at least one lowercase character.";
        }
        if (!/\W/.test(password)) {
            return "Password must have at least one special character.";
        }
        return "";
    }
    

    usernameErrorDiv.textContent = "";
    emailErrorDiv.textContent = "";
    passwordErrorDiv.textContent = "";

    let isFormValid = true;

    const usernameError = isValidUsername(username);
    if (usernameError) {
        usernameErrorDiv.textContent = usernameError;
        usernameInput.classList.add("invalid");
        isFormValid = false;
    } else {
        usernameInput.classList.add("valid");
    }

    const emailError = isValidEmail(email);
    if (emailError) {
        emailErrorDiv.textContent = emailError;
        emailInput.classList.add("invalid");
        isFormValid = false;
    } else {
        emailInput.classList.add("valid");
    }

    const passwordError = isValidPassword(password);
    if (passwordError) {
        passwordErrorDiv.textContent = passwordError;
        passwordInput.classList.add("invalid");
        isFormValid = false;
    } else {
        passwordInput.classList.add("valid");
    }

    if (!isFormValid) {
        return;
    }

    
    fetch("/api/signup/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.errors) {
            for (let field in data.errors) {
                if (data.errors.hasOwnProperty(field)) {
                    let errorMessage = data.errors[field].messages.join(' ');
                    if (field === 'username') {
                        usernameErrorDiv.textContent = errorMessage;
                        usernameInput.classList.remove("valid");
                    } else if (field === 'email') {
                        emailErrorDiv.textContent = errorMessage;
                        emailInput.classList.remove("valid");
                    } else if (field === 'password') {
                        passwordErrorDiv.textContent = errorMessage;
                        passwordInput.classList.remove("valid");
                    }
                }
            }
        } else {
            loadPage("api/login/");
        }
    })
    .catch(error => console.error('Errore durante il recupero della pagina:', error));
});

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/home/");
    });
}
