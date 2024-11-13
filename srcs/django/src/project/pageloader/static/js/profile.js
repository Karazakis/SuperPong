// Funzione per ottenere l'ID utente dall'URL
function getUserIdFromUrl() {
    const urlParts = window.location.pathname.split('/');
    return urlParts[urlParts.length - 2];
}

// Recupera l'ID utente dall'URL
try {
    var userId = getUserIdFromUrl();
    if (userId === undefined || userId === null) {
        const userId = getUserIdFromUrl();
    }
}
catch (error) {
    console.error('Errore durante il recupero dell\'ID utente:', error);
    const userId = getUserIdFromUrl();
}
// Pulsante per tornare indietro
var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/dashboard_nav/");
    });
}

// Evento per ciascun elemento della lista amici
document.querySelectorAll('.friend-item').forEach(function(item) {
    item.addEventListener('click', function() {
        var friendId = this.getAttribute('data-id');
        if (friendId) {
            loadPage("/api/profile/" + friendId + '/');
        } else {
            console.error("ID amico non trovato.");
        }
    });
});

// Funzione per verificare e rinnovare il token, se necessario

var checkAndRefreshToken = async () => {
    const accessToken = localStorage.getItem('accessToken');
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

// Funzione per il rinnovo del token di accesso
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

// Funzione per recuperare le statistiche dell'utente
async function fetchUserStatistics(userId) {
    const accessToken = await checkAndRefreshToken();
    if (!accessToken) {
        alert('Token di accesso non valido o scaduto. Effettua nuovamente il login.');
        loadPage('api/login/');
        return;
    }

    try {
        const response = await fetch(`/api/userinfo/${userId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });        

        if (!response.ok) {
            throw new Error("Errore nella risposta della API");
        }

        const data = await response.json();
        console.log("User statistics data received:", data);
        updateProfileStats(data);
    } catch (error) {
        console.error('Errore durante il recupero delle statistiche utente:', error);
    }
}

// Funzione per aggiornare il DOM con i dati statistici dell'utente
function updateProfileStats(data) {
    // Aggiorna le statistiche delle partite
    document.getElementById("game-wins").textContent = data.game_history.filter(game => game.status === "win").length;
    document.getElementById("game-losses").textContent = data.game_history.filter(game => game.status === "loss").length;
    document.getElementById("game-draws").textContent = data.game_history.filter(game => game.status === "draw").length;
    document.getElementById("game-abandons").textContent = data.game_history.filter(game => game.status === "abandon").length;

    // Popola la tabella della cronologia delle partite
    const matchTableBody = document.getElementById("game-history-table").querySelector("tbody");
    matchTableBody.innerHTML = "";

    if (data.game_history.length > 0) {
        data.game_history.forEach(match => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${match.name}</td>
                <td>${match.mode}</td>
                <td>${match.status === "win" ? "Win" : "Loss"}</td>
            `;
            matchTableBody.appendChild(row);
        });
    } else {
        matchTableBody.innerHTML = `<tr><td colspan="3" class="text-center">No game history available</td></tr>`;
    }

    // Aggiorna le statistiche dei tornei
    document.getElementById("tournament-wins").textContent = data.tournament_history.filter(tournament => tournament.status === "win").length;
    document.getElementById("tournament-losses").textContent = data.tournament_history.filter(tournament => tournament.status === "loss").length;
    document.getElementById("tournament-draws").textContent = data.tournament_history.filter(tournament => tournament.status === "draw").length;
    document.getElementById("tournament-abandons").textContent = data.tournament_history.filter(tournament => tournament.status === "abandon").length;

    // Popola la tabella della cronologia dei tornei
    const tournamentTableBody = document.getElementById("tournament-history-table").querySelector("tbody");
    tournamentTableBody.innerHTML = "";

    if (data.tournament_history.length > 0) {
        data.tournament_history.forEach(tournament => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${tournament.name}</td>
                <td>${tournament.mode}</td>
                <td>${tournament.status}</td>
                <td>${tournament.status === "win" ? "Winner" : "Loss"}</td>
            `;
            tournamentTableBody.appendChild(row);
        });
    } else {
        tournamentTableBody.innerHTML = `<tr><td colspan="4" class="text-center">No tournament history available</td></tr>`;
    }
}



// Esegui la funzione per ottenere le statistiche
fetchUserStatistics(userId);
