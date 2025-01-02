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
        return username.length >= 3;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidPassword(password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
        return passwordRegex.test(password);
    }

    usernameErrorDiv.textContent = "";
    emailErrorDiv.textContent = "";
    passwordErrorDiv.textContent = "";

    let isFormValid = true;

    if (!isValidUsername(username)) {
        usernameErrorDiv.textContent = "Il nome utente deve avere almeno 3 caratteri.";
        usernameInput.classList.remove("valid");
        isFormValid = false;
    } else {
        usernameInput.classList.add("valid");
    }

    if (!isValidEmail(email)) {
        emailErrorDiv.textContent = "Inserisci un'email valida.";
        emailInput.classList.remove("valid");
        isFormValid = false;
    } else {
        emailInput.classList.add("valid");
    }

    if (!isValidPassword(password)) {
        passwordErrorDiv.textContent = "La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un carattere speciale.";
        passwordInput.classList.remove("valid");
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
            // Esegui altre azioni, ad esempio reindirizzare l'utente
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
