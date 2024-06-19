
var joinButtons = document.querySelectorAll('.join-btn');
joinButtons.forEach(button => {
    button.addEventListener('click', function() {
        const gameId = this.getAttribute('data-game-id');
        const tournamentId = this.getAttribute('data-tournament-id');
        console.log('Joining game:', gameId, 'Joining tournament:', tournamentId);
        if (gameId) {
            joinGame(gameId);
        } else if (tournamentId) {
            joinTournament(tournamentId);
        }
    });
});


var refreshButton = document.getElementById('refresh-btn');
refreshButton.addEventListener('click', function() {
    location.reload(); // Ricarica la pagina per ottenere la lista aggiornata
});

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("/api/remote/");
    });
}

function joinGame(gameId) {
    console.log('Joining game:', gameId);
    let accessToken = localStorage.getItem('accessToken');
    fetch(`/api/join_lobby/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ user_id: localStorage.getItem('userId'), game_id: gameId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadPage(`/api/lobby/${gameId}/`);
        } else {
            alert(data.message);
        }
    })
    .catch(error => console.error('Error joining game:', error));
}

function joinTournament(tournamentId) {
    fetch(`/api/join_tournament/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ user_id: localStorage.getItem('userId'), tournament_id: tournamentId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadPage(`/api/tournament_lobby/${tournamentId}/`);
        } else {
            alert(data.message);
        }
    })
    .catch(error => console.error('Error joining tournament:', error));
}
