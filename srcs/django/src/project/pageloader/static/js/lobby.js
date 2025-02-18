var urlPathLobby = window.location.pathname;
var game_id_lobby = urlPathLobby.split('/').filter(part => part !== '').pop();
var userId_lobby = localStorage.getItem('userId');
var username_lobby = localStorage.getItem('username');

if (typeof lobby === 'undefined') {
  let lobby = null;
}

if (typeof userList === 'undefined') {
    let userList = {};
}
userList = {};


lobby = `wss://${window.location.host}/wss/lobby/${game_id_lobby}/?id=${userId_lobby}`;

if (typeof LobbySocket === 'undefined') {
    let LobbySocket = null;
} else {
    LobbySocket.close();
    LobbySocket = null;
}
LobbySocket = new WebSocket(lobby);

try {
LobbySocket.onopen = function(e) {
    LobbySocket.send(JSON.stringify({ action: "join", game_id_lobby: game_id_lobby, username: username_lobby }));
} 
} catch (error) {
    console.error('Errore durante la creazione:', error);
}

var intervalCountdown = null;

LobbySocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    if (data.action === 'message') {
        let messages = document.getElementById('lobby_messages');
        messages.insertAdjacentHTML('beforeend', `<div class="d-flex justify-content-start" style="height: 2.2vh;"><strong>${userList[data.player]}:</strong><p>${data.message}</p></div>`);
        messages.scrollTop = messages.scrollHeight;
    } else if (data.action === 'assign_slot') {
        assignPlayerSlot(data.slot, userList[data.player]);
    } else if (data.action === 'join') {
        updateTeamSlots(data);
    } else if (data.action === 'user_list') {
        updateUserList(data.users);
    } else if (data.action === 'start_game') {
        let time = 10;
        let messages = document.getElementById('lobby_messages');
        let butToDisable = document.querySelectorAll('button');
        butToDisable.forEach(element => {
            element.disabled = true;
        });


        intervalCountdown = setInterval(() => {
            time--;
            messages.insertAdjacentHTML('beforeend', `<div class="d-flex justify-content-start"><strong>Server:</strong><p>THE GAME WILL START IN ${time}!!!</p></div>`);
            messages.scrollTop = messages.scrollHeight;
            if (time === 0) {
                LobbySocket.send(JSON.stringify({ action: 'start_game_host', username: username_lobby }));
                loadPage('/api/game/' + game_id_lobby + '/');
            }
        }, 1000);
    } else if (data.action === 'player_ready') {
        updateReadyStatus(userList[data.username], data.status);
    } else if (data.action === 'leave') {
        for(let i = 1; i <= 4; i++) {
            if(document.getElementById('player' + i + '_label')?.textContent.includes(userList[data.username])) {
                document.getElementById('player' + i + '_label').textContent = 'Empty';
            }
            if(document.getElementById('user' + i + '_lobby')?.textContent.includes(userList[data.username])) {
                document.getElementById('user' + i + '_lobby').textContent = 'Empty';
            }
        }
    } else if (data.action === "disconnected") {
        
        for (let i = 1; i <= 2; i++) {
            let playerLabel = document.getElementById('player' + i + '_label');
            let userLobby = document.getElementById('user' + i + '_lobby');
            
            playerLabel.classList.remove('ready', 'not_ready');
            if (playerLabel?.textContent.includes(userList[data.username])) {
                
                playerLabel.classList.add('disconnect');
    
                playerLabel.classList.remove('connect');
            }
            userLobby.classList.remove('ready', 'not_ready');
            if (userLobby?.textContent.includes(userList[data.username])) {
                
                userLobby.classList.add('disconnect');
    
                userLobby.classList.remove('connect');
            }
        }
        
        if (intervalCountdown !== null)
        {
            clearInterval(intervalCountdown);
            let buttonToEnable = document.querySelectorAll('button');
            buttonToEnable.forEach(element => {
                element.disabled = false;
            });
        }
        
        if (document.getElementById('start') === null) {
            document.getElementById('ready').textContent = 'Ready';
            document.getElementById('ready').style.backgroundColor = 'green';
            document.getElementById('ready').disabled = true;
        } else {
            document.getElementById('start').disabled = true;
        }
        
    } else if (data.action === "connected") {
        userList[data.username] = data.nickname;
        for (let i = 1; i <= 4; i++) {
            let playerLabel = document.getElementById('player' + i + '_label');
            let userLobby = document.getElementById('user' + i + '_lobby');
    
            if (playerLabel?.textContent.includes(userList[data.username])) {
                playerLabel.classList.remove('disconnect');
            }

            if (userLobby?.textContent.includes(userList[data.username])) {
                userLobby.classList.remove('disconnect');
            }
        }
        if(document.getElementById('ready') !== null)
        {
            document.getElementById('ready').disabled = false;
        }
    } else if (data.action === 'delete') {
        LobbySocket.close();
        loadPage('/api/remote/');
    }
    
};

window.LobbySocket = LobbySocket;

function updateUserList(users) {
    let team1Count = 0;
    let team2Count = 0;

    users.forEach(user => {
        const slot = user.slot;
        const player = user.nickname;
        const team = user.team;
        userList[user.player] = user.nickname;
        if (slot === 'player1') {
            if (document.getElementById('game_mode').textContent !== '2v2') {
                document.getElementById('player1_label').textContent = player;
            } else if (team === 'team1') {
                document.getElementById('t1p1_lobby_label').textContent = player;
                team1Count++;
            } else if (team === 'team2') {
                document.getElementById('t2p1_lobby_label').textContent = player;
                team2Count++;
            }
            document.getElementById('user1_lobby').textContent = player + ' (host)';
        } else if (slot === 'player2') {
            if (document.getElementById('game_mode').textContent !== '2v2') {
                document.getElementById('player2_label').textContent = player;
            } else if (team === 'team1') {
                document.getElementById('t1p2_lobby_label').textContent = player;
                team1Count++;
            } else if (team === 'team2') {
                document.getElementById('t2p2_lobby_label').textContent = player;
                team2Count++;
            }
            document.getElementById('user2_lobby').textContent = player;
        } else if (slot === 'player3' && document.getElementById('player3_label') !== null) {
            document.getElementById('player3_label').textContent = player;
            document.getElementById('user3_lobby').textContent = player;
        } else if (slot === 'player4' && document.getElementById('player4_label') !== null) {
            document.getElementById('player4_label').textContent = player;
            document.getElementById('user4_lobby').textContent = player;
        }

        if (player === username_lobby) {
            if (team === 'team1') {
                document.getElementById('t1_button').textContent = 'Leave Team';
                disableOtherTeamButton('team1');
            } else if (team === 'team2') {
                document.getElementById('t2_button').textContent = 'Leave Team';
                disableOtherTeamButton('team2');
            }
        }
    });

    if (team1Count >= 2 && document.getElementById('t1p1_lobby_label').textContent !== username_lobby && document.getElementById('t1p2_lobby_label').textContent !== username_lobby) {
        document.getElementById('t1_button').textContent = 'Team Full';
        document.getElementById('t1_button').disabled = true;
    }
    if (team2Count >= 2 && document.getElementById('t2p1_lobby_label').textContent !== username_lobby && document.getElementById('t2p2_lobby_label').textContent !== username_lobby ){
        document.getElementById('t2_button').textContent = 'Team Full';
        document.getElementById('t2_button').disabled = true;
    }
}

var buttons = document.querySelectorAll('.lobby-join-team');
buttons.forEach(button => {
    button.addEventListener('click', function() {
        const teamSelected = this.getAttribute('data-team');
        const isJoin = this.textContent === 'Join Team';


        let message;

        if (isJoin) {
            message = {
                action: 'join_team',
                team: teamSelected,
                username: username_lobby
            };
            LobbySocket.send(JSON.stringify(message));
            this.textContent = 'Leave Team';
            disableOtherTeamButton(teamSelected);
        } else {
            message = {
                action: 'leave_team',
                team: teamSelected,
                username: username_lobby
            };
            LobbySocket.send(JSON.stringify(message));
            this.textContent = 'Join Team';
            enableOtherTeamButton();
        }

    });
});

function disableOtherTeamButton(currentTeam) {
    buttons.forEach(button => {
        if (button.getAttribute('data-team') !== currentTeam) {
            button.disabled = true;
        }
    });
}

function enableOtherTeamButton() {
    buttons.forEach(button => {
        button.disabled = false;
    });
}

function assignPlayerSlot(slot, player) {
    const gameMode = document.getElementById('game_mode').textContent;

    if (gameMode === '2v2') {
        if (slot === 'player1') {
            document.getElementById('user1_lobby').textContent = player + ' (host)';
        } else if (slot === 'player2') {
            document.getElementById('user2_lobby').textContent = player;
        } else if (slot === 'player3') {
            document.getElementById('user3_lobby').textContent = player;
        } else if (slot === 'player4') {
            document.getElementById('user4_lobby').textContent = player;
        }
    } else {
        if (slot === 'player1') {
            document.getElementById('player1_label').textContent = player;
            document.getElementById('user1_lobby').textContent = player + ' (host)';
        } else if (slot === 'player2') {
            document.getElementById('player2_label').textContent = player;
            document.getElementById('user2_lobby').textContent = player;
        } else if (slot === 'player3') {
            document.getElementById('player3_label').textContent = player;
            document.getElementById('user3_lobby').textContent = player;
        } else if (slot === 'player4') {
            document.getElementById('player4_label').textContent = player;
            document.getElementById('user4_lobby').textContent = player;
        }
    }
}

function updateTeamSlots(data) {
    const team = data.team;
    const player = data.player;
    if (data.action === 'join') {
        if (team === 'team1') {
            if (document.getElementById('t1p1_lobby_label').textContent === 'Empty' && document.getElementById('t1p2_lobby_label').textContent !== player) {
                document.getElementById('t1p1_lobby_label').textContent = player;
            } else if (document.getElementById('t1p2_lobby_label').textContent === 'Empty' && document.getElementById('t1p1_lobby_label').textContent !== player) {
                document.getElementById('t1p2_lobby_label').textContent = player;
            }
        } else if (team === 'team2') {
            if (document.getElementById('t2p1_lobby_label').textContent === 'Empty' && document.getElementById('t2p2_lobby_label').textContent !== player){
                document.getElementById('t2p1_lobby_label').textContent = player;
            } else if (document.getElementById('t2p2_lobby_label').textContent === 'Empty' && document.getElementById('t2p1_lobby_label').textContent !== player){
                document.getElementById('t2p2_lobby_label').textContent = player;
            }
        }
    } else if (data.action === 'leave') {
        if (team === 'team1') {
            if (document.getElementById('t1p1_lobby_label').textContent === player) {
                document.getElementById('t1p1_lobby_label').textContent = 'Empty';
            } else if (document.getElementById('t1p2_lobby_label').textContent === player) {
                document.getElementById('t1p2_lobby_label').textContent = 'Empty';
            }
        } else if (team === 'team2') {
            if (document.getElementById('t2p1_lobby_label').textContent === player) {
                document.getElementById('t2p1_lobby_label').textContent = 'Empty';
            } else if (document.getElementById('t2p2_lobby_label').textContent === player) {
                document.getElementById('t2p2_lobby_label').textContent = 'Empty';
            }
        }
    }
    checkTeamsFull();
}

function checkTeamsFull() {
    const team1Full = document.getElementById('t1p1_lobby_label').textContent !== 'Empty' && document.getElementById('t1p2_lobby_label').textContent !== 'Empty';
    const team2Full = document.getElementById('t2p1_lobby_label').textContent !== 'Empty' && document.getElementById('t2p2_lobby_label').textContent !== 'Empty';

    if (document.getElementById('t1_button').textContent !== 'Leave Team') {
        if (!team1Full && document.getElementById('t2_button').textContent !== 'Leave Team') {
            document.getElementById('t1_button').disabled = team1Full;
        }

        if (team1Full) {
            document.getElementById('t1_button').textContent = 'Team Full';
            document.getElementById('t1_button').disabled = true;
        }
    }
    if (document.getElementById('t2_button').textContent !== 'Leave Team') {
        if (!team2Full && document.getElementById('t1_button').textContent !== 'Leave Team') {
            document.getElementById('t2_button').disabled = team2Full;
        }

        if (team2Full) {
            document.getElementById('t2_button').textContent = 'Team Full';
            document.getElementById('t2_button').disabled = true;
        }
    }
}

function updateJoinLeaveButtons() {
    const player1 = document.getElementById('player1_label').textContent;
    const player2 = document.getElementById('player2_label').textContent;
    const player3 = document.getElementById('player3_label').textContent;
    const player4 = document.getElementById('player4_label').textContent;

    if (player1 === username_lobby || player2 === username_lobby || player3 === username_lobby || player4 === username_lobby) {
        buttons.forEach(button => {
            button.textContent = 'Leave Team';
        });
    } else {
        buttons.forEach(button => {
            button.textContent = 'Join Team';
        });
    }
}

var form_lobby = document.getElementById('lobby_form');
form_lobby.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = {
        action: 'message',
        username: username_lobby,
        message: e.target.message.value
    };
    LobbySocket.send(JSON.stringify(message));
    form_lobby.reset();
});

var start = document.getElementById('start');
if (start !== null) {
    start.addEventListener('click', (e) => {
        const message = {
            action: 'start_game'
        };
        LobbySocket.send(JSON.stringify(message));
    });
}

var readyButton = document.getElementById('ready');
if (readyButton !== null) {

    readyButton.addEventListener('click', (e) => {
        const message = {
            action: 'ready',
            username: username_lobby,
            status: readyButton.textContent === 'Ready' ? 'ready' : 'not_ready'
        };
        LobbySocket.send(JSON.stringify(message));
        if (readyButton.textContent === 'Ready') {
            readyButton.textContent = 'Not Ready';
            readyButton.style.backgroundColor = 'grey';
            buttons.forEach(button => {
                button.disabled = true;
            });
        } else if (readyButton.textContent === 'Not Ready') {
            readyButton.textContent = 'Ready';
            readyButton.style.backgroundColor = 'green';
            buttons.forEach(button => {
                button.disabled = false;
            });
        }
    });
}

var deleteButton = document.getElementById('delete');
if (deleteButton) {
    deleteButton.addEventListener('click', (e) => {
        let accessToken = localStorage.getItem("accessToken");
        
        function checkTokenValidity(url) {
            fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
                method: "GET"
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Token valido') {
                    performRequest(accessToken, url);
                } else if (data.message === 'Token non valido') {
                    return refreshAccessToken().then(newAccessToken => {
                        if (newAccessToken) {
                            accessToken = newAccessToken;
                            localStorage.setItem("accessToken", newAccessToken);
                            performRequest(newAccessToken, url);
                        } else {
                            loadPage("api/login/");
                        }
                    });
                } else {
                    throw new Error('Network response was not ok');
                }
            })
            .catch(error => {
                console.error('Errore durante la verifica del token:', error);
            });
        }

        const performRequest = (token, url) => {
            fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${token}`,
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => {
                if (response.ok) {
                    LobbySocket.send(JSON.stringify({ action: 'delete', username: username_lobby }));
                    LobbySocket.close();
                    loadPage('/api/remote/');
                } else {
                    return response.json().then(data => { throw new Error(data.error); });
                }
            })
            .catch(error => console.error('Error:', error));
        };
        checkTokenValidity(`/api/lobby/${game_id_lobby}/`);
    });
}

var leaveButton = document.getElementById('leave');
if (leaveButton) {
    leaveButton.addEventListener('click', (e) => {
        let accessToken = localStorage.getItem("accessToken");
        fetch(`/api/lobby/${game_id_lobby}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ action: 'leave' })
        })
        .then(response => {
            if (response.ok) {
                LobbySocket.send(JSON.stringify({ 'type': 'leave', action: 'leave', username: username_lobby }));
                LobbySocket.close();
                loadPage('/api/remote/');
            } else {
                return response.json().then(data => { throw new Error(data.error); });
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

function updateReadyStatus(player, status) {
    var user1 = document.getElementById('user1_lobby').textContent;
    var user2 = document.getElementById('user2_lobby').textContent;
    if (document.getElementById('game_mode').textContent !== '1v1') {
        var user3 = document.getElementById('user3_lobby').textContent;
        var user4 = document.getElementById('user4_lobby').textContent;
    }

    if (status === 'ready') {
        if (player === user1) {
            document.getElementById('user1_lobby').classList.add('ready');
        } else if (player === user2) {
            document.getElementById('user2_lobby').classList.add('ready');
            document.getElementById('user2_lobby').setAttribute('data-status', 'ready');
        } else if (document.getElementById('game_mode').textContent !== '1v1' && player === user3) {
            document.getElementById('user3_lobby').classList.add('ready');
            document.getElementById('user3_lobby').setAttribute('data-status', 'ready');
        } else if (document.getElementById('game_mode').textContent !== '1v1' && player === user4) {
            document.getElementById('user4_lobby').classList.add('ready');
            document.getElementById('user4_lobby').setAttribute('data-status', 'ready');
        }
    } else if (status === 'not_ready') {
        if (player === user1) {
            document.getElementById('user1_lobby').classList.remove('ready');
        } else if (player === user2) {
            document.getElementById('user2_lobby').classList.remove('ready');
            document.getElementById('user2_lobby').setAttribute('data-status', 'not_ready');
        } else if (document.getElementById('game_mode').textContent !== '1v1' && player === user3) {
            document.getElementById('user3_lobby').classList.remove('ready');
            document.getElementById('user3_lobby').setAttribute('data-status', 'not_ready');
        } else if (document.getElementById('game_mode').textContent !== '1v1' && player === user4) {
            document.getElementById('user4_lobby').classList.remove('ready');
            document.getElementById('user4_lobby').setAttribute('data-status', 'not_ready');
        }
    }

    if (document.getElementById('game_mode').textContent !== '1v1') {
        if (document.getElementById('user2_lobby').getAttribute('data-status') === 'ready' && document.getElementById('user3_lobby').getAttribute('data-status') === 'ready' && document.getElementById('user4_lobby').getAttribute('data-status') === 'ready') {
            document.getElementById('start').disabled = false;
        } else {
            document.getElementById('start').disabled = true;
        }
    } else {
        if (document.getElementById('ready'))
            return;
        if (document.getElementById('start') && document.getElementById('user2_lobby').getAttribute('data-status') === 'ready') {
            document.getElementById('start').disabled = false;
        } else {
            document.getElementById('start').disabled = true;
        }
    }
}
