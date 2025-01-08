document.getElementById("login-form").addEventListener("submit", function(event){
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const usernameErrorDiv = document.getElementById("username-error");
    const passwordErrorDiv = document.getElementById("password-error");

    usernameErrorDiv.textContent = "";
    passwordErrorDiv.textContent = "";

    fetch("/api/login/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify({username, password}),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw data; });
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            if (data.error === "Username does not exist") {
                usernameErrorDiv.textContent = "Nome utente non esiste.";
            } else if (data.error === "Incorrect password") {
                passwordErrorDiv.textContent = "Password non corretta.";
            } else if (data.error === "Username and password are required") {
                passwordErrorDiv.textContent = "Username e password sono obbligatori.";
            } else {
                passwordErrorDiv.textContent = "Errore: " + data.error;
            }
        } else {
            localStorage.setItem("accessToken", data.access);
            localStorage.setItem("refreshToken", data.refresh);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', data.username);
            loadPage("api/dashboard/");
        }
    })
    .catch(error => {
        if (error.error) {
            if (error.error === "Username does not exist") {
                usernameErrorDiv.textContent = "Nome utente non esiste.";
            } else if (error.error === "Incorrect password") {
                passwordErrorDiv.textContent = "Password non corretta.";
            } else if (error.error === "Username and password are required") {
                passwordErrorDiv.textContent = "Username e password sono obbligatori.";
            } else {
                passwordErrorDiv.textContent = "Errore: " + error.error;
            }
        } else {
            console.error('Errore durante il recupero della pagina:', error);
        }
    });
});

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/home/");
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
