

function toggleRuleInput() {
    const ruleSelect = document.getElementById('rule');
    const timeOptions = document.getElementById('timeOptions');
    const scoreOptions = document.getElementById('scoreOptions');
    
    if (ruleSelect.value === 'time') {
        timeOptions.style.display = 'block';
        scoreOptions.style.display = 'none';
    } else if (ruleSelect.value === 'score') {
        scoreOptions.style.display = 'block';
        timeOptions.style.display = 'none';
    }
}
document.getElementById('rule').addEventListener('change', toggleRuleInput);

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
    const actual_url = window.location.href;
    if (actual_url.includes('create_single')) {
         loadPage("api/dashboard/");
    } else if (actual_url.includes('create_remote')) {
         loadPage("api/remote/");
    } else if (actual_url.includes('create_tournament')) {
        loadPage("api/tournaments/");
    } else {
        loadPage("api/dashboard/");
    }
});
}

document.getElementById('create').addEventListener('click', function(event) {
    event.preventDefault();
    const actual_url = window.location.href;
    let Type = 'default';
    if (actual_url.includes('tournament')) {
       Type = 'tournament-game';
    } else if (actual_url.includes('remote')) {
       Type = 'remote-game';
    } else if (actual_url.includes('local')) {
         Type = 'local-game';
    } else if (actual_url.includes('single')) {
        Type = 'single-game';
    }
    let limit;
    if (document.getElementById('rule').value === 'time') {
        limit = parseInt(document.getElementById('timelimit').value, 10);
    } else {
        limit = parseInt(document.getElementById('scorelimit').value, 10);
    }

    const data = {
        name: document.getElementById('name').value,
        type: Type,
        mode: '1v1',
        rules: document.getElementById('rule').value,
        limit: limit,
        balls: parseInt(document.getElementById('balls').value, 10) || 1,
        boost: document.getElementById('boost').checked
    };

    // Aggiungi il numero di giocatori solo se il campo esiste
    const nbPlayersElement = document.getElementById('nb_players');
    if (nbPlayersElement) {
        data.nb_players = parseInt(nbPlayersElement.value, 10) || 2;
    }

    const currentUrl = window.location.href;
    const queryString = new URLSearchParams(data).toString(); // Crea la stringa di query

    let source = 'default';
    if (currentUrl.includes('create_remote')) {
        source = 'remote';
    } else if (currentUrl.includes('create_local')) {
        source = 'local';
    } else if (currentUrl.includes('create_single')) {
        source = 'single';
    } else if (currentUrl.includes('create_tournament')) {
        source = 'tournament';
    }

    const url = `/api/create/?source=${source}`;
    if (source === 'remote' || source === 'tournament') {
        let accessToken = localStorage.getItem("accessToken");
    
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
    
        // Funzione principale per eseguire la richiesta
        const executeRequest = async () => {
            accessToken = await checkAndRefreshToken();
            if (!accessToken) {
                alert('Token di accesso non valido o scaduto. Effettua nuovamente il login.');
                loadPage('api/login/');
                return;
            }
    
            // Effettua la richiesta POST
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${accessToken}`,
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    if (source === 'tournament') {
                        loadPage("api/tournament_lobby/" + data.success + "/");
                    } else {
                        loadPage("api/lobby/" + data.success + "/");
                    }
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Errore durante la creazione:', error));
        };
    
        // Esegui la richiesta con il controllo del token
        executeRequest();
    } else if (source === 'local' || source === 'single') {

        let UserId = localStorage.getItem('userId');

        let targetUrl = "api/game/local/?" + queryString + '&userid=' + UserId;
        if (source === 'single') {
            targetUrl = "api/game/single/?" + queryString + '&userid=' + UserId;
        }

        loadPage(targetUrl);
    }
});

toggleRuleInput();