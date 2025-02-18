
var joinButtons = document.querySelectorAll('.join-btn');
joinButtons.forEach(button => {
    button.addEventListener('click', function() {
        const gameId = this.getAttribute('data-game-id');
        const tournamentId = this.getAttribute('data-tournament-id');
        if (gameId) {
            joinGame(gameId);
        } else if (tournamentId) {
            joinTournament(tournamentId);
        }
    });
});


var refreshButton = document.getElementById('refresh-btn');
refreshButton.addEventListener('click', function() {
    var currentUrl = window.location.pathname;
    loadPage("api"+currentUrl);
});



var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        const actual_url = window.location.href;
     if (actual_url.includes('join_tournament')) {
         loadPage("api/tournaments/");
     } else if (actual_url.includes('join_lobby')) {
         loadPage("api/remote/");
     }
    });
}

var deleteButtons = document.querySelectorAll('.delete-btn');
deleteButtons.forEach(button => {
    button.addEventListener('click', function() {
        const tournamentId = this.getAttribute('data-tournament-id');
        deleteTournament(tournamentId);
    });
});

function joinGame(gameId) {
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



function deleteTournament(tournamentId) {
    let accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Access token not found.');
        alert('Access token not found. Please log in again.');
        return;
    }

    fetch(`/api/join_tournament/${tournamentId}/`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok, status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Tournament deleted successfully.');
            let currentUrl = window.location.pathname;
            loadPage("api"+currentUrl);
        } else {
            console.error('Failed to delete tournament:', data.error);
            alert('Failed to delete tournament: ' + data.error);
        }
    })
    .catch(error => console.error('Error deleting tournament:', error));
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

function refreshTournamentList() {
    let accessToken = localStorage.getItem('accessToken');
    fetch('/api/tournaments/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.text())
    .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector('.container.mt-4');
        const tournamentContainer = document.querySelector('.container.mt-4');
        if (newContent) {
            tournamentContainer.innerHTML = newContent.innerHTML;
            setupEventListeners();
        } else {
            console.error('Failed to find new tournament content in response');
        }
    })
    .catch(error => console.error('Error refreshing tournament list:', error));
}

function setupEventListeners() {
    var joinButtons = document.querySelectorAll('.join-btn');
    joinButtons.forEach(button => {
        button.addEventListener('click', function() {
            const gameId = this.getAttribute('data-game-id');
            const tournamentId = this.getAttribute('data-tournament-id');
            if (gameId) {
                joinGame(gameId);
            } else if (tournamentId) {
                joinTournament(tournamentId);
            }
        });
    });

    var deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tournamentId = this.getAttribute('data-tournament-id');
            deleteTournament(tournamentId);
        });
    });
}

document.addEventListener('DOMContentLoaded', setupEventListeners);

function updateLobbyPlayersCount(tournamentId) {
    let accessToken = localStorage.getItem('accessToken');
    fetch(`/api/tournament/${tournamentId}/players_in_lobby/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const lobbyCountElement = document.querySelector(`[data-tournament-id="${tournamentId}"] .players-in-lobby`);
        if (lobbyCountElement) {
            lobbyCountElement.textContent = `Players in Lobby: ${data.players_in_lobby}`;
        }
    })
    .catch(error => console.error('Error updating lobby players count:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    const tournamentElements = document.querySelectorAll('[data-tournament-id]');
    tournamentElements.forEach(element => {
        const tournamentId = element.dataset.tournamentId;
        updateLobbyPlayersCount(tournamentId);
    });
});
