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

// Evento per ciascun link delle partite
document.querySelectorAll(".game-link").forEach(link => {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        const gameId = this.getAttribute("data-id");
        if (gameId) {
            loadPage(`api/matchinfo/${gameId}/`);
        } else {
            console.error("ID partita non trovato.");
        }
    });
});

// Evento per ciascun link dei tornei
document.querySelectorAll(".tournament-link").forEach(link => {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        const tournamentId = this.getAttribute("data-id");
        if (tournamentId) {
            loadPage(`api/tournamentinfo/${tournamentId}/`);
        } else {
            console.error("ID torneo non trovato.");
        }
    });
});


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
