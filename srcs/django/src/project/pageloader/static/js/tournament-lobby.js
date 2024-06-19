document.addEventListener('DOMContentLoaded', function() {
    var startBtn = document.getElementById('start');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            fetch('/api/start_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tournament_id: tournament.id })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert("Tournament Started!");
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error starting tournament:', error));
        });
    }

    var leaveBtn = document.querySelector('.tournament-leave');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', function() {
            fetch('/api/leave_tournament/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tournament_id: tournament.id })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert("Left the Tournament");
                    loadPage("api/join_tournament/");
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error leaving tournament:', error));
        });
    }

    var chatForm = document.getElementById('tournament_form');
    chatForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const message = {
            action: 'message',
            username: localStorage.getItem('username'),
            message: chatForm.message.value
        };

        // Send message to the WebSocket
        tournamentSocket.send(JSON.stringify(message));
        chatForm.reset();
    });

    // WebSocket logic
    const tournamentId = window.location.pathname.split('/').pop();
    const tournamentSocket = new WebSocket(`wss://${window.location.host}/wss/tournament/${tournamentId}/`);

    tournamentSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.action === 'message') {
            const messages = document.getElementById('tournament_messages');
            messages.insertAdjacentHTML('beforeend', `<div><strong>${data.username}:</strong> ${data.message}</div>`);
        }
    };
});
