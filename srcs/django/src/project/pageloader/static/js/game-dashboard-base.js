
function joinTournament(tournamentId) {
    console.log('Joining tournament:', tournamentId);
    let accessToken = localStorage.getItem('accessToken');
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

document.getElementById('leavegame').addEventListener('click', function() {
    // Emissione dell'evento custom
    console.log('Loading dashboard...');
    const event = new Event('cleanupGameEvent');
    document.dispatchEvent(event);
    let gameType = document.getElementById('gametype').textContent;

    if (gameType === 'tournament') {
        let tournament_id = document.getElementById('gametype').dataset.tournament;
        window.joinTournament(tournament_id);
    }
    else {
        loadPage('api/dashboard/');
    }
});


var urlPathGame = window.location.pathname;
var game_id_game = urlPathGame.split('/').filter(part => part !== '').pop();
var userId_game = localStorage.getItem('userId'); // Assicurati che l'ID utente sia memorizzato in localStorage
var username_game = localStorage.getItem('username'); // Assicurati che il nome utente sia memorizzato in localStorage

if (game_id_game !== 'single' && game_id_game !== 'local') {
    console.log('game_id_game: ', game_id_game);
    var game = `wss://${window.location.host}/wss/game/${game_id_game}/?id=${userId_game}`;
    var GameSocket = new WebSocket(game);
    window.GameSocket = GameSocket;

    GameSocket.onopen = function(e) {
        console.log('WebSocket connection established.');
        GameSocket.send(JSON.stringify({ action: "join", game_id_game: game_id_game, username: username_game }));
    };
}
