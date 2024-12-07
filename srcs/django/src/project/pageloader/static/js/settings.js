document.querySelectorAll('.key-capture').forEach(function(input) {
    input.addEventListener('keydown', function(event) {
        event.preventDefault(); // Previene l'azione di default dei tasti speciali
        
        // Imposta il valore dell'input con il nome del tasto premuto
        this.value = event.code;
        // Usa event.key o event.code a seconda delle tue necessità
    });
});

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/dashboard_nav/");
    });
}

document.getElementById('game-settings-btn').addEventListener('click', function(event) {
    event.preventDefault();
    
    
    const formData = new FormData();
    formData.append('id', localStorage.getItem('userId'));
    formData.append('right1', document.getElementById('keyInput11').value);
    formData.append('left1', document.getElementById('keyInput12').value);
    formData.append('shoot1', document.getElementById('keyInput13').value);
    formData.append('boost1', document.getElementById('keyInput14').value);
    formData.append('right2', document.getElementById('keyInput21').value);
    formData.append('left2', document.getElementById('keyInput22').value);
    formData.append('shoot2', document.getElementById('keyInput23').value);
    formData.append('boost2', document.getElementById('keyInput24').value);
    formData.append('right3', document.getElementById('keyInput31').value);
    formData.append('left3', document.getElementById('keyInput32').value);
    formData.append('shoot3', document.getElementById('keyInput33').value);
    formData.append('boost3', document.getElementById('keyInput34').value);
    formData.append('right4', document.getElementById('keyInput41').value);
    formData.append('left4', document.getElementById('keyInput42').value);
    formData.append('shoot4', document.getElementById('keyInput43').value);
    formData.append('boost4', document.getElementById('keyInput44').value);
    
    console.log(formData);

    fetch('/api/settings/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadPage("api/settings/");
        } else {
            console.log("Data not succedeed");
            alert(data.message);
        }
    })
    .catch(error => console.error('Errore durante la creazione del gioco:', error));
});

document.getElementById('profile-settings-btn').addEventListener('click', function(event) {
    event.preventDefault(); // Previene il comportamento di submit predefinito del form

    // Pulire i messaggi di errore precedenti
    clearErrors();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const nickname = document.getElementById('nickname').value;

    let hasError = false;

    if (!validateUsername(username)) {
        displayError('username-error', "Il nome utente deve essere lungo almeno 3 caratteri.");
        hasError = true;
    }

    if (!validateEmail(email)) {
        displayError('email-error', "Inserisci un indirizzo email valido.");
        hasError = true;
    }

    if (password && !validatePassword(password)) {
        displayError('password-error', "La password deve avere almeno 8 caratteri, con almeno una lettera maiuscola, una lettera minuscola e un carattere speciale.");
        hasError = true;
    }

    if (hasError) {
        return; // Esci dalla funzione se ci sono errori
    }

    const formData = new FormData();
    formData.append('id', localStorage.getItem('userId'));
    formData.append('username', username);
    formData.append('nickname', nickname);
    formData.append('email', email);
    const imgProfileInput = document.getElementById('img_profile');
    if (imgProfileInput.files.length > 0) {
        const imgProfile = imgProfileInput.files[0]; // Prende il primo file selezionato
        formData.append('img_profile', imgProfile); // Aggiunge l'immagine al FormData
    }
    formData.append('password', password);

    fetch('/api/settings/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw new Error(data.error || JSON.stringify(data.errors)); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const event = new CustomEvent('profileUpdated');
            window.dispatchEvent(event);
            loadPage("api/settings/");
        } else {
            handleServerErrors(data.errors);
        }
    })
    .catch(error => handleServerErrors(JSON.parse(error.message)));
});

function validateUsername(username) {
    username = username.replace(/[<>]/g, '');
    return username.length >= 3;
}

function validateEmail(email) {
    email = email.replace(/[<>]/g, '');
    const emailPattern = /^[a-zA-Z0-9._%+]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$/;
    return email.match(emailPattern);
}

function validatePassword(password) {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    return password.match(passwordPattern);
}

function displayError(elementId, message) {
    document.getElementById(elementId).innerText = message;
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(element => {
        element.innerText = '';
    });
}

function handleServerErrors(errors) {
    if (errors.username) {
        displayError('username-error', errors.username);
    }
    if (errors.email) {
        displayError('email-error', errors.email);
    }
    if (errors.password) {
        displayError('password-error', errors.password);
    }
    // Aggiungi altri controlli degli errori come necessario
}
