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
        const imgProfile = imgProfileInput.files[0];

        // Controllo del tipo di file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(imgProfile.type)) {
            displayError('img-profile-error', "Il file deve essere un'immagine (JPEG, PNG, GIF).");
            hasError = true;
        }

        // Controllo della dimensione in byte
        const maxImageSize = 2 * 1024 * 1024; // 2 MB
        if (imgProfile.size > maxImageSize) {
            displayError('img-profile-error', `L'immagine non può superare i 2 MB. Dimensione attuale: ${(imgProfile.size / 1024 / 1024).toFixed(2)} MB`);
            hasError = true;
        }

        // Controllo asincrono della dimensione in pixel
        if (!hasError) {
            formData.append('img_profile', imgProfile);
            }
    } else {
        // tutto ok con l immagine
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
            updateUserProfile();
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



async function updateUserProfile() {
    const userId = localStorage.getItem('userId');
    let accessToken = localStorage.getItem('accessToken');

    if (!userId || !accessToken) {
        console.error('ID utente o token di accesso mancante');
        return;
    }

    // Funzione per verificare la validità del token e, se necessario, rinnovarlo
    const checkAndRefreshToken = async () => {
        try {
            const response = await fetch(`/api/token/refresh/?token=${accessToken}`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.message === 'Token valido') {
                // Il token è valido, procedi con la richiesta
                return accessToken;
            } else if (data.message === 'Token non valido') {
                // Il token non è valido, tentiamo di rinnovarlo
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    localStorage.setItem('accessToken', newAccessToken);
                    return newAccessToken;
                } else {
                    console.error('Impossibile rinnovare il token');
                    return null;
                }
            } else {
                console.error('Errore durante il controllo del token:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Errore durante la verifica o il rinnovo del token:', error);
            return null;
        }
    };

    // Verifica la validità del token e procedi con la richiesta se tutto è in ordine
    accessToken = await checkAndRefreshToken();
    if (!accessToken) {
        // Se non è possibile ottenere un token valido, esci
        return;
    }

    // Effettua la richiesta per aggiornare il profilo utente
    try {
        const response = await fetch(`/api/userinfo/${userId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error('Errore durante il recupero dei dati dell\'utente');
            return;
        }

        const user = await response.json();

        const nicknameElement = document.getElementById('profile-nickname');
        const profilePictureElement = document.getElementById('profile-picture');

        if (nicknameElement && profilePictureElement) {
            nicknameElement.innerHTML = `<h4>${user.nickname}</h4>`;
            profilePictureElement.src = "/static/" + user.img_profile;
        } else {
            console.error('Elementi HTML non trovati');
        }

    } catch (error) {
		recoverUser(id);
        //console.error('Errore durante il recupero dei dati dell\'utente:', error);
    }
}

// Funzione per il rinnovo del token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.error('Token di refresh mancante');
        return null;
    }

    try {
        const response = await fetch('/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            return data.access;
        } else {
            console.error('Errore durante il rinnovo del token di accesso');
            return null;
        }
    } catch (error) {
        console.error('Errore durante il rinnovo del token di accesso:', error);
        return null;
    }
}


