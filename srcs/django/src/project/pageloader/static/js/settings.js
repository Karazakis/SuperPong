document.querySelectorAll('.key-capture').forEach(function(input) {
    input.addEventListener('keydown', function(event) {
        event.preventDefault();
        this.value = event.code;
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
    event.preventDefault();

    clearErrors();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const nickname = document.getElementById('nickname').value;

    let hasError = false;
    const usernameError = validateUsername(username);
    const nicknameError = validateNickname(nickname);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (usernameError) {
        displayError('username-error', usernameError);
        hasError = true;
    }

    if (nicknameError) {
        displayError('nickname-error', nicknameError);
        hasError = true;
    }

    if (emailError) {
        displayError('email-error', emailError);
        hasError = true;
    }
    
    if (password && passwordError) {
        displayError('password-error', passwordError);
        hasError = true;
    }

    if (hasError) {
        return;
    }

    const formData = new FormData();
    formData.append('id', localStorage.getItem('userId'));
    formData.append('username', username);
    formData.append('nickname', nickname);
    formData.append('email', email);

    const imgProfileInput = document.getElementById('img_profile');
    if (imgProfileInput.files.length > 0) {
        const imgProfile = imgProfileInput.files[0];

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(imgProfile.type)) {
            displayError('img-profile-error', "File must be one of these formats (JPEG, PNG, GIF).");
            hasError = true;
        }

        const maxImageSize = 2 * 1024 * 1024;
        if (imgProfile.size > maxImageSize) {
            displayError('img-profile-error', `Image cannot be more than 2 MB. Actual dimension: ${(imgProfile.size / 1024 / 1024).toFixed(2)} MB`);
            hasError = true;
        }

        if (!hasError) {
            formData.append('img_profile', imgProfile);
            }
    } else {
        
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
            localStorage.setItem('username', username);
            loadPage("api/settings/");
        } else {
            handleServerErrors(data.errors);
        }
    })
    .catch(error => handleServerErrors(JSON.parse(error.message)));
});


function validateUsername(username) {
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

function validateNickname(nickname) {
    nickname = nickname.replace(/[<>]/g, '');

    if (/\s/.test(nickname)) {
        return "Nickname cannot contain spaces.";
    }
    if (nickname.length < 3) {
        return "Nickname must be at least 3 characters long.";
    }
    if (nickname.length > 20) {
        return "Nickname cannot be over 20 characters long.";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
        return "Nickname can contain only letters, numbers and underscore.";
    }
    return "";
}


function validateEmail(email) {
    email = email.replace(/[<>]/g, '');

    if (email.length > 40) {
        return "Email address cannot be over 40 characters long.";
    }
    if (!/^(?!.*\.\.)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return "Insert a valid email address.";
    }
    return "";
}



function validatePassword(password) {
    if (password.length < 8) {
        return "Password must have at least 8 characters.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must have at least one lowercase character.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must have at least one uppercase character.";
    }
    if (!/\W/.test(password)) {
        return "Password must have at least one special character.";
    }
    return "";
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
}



async function updateUserProfile() {
    const userId = localStorage.getItem('userId');
    let accessToken = localStorage.getItem('accessToken');

    if (!userId || !accessToken) {
        return;
    }

    const checkAndRefreshToken = async () => {
        try {
            const response = await fetch(`/api/token/refresh/?token=${accessToken}`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.message === 'Token valido') {
                return accessToken;
            } else if (data.message === 'Token non valido') {
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    localStorage.setItem('accessToken', newAccessToken);
                    return newAccessToken;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    };

    accessToken = await checkAndRefreshToken();
    if (!accessToken) {
        return;
    }

    try {
        const response = await fetch(`/api/userinfo/${userId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            return;
        }

        const user = await response.json();

        const nicknameElement = document.getElementById('profile-nickname');
        const profilePictureElement = document.getElementById('profile-picture');

        if (nicknameElement && profilePictureElement) {
            nicknameElement.innerHTML = `<h4>${user.nickname}</h4>`;
            profilePictureElement.src = "/static/" + user.img_profile;
        } 
    } catch (error) {
		recoverUser(id);
    }
}

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
            return null;
        }
    } catch (error) {
        return null;
    }
}


