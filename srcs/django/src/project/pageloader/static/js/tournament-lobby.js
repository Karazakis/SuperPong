var urlPathLobby = window.location.pathname;
var round_id_lobby = urlPathLobby.split('/').filter(part => part !== '').pop();
var userId_lobby = localStorage.getItem('userId');
var username_lobby = localStorage.getItem('username');
var slotSelectionLocked = false;
var lobby = `wss://${window.location.host}/wss/tournament/${round_id_lobby}/?id=${userId_lobby}`;
var LobbySocket = new WebSocket(lobby);

var userIdToUserMap = {};

var usernameToNicknameMap = {};
var countdownActive = false;
var countdownInterval = null;

function initializeNicknameMapFromTemplate() {
    const nicknameElement = document.getElementById('user-nicknames');

    if (nicknameElement) {
        try {
            const nicknamesArray = JSON.parse(nicknameElement.dataset.nicknames);
            nicknamesArray.forEach(entry => {
                const userId = entry.userId;
                const username = entry.username;
                const nickname = entry.nickname;

                if (
                    !userIdToUserMap[userId] ||
                    userIdToUserMap[userId].username !== username ||
                    userIdToUserMap[userId].nickname !== nickname
                ) {
                    userIdToUserMap[userId] = { username, nickname };
                }
            });
        } catch (error) {
            console.error("Errore nel parsing dei dati dal template:", error);
        }
    } else {
        console.warn("Elemento nickname non trovato nel DOM.");
    }
}


function getNickname(username) {
    for (const userId in userIdToUserMap) {
        const user = userIdToUserMap[userId];
        if (user.username === username) {
            return user.nickname || username;
        }
    }
    return username;
}

onPageLoad();

LobbySocket.onopen = function(e) {
    LobbySocket.send(JSON.stringify({ action: "join", round_id_lobby: round_id_lobby, username: username_lobby }));
};

LobbySocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    switch (data.type) {
        case 'chat_message':
            let messages = document.getElementById('lobby_messages');
            const nickname = getNickname(data.username);
			messages.insertAdjacentHTML('afterbegin', `<div class="d-flex justify-content-start"><strong>${nickname}:</strong><p>${data.message}</p></div>`);
			break;
        case 'update_all_slots':
            const updatedSlots = updateSlotsWithUsernames(data.slots);
            updateAllSlots(updatedSlots);
            const currentUserElement = document.getElementById('current-user');
            const currentUser = currentUserElement.dataset.username;
            setupSlotSelection(currentUser);
            break;
        case 'update_ready_status':
            updateReadyStatusInUserList(data.slots, data.ready_status);
            break;
        case 'update_lobby':
            updateUserList(data.user_list,data.slots, data.ready_status);
            break;
        case 'block_slots':
            disableButtonsAndSlots(data.players_to_block);
            break;
        case 'reset_ready_statuses':
            const readyButton = document.querySelector('.lobby-ready');     
            if (readyButton) readyButton.disabled = true;
            break
        case 'join_game_notification':
            if (data.show_popup) {
                showJoinGamePopup(data.game_link);
            } else {
                const readyButton = document.querySelector('.lobby-ready');
                const leaveButton = document.querySelector('.lobby-leave');
                if (readyButton) leaveButton.disabled = true;
                if (leaveButton) leaveButton.disabled = false;
            }
            break;
        case 'tournament_finished':
            setTimeout(() => {
                disableAllButtonsButLeave();
                showWinnerPopup(data.winner);
                const readyButton = document.querySelector('.lobby-ready');
                if (readyButton) readyButton.remove();
            }, 500);
            break;
        case 'start_countdown':
            if (data.authorized_client == userId_lobby) {
                startTournamentCountdown();
            }
            break;
        case 'disconnected':
            if (data.authorized === 'false') {
                if (countdownInterval !== null) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }

                const existingPopup = document.querySelector('.popup');
                if (existingPopup) {
                    return;
                }
                let leaveButton = document.querySelector('.lobby-leave');
                if (leaveButton) leaveButton.disabled = false;
            }
            break;
        default:
            break;
    }
};

LobbySocket.onerror = function(e) {
};

LobbySocket.onclose = function(e) {

};

function onPageLoad() {
    initializeNicknameMapFromTemplate();
    const tournamentDataElement = document.getElementById('tournament-data');
    const roundsDataElement = document.getElementById('rounds-data');
    const currentUserElement = document.getElementById('current-user');
    const currentUserNickElement = document.getElementById('current-user-nickname');
    
    const tournament = {
        mode: tournamentDataElement.dataset.mode,
        nb_players: parseInt(tournamentDataElement.dataset.nbPlayers, 10),
        rounds: JSON.parse(roundsDataElement.textContent.trim())
    };
    const currentUser = currentUserElement.dataset.username;
    const currentUserNick = currentUserNickElement.dataset.nickname;
    disableDashboard();

    generateBracket(tournament);
}

function updateSlotsWithUsernames(slots) {
    const updatedSlots = {};

    Object.keys(slots).forEach(roundKey => {
        const roundSlots = slots[roundKey];
        const updatedRoundSlots = {};

        Object.keys(roundSlots).forEach(slotKey => {
            const slot = roundSlots[slotKey];
            const playerId = slot.player_id;

            const updatedUsername = playerId && userIdToUserMap[playerId]
                ? userIdToUserMap[playerId].username
                : slot.username;

            updatedRoundSlots[slotKey] = {
                ...slot,
                username: updatedUsername
            };
        });
        updatedSlots[roundKey] = updatedRoundSlots;
    });

    return updatedSlots;
}



function disableDashboard() {
    const profileButton = document.getElementById('profile');
    const settingsButton = document.getElementById('settings');
    const logoutButton = document.getElementById('logout');

    if (profileButton) {
        profileButton.disabled = true;
    }
    if (settingsButton) {
        settingsButton.disabled = true;
    }
    if (logoutButton) {
        logoutButton.disabled = true;
    }
}

function reactivateDashboard() {
    const profileButton = document.getElementById('profile');
    const settingsButton = document.getElementById('settings');
    const logoutButton = document.getElementById('logout');

    if (profileButton) {
        profileButton.disabled = false;;
    }
    if (settingsButton) {
        settingsButton.disabled = false;
    }
    if (logoutButton) {
        logoutButton.disabled = false;
    }
}

function checkUserSlotAndReadyState(roundsSlots) {
    const readyButton = document.getElementById('ready');
    const userList = document.getElementById('users_in_lobby');

    let userSlotAssigned = false;
    let userIsReady = false;
    let allSlotsValid = true;

    if (!roundsSlots || Object.keys(roundsSlots).length === 0) {
        if (readyButton) readyButton.disabled = true;
        return;
    }

    const roundKeys = Object.keys(roundsSlots).filter(key => roundsSlots[key]);
    const maxRoundKey = roundKeys.reduce((max, key) => {
        const roundNumber = parseInt(key.split('_')[1], 10);
        return (!max || roundNumber > parseInt(max.split('_')[1], 10)) ? key : max;
    }, null);

    if (!maxRoundKey) {
        if (readyButton) readyButton.disabled = true;
        return;
    }

    const maxRoundSlots = roundsSlots[maxRoundKey];
    if (!maxRoundSlots || Object.keys(maxRoundSlots).length === 0) {
        if (readyButton) readyButton.disabled = true;
        return;
    }

    Object.values(maxRoundSlots).forEach(slot => {
        if (!slot || slot.player_id === null) {
            allSlotsValid = false;
        }
        const userId = localStorage.getItem('userId');
        if (slot && slot.player_id === parseInt(userId, 10)) {
            userSlotAssigned = true;
        }
    });

    if (!allSlotsValid) {
        if (readyButton) readyButton.disabled = true;
        return;
    }

    const userItems = userList ? userList.getElementsByTagName('li') : [];
    Array.from(userItems).forEach(item => {
        const userId = parseInt(item.id.replace('user_', '').trim(), 10);
        const currentUserId = parseInt(localStorage.getItem('userId'), 10);
        if (userId === currentUserId && item.innerHTML.includes('✔️')) {
            userIsReady = true;
        }
    });

    if (userSlotAssigned && allSlotsValid && !userIsReady) {
        if (readyButton) readyButton.disabled = false;
    } else {
        if (readyButton) readyButton.disabled = true;
    }
}



function generateBracket(tournament) {
    const bracketContainer = document.getElementById('tournament_bracket');
    bracketContainer.innerHTML = ''; 

    const numPlayers = tournament.nb_players;
    const mode = tournament.mode;

    let numMatches = Math.ceil(numPlayers / 2);
    let totalRounds = Math.ceil(Math.log2(numPlayers));
    let round = 1;
    let matchIndex = 1;
    let winnerIndex = 1;
    let teamIndex = 1;

    while (round <= totalRounds) {
        const roundElement = document.createElement('div');
        roundElement.classList.add('round');
        roundElement.setAttribute('data-round', round);
        
        let roundName = getRoundName(totalRounds, round, mode);
        roundElement.innerHTML = `<div class="round-title">${roundName}</div>`;

        for (let i = 0; i < numMatches; i++) {
            const matchElement = document.createElement('div');
            matchElement.classList.add('match');
            matchElement.dataset.round = round;

            let matchTitle;
            if (round === totalRounds - 1 && mode !== '4dm') {
                matchTitle = `Semifinale ${i + 1}`;
            } else if (round === totalRounds) {
                matchTitle = `Finale`;
            } else {
                matchTitle = `Match ${i + 1}`;
            }

            matchElement.innerHTML = `<div class="match-title">${matchTitle}</div>`;

            let slotHTML;
            if (mode === '1v1') {
                if (round === 1) {
                    slotHTML = `
                        <div class="player-slot first-round" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Player ${i * 2 + 1}</div>
                        <div class="player-slot first-round" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Player ${i * 2 + 2}</div>
                    `;
                } else if (round === totalRounds - 1) {
                    slotHTML = `
                        <div class="player-slot" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Winner Match ${winnerIndex}</div>
                        <div class="player-slot" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Winner Match ${winnerIndex + 1}</div>
                    `;
                    winnerIndex += 2;
                } else if (round === totalRounds) {
                    slotHTML = `
                        <div class="player-slot" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Winner SF 1</div>
                        <div class="player-slot" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Winner SF 2</div>
                    `;
                }
            }
            matchElement.innerHTML += slotHTML;
            roundElement.appendChild(matchElement);
            matchIndex++;
        }

        bracketContainer.appendChild(roundElement);

        if (mode !== '4dm' || round < totalRounds) {
            numMatches = Math.floor(numMatches / 2);
        }
        
        round++;
        winnerIndex = 1;
    }

}

function getRoundName(totalRounds, currentRound, mode) {
    if (mode === '4dm' && currentRound === 2) {
        return 'Final Deathmatch';
    }
    if (currentRound === totalRounds) {
        return 'Final';
    } else if (currentRound === totalRounds - 1) {
        return 'Semifinal';
    } else {
        return `Round ${currentRound}`;
    }
}

function updateAllSlots(roundsSlots) {
    Object.keys(roundsSlots).forEach(roundKey => {
        const slots = roundsSlots[roundKey];
        const roundNumber = roundKey.split('_')[1];

        Object.keys(slots).forEach(slotKey => {
            const slot = slots[slotKey];

            const playerId = slot.player_id;
            const nickname = playerId && userIdToUserMap[playerId]
                ? userIdToUserMap[playerId].nickname
                : 'empty';

            updateSlot(roundNumber, slotKey, { ...slot, nickname });
        });
    });

    checkUserSlotAndReadyState(roundsSlots);
}


function updateSlot(roundNumber, slotKey, slotData) {
    const slotElement = document.querySelector(`.round[data-round="${roundNumber}"] .player-slot[data-slot="${slotKey}"]`);
    if (slotElement) {
        const username = (slotData && typeof slotData.username === 'string') ? slotData.username : null;
        const nickname = getNickname(username);

        if (username && username !== 'empty' && !username.toLowerCase().includes('winner')) {
            slotElement.classList.add('occupied', 'locked');
            slotElement.textContent = nickname;
            slotElement.style.pointerEvents = 'none';
        } else {
            slotElement.classList.remove('occupied', 'locked');
            slotElement.textContent = `Player ${slotKey}`;
            slotElement.style.pointerEvents = '';
        }
    } else {
        console.error(`Slot element not found for round ${roundNumber}, slot ${slotKey}. Verify HTML structure.`);
    }
}


function setupSlotSelection(currentUser) {
    const playerSlots = document.querySelectorAll('.player-slot.first-round');
    const readyButton = document.getElementById('ready');
    const currentUserNickname = Object.values(userIdToUserMap).find(user => user.username === currentUser)?.nickname || currentUser;

    playerSlots.forEach(slot => {
        const oldSlotClickHandler = slot.dataset.listenerAdded;
        if (oldSlotClickHandler === 'true') {
            return;
        }
        slot.dataset.listenerAdded = 'true';
        slot.addEventListener('click', function () {
            const alreadyOccupiedSlot = Array.from(playerSlots).find(
                s => s.textContent.trim() === currentUserNickname && s !== this
            );
            if (alreadyOccupiedSlot) {
                alert('You already occupy a slot. You cannot select another one.');
                return;
            }
            if (slotSelectionLocked) {
                return;
            }
            if (this.classList.contains('occupied') && this.textContent !== currentUserNickname || this.classList.contains('locked')) {
                return;
            }

            if (confirm('Are you sure you want this slot? Once confirmed, you cannot change it.')) {
                setTimeout(() => {
                    if (this.classList.contains('occupied') && this.textContent !== currentUser) {
                        return;
                    }
                    updateSlotOnServer('assign_slot', this.dataset.slot, currentUser);
                    lockAllSlots(playerSlots);
                    if (readyButton) readyButton.disabled = false;
                    slotSelectionLocked = true;
                }, 100);
            }
        });
    });
}




function lockAllSlots(slots) {
    slots.forEach(slot => {
        slot.classList.add('locked');
        slot.style.pointerEvents = 'none';
    });
}


function updateSlotOnServer(action, slot, username) {
    const player_id = localStorage.getItem('userId');
    const data = {
        action: action,
        slot: slot,
        username: username,
        player_id: player_id,
    };
    LobbySocket.send(JSON.stringify(data));
}

function updateUserList(users, slots, readyStatus) {
    const userList = document.getElementById('users_in_lobby');
    userList.innerHTML = '';

    let allReady = true;

    users.forEach(user => {
        let userSlot = null;
        for (let slot in slots) {
            if (slots[slot].username === user.username) {
                userSlot = slot;
                break;
            }
        }

        const nickname = getNickname(user.username);

        let isReady = false;
        if (userSlot && readyStatus[userSlot]) {
            isReady = readyStatus[userSlot];
        }

        if (!isReady) {
            allReady = false;
        }

        const readyIcon = isReady ? '✔️' : '';

        userList.insertAdjacentHTML('beforeend', `<li id="user_${user.username}">${nickname} ${readyIcon}</li>`);
    });

    const leaveButton = document.getElementById('leave_button');
    if (leaveButton) {
        leaveButton.disabled = allReady ? true : false;
    }
}


var form_lobby = document.getElementById('lobby_form');
form_lobby.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = {
        action: 'chat_message',
        username: username_lobby,
        message: e.target.message.value
    };
    LobbySocket.send(JSON.stringify(message));
    form_lobby.reset();
});

var readyButton = document.getElementById('ready');
if (readyButton !== null) {
    readyButton.addEventListener('click', (e) => {
        let userSlot = null;
        let maxRoundNumber = -1;

        const userNickname = getNickname(username_lobby);
        const rounds = document.querySelectorAll('.round[data-round]');
        if (!rounds.length) {
            return;
        }

        rounds.forEach(round => {
            const roundNumber = parseInt(round.dataset.round, 10);
            const playerSlots = round.querySelectorAll('.player-slot');

            playerSlots.forEach(slot => {
                if (slot.classList.contains('occupied') && slot.textContent === userNickname && roundNumber > maxRoundNumber) {
                    userSlot = slot.dataset.slot;
                    maxRoundNumber = roundNumber;
                }
            });
        });
        if (!userSlot) {
            return;
        }

        if (confirm('Do you wanna confirm that you are ready? You will not be able to change this.')) {
            const message = {
                action: 'player_ready',
                slot: userSlot,
                username: username_lobby,
                userId: userId_lobby,
                status: true
            };
            LobbySocket.send(JSON.stringify(message));
            readyButton.disabled = true;
        }
    });
}




var leaveButton = document.getElementById('leave');
if (leaveButton) {
    leaveButton.addEventListener('click', async (e) => {
        e.preventDefault();
        reactivateDashboard();
        await leaveLobby();
    });
}


async function leaveLobby(isMe = false) {
    let accessToken = localStorage.getItem("accessToken");

    async function checkTokenValidity() {
        try {
            const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
                method: "GET"
            });
            const data = await response.json();

            if (data.message === 'Token valido') {
                return accessToken;
            } else if (data.message === 'Token non valido') {
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    localStorage.setItem("accessToken", newAccessToken);
                    return newAccessToken;
                } else {
                    throw new Error("Token non valido e impossibile da rinfrescare");
                }
            } else {
                throw new Error("Errore durante la verifica del token");
            }
        } catch (error) {
            console.error('Errore durante la verifica del token:', error);
            loadPage("/api/login/");
        }
    }

    async function refreshAccessToken() {
        try {
            const response = await fetch(`${window.location.origin}/api/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: accessToken })
            });
            if (response.ok) {
                const data = await response.json();
                return data.access;
            } else {
                throw new Error("Impossibile rinfrescare il token");
            }
        } catch (error) {
            console.error("Errore durante il refresh del token:", error);
            return null;
        }
    }

    try {
        accessToken = await checkTokenValidity();

        const response = await fetch(`/api/tournament_lobby/${round_id_lobby}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ action: 'leave' })
        });

        if (response.ok) {
            LobbySocket.send(JSON.stringify({ action: 'leave', username: username_lobby }));
            LobbySocket.close();
            loadPage('/api/tournaments/');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }
    } catch (error) {
        console.error('Errore durante la richiesta di uscita:', error);
    }
}

function updateReadyStatusInUserList(slots, readyStatus) {
    if (!slots || Object.keys(slots).length === 0) {
        console.error("No slots data available");
        return;
    }

    const userList = document.getElementById('users_in_lobby');
    const userItems = userList.getElementsByTagName('li');
    const currentUser = username_lobby;

    Array.from(userItems).forEach(item => {
        const username = item.id.replace('user_', '');
        const nickname = getNickname(username);

        const slotKey = Object.keys(slots).find(key => {
            const slot = slots[key];
            const user = userIdToUserMap[slot.player_id];
            return user && user.username === username;
        });

        if (slotKey) {
            const isReady = readyStatus[slotKey];
            item.innerHTML = `${nickname} ${isReady ? '✔️' : ''}`;
        } else {
            item.innerHTML = nickname;
        }
    });

    const readyButton = document.getElementById('ready');
    if (readyButton) {
        const currentUserSlot = Object.keys(slots).find(slotKey => {
            const slot = slots[slotKey];
            const currentUserId = Object.keys(userIdToUserMap).find(id => userIdToUserMap[id].username === currentUser);
            return slot.player_id === parseInt(currentUserId);
        });

        if (currentUserSlot) {
            const isReady = readyStatus[currentUserSlot] || false;
            readyButton.disabled = isReady;
        } else {
            readyButton.disabled = true;
        }
    }

    const allSlotsHavePlayer = Object.keys(slots).every(slotKey => slots[slotKey].player_id);

    const allReady = Object.keys(readyStatus).every(slotKey => readyStatus[slotKey]);

    if (!allSlotsHavePlayer || !allReady) {
        return;
    }

    const tournamentOwner = document.getElementById('tournament-data').dataset.owner;
    const startButton = document.getElementById('start');
    const activeUserIds = Object.values(slots)
        .map(slot => slot.player_id)
        .filter(playerId => playerId !== null);

    if (startButton) {
        const ownerInGame = activeUserIds.includes(parseInt(tournamentOwner));
        if (ownerInGame) {
            startTournamentLogic();
        } else {
            startTournamentLogic();
        }
    }
}



function disableAllButtonsButLeave() {
    const readyButton = document.querySelector('.lobby-ready');
    const leaveButton = document.querySelector('.lobby-leave');
    if (readyButton) readyButton.disabled = true;
    if (leaveButton) leaveButton.disabled = false;
    
    const startTournamentButton = document.querySelector('.start-tournament');
    if (startTournamentButton) {
        startTournamentButton.disabled = true;
    }
}


function disableButtonsAndSlots(playersToBlock) {
    const userId = Number(localStorage.getItem('userId'));
    const readyButton = document.querySelector('.lobby-ready');
    const leaveButton = document.querySelector('.lobby-leave');

    if (!playersToBlock.includes(userId)) {
        if (leaveButton) leaveButton.disabled = false;
        return;
    }
    if (readyButton) readyButton.disabled = true;
    if (leaveButton) leaveButton.disabled = true;
}

var startTournament = document.getElementById("start");
if (startTournament) {
    startTournament.addEventListener('click', (e) => {
        e.preventDefault();
        startTournamentLogic();
    });
}


function startTournamentLogic() {
    const startTournament = document.getElementById("start");
    const leaveTournament = document.getElementById("leave");
    if (startTournament) startTournament.disabled = true;
    if (leaveTournament) leaveTournament.disabled = true;

    LobbySocket.send(JSON.stringify({
        action: 'start_tournament_preparation'
    }));
}

function startTournamentCountdown() {
	countdownActive = true;
    let countdown = 10;
    countdownInterval = setInterval(function () {
        countdown--;

        const message = {
            action: 'chat_message',
            username: 'SYSTEM',
            message: `Round starting in ${countdown} seconds...`
        };
        LobbySocket.send(JSON.stringify(message));

        if (countdown <= 0) {
            clearInterval(countdownInterval);
			countdownActive = false;
			countdownInterval = null;

            LobbySocket.send(JSON.stringify({
                action: 'countdown_complete'
            }));
        }
    }, 1000);
}


function showJoinGamePopup(gameLink) {

    const readyButton = document.querySelector('.lobby-ready');
    const leaveButton = document.querySelector('.lobby-leave');
    if (readyButton) readyButton.disabled = true; 
    if (leaveButton) leaveButton.disabled = true;

    const existingPopup = document.querySelector('.popup');
    if (existingPopup) {
        return;
    }


    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Game is ready!</h2>
            <p>Your game is about to start. Click below to join.</p>
            <button id="join-game-btn" class="btn btn-primary">Join Game</button>
        </div>
    `;

    const container = document.getElementById('main-container');
    container.appendChild(popup);

    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#fff';
    popup.style.padding = '20px';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '9999';

    document.getElementById('join-game-btn').addEventListener('click', function() {

        LobbySocket.send(JSON.stringify({
            action: 'player_joined_game',
            userId: userId_lobby
        }));

        container.removeChild(popup);
        reactivateDashboard();
        loadPage(gameLink);
    });
}

function showWinnerPopup(winner) {

    if (document.querySelector('.popup')) {
        return;
    }

    const winnerNickname = getNickname(winner.username);

    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Congratulations!</h2>
            <p>The tournament has concluded.</p>
            <h3>Winner: ${winnerNickname}</h3>
            <button id="close-popup-btn" class="btn btn-primary">Close</button>
        </div>
    `;

    const container = document.getElementById('main-container');
    if (!container) {
        console.error("Main container not found. Popup cannot be displayed.");
        return;
    }
    container.appendChild(popup);

    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#fff';
    popup.style.padding = '20px';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '9999';
    popup.style.textAlign = 'center';

    document.getElementById('close-popup-btn').addEventListener('click', function() {
        container.removeChild(popup);
    });
}


