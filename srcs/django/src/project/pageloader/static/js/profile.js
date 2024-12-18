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

function updateProfileStats(data) {
    // Aggiorna le statistiche dei giochi
    document.getElementById("game-wins").textContent = data.game_history.filter(game => game.status === "win").length;
    document.getElementById("game-losses").textContent = data.game_history.filter(game => game.status === "loss").length;
    document.getElementById("game-draws").textContent = data.game_history.filter(game => game.status === "draw").length;
    document.getElementById("game-abandons").textContent = data.game_history.filter(game => game.status === "abandon").length;
    console.log("Game history:", data.game_history);
    // Popola la tabella della cronologia delle partite
    const matchTableBody = document.getElementById("game-history-table").querySelector("tbody");
    matchTableBody.innerHTML = "";

    if (data.game_history.length > 0) {
        data.game_history.forEach(match => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><a href="#" class="game-link" data-id="${match.id}">${match.name}</a></td>
                <td>${match.mode}</td>
                <td>${match.status === "win" ? "Win" : "Loss"}</td>
            `;
            matchTableBody.appendChild(row);
        });

        // Aggiungi event listener ai link delle partite
        document.querySelectorAll(".game-link").forEach(link => {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                const gameId = this.getAttribute("data-id");
                loadPage(`api/matchinfo/${gameId}/`);
            });
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
                <td><span class="tournament-link" data-id="${tournament.id}">${tournament.name}</span></td>
                <td>${tournament.mode}</td>
                <td>${tournament.status}</td>
                <td>${tournament.status === "win" ? "Winner" : "Loss"}</td>
            `;
            tournamentTableBody.appendChild(row);
        });

        // Aggiungi event listener ai link dei tornei
        document.querySelectorAll(".tournament-link").forEach(link => {
            link.addEventListener("click", function (event) {
                event.preventDefault();
                const tournamentId = this.getAttribute("data-id");
                loadPage(`api/tournamentinfo/${tournamentId}/`);
            });
        });
    } else {
        tournamentTableBody.innerHTML = `<tr><td colspan="4" class="text-center">No tournament history available</td></tr>`;
    }
}

// Funzione per estrarre l'ID del profilo dall'URL e memorizzarlo nel sessionStorage
function saveProfileIdFromUrl() {
    const path = window.location.pathname; // Ottiene il percorso dell'URL
    const regex = /\/profile\/(\d+)\//; // RegEx per estrarre l'ID dal percorso (es. /profile/9/)
    const match = path.match(regex);

    if (match && match[1]) {
        const profileId = match[1];
        sessionStorage.setItem('profile_id', profileId);
    } else {
        console.error('ID del profilo non trovato nell\'URL');
    }
}


saveProfileIdFromUrl();

fetchUserStatistics(userId);

function initializeChart() {
    const canvas = document.getElementById("user-stats-chart");
    if (!canvas) return; // Evita errori se il canvas non è ancora presente

    const ctx = canvas.getContext("2d");

    // Imposta le dimensioni del canvas dinamicamente
    const containerWidth = canvas.parentElement.offsetWidth;
    canvas.width = 500; // Usa il 90% dello spazio disponibile
    canvas.height = 500; // Mantieni il canvas quadrato

    // Dati delle statistiche
    let precision = document.getElementById("precision").textContent;
    let reactivity = document.getElementById("reactivity").textContent;
    let luck = document.getElementById("luck").textContent;
    let madness = document.getElementById("madness").textContent;
    let leadership = document.getElementById("leadership").textContent;

    const stats = {
        "Precision": precision,
        "Reactivity": reactivity,
        "Luck": luck,
        "Madness": madness,
        "Leadership": leadership
    };

    // Configurazione
    const maxStatValue = 5; // Valore massimo per ogni statistica
    const statNames = Object.keys(stats);
    const statValues = Object.values(stats);
    const padding = Math.min(canvas.width, canvas.height) * 0.1; // Calcola il padding dinamicamente
    const radius = Math.min(canvas.width, canvas.height) / 2 - padding;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Funzione per disegnare il grafico
    function drawChart() {
        // Cancella il canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Disegna i raggi
        ctx.beginPath();
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;

        for (let i = 0; i < statNames.length; i++) {
            const angle = (Math.PI * 2 * i) / statNames.length;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.closePath();

        // Disegna il poligono delle statistiche
        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 123, 255, 0.5)";
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;

        for (let i = 0; i < statValues.length; i++) {
            const angle = (Math.PI * 2 * i) / statValues.length;
            const valueRadius = (statValues[i] / maxStatValue) * radius;
            const x = centerX + valueRadius * Math.cos(angle);
            const y = centerY + valueRadius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Disegna le etichette
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 18px Arial";

        for (let i = 0; i < statNames.length; i++) {
            const angle = (Math.PI * 2 * i) / statNames.length;
            const x = centerX + (radius + padding * 0.5) * Math.cos(angle);
            const y = centerY + (radius + padding * 0.5) * Math.sin(angle);
            ctx.fillText(statNames[i], x, y);
        }
    }

    drawChart();
}

// Chiamata manuale quando la SPA carica questa sezione
initializeChart();
