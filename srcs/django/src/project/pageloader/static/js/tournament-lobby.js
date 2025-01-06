var urlPathLobby = window.location.pathname;
var round_id_lobby = urlPathLobby.split('/').filter(part => part !== '').pop();
var userId_lobby = localStorage.getItem('userId');
var username_lobby = localStorage.getItem('username');
var slotSelectionLocked = false;
var lobby = `wss://${window.location.host}/wss/tournament/${round_id_lobby}/?id=${userId_lobby}`;
var LobbySocket = new WebSocket(lobby);

var usernameToNicknameMap = {};
var countdownActive = false;
var countdownInterval = null;

function initializeNicknameMapFromTemplate() {
    const nicknameElement = document.getElementById('user-nicknames');
    if (nicknameElement) {
        try {
            const nicknamesArray = JSON.parse(nicknameElement.dataset.nicknames);

            nicknamesArray.forEach(entry => {
                usernameToNicknameMap[entry.username] = entry.nickname;
            });

        } catch (error) {
            console.error("Error parsing nickname data:", error);
        }
    }
}

onPageLoad();

LobbySocket.onopen = function(e) {
	console.log("Ciao")
    LobbySocket.send(JSON.stringify({ action: "join", round_id_lobby: round_id_lobby, username: username_lobby }));
};

LobbySocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
	console.log("Action:", data);

    switch (data.type) {
        case 'chat_message':
            let messages = document.getElementById('lobby_messages');
            messages.insertAdjacentHTML('afterbegin', `<div class="d-flex justify-content-start"><strong>${data.username}:</strong><p>${data.message}</p></div>`);
            break;
        case 'update_all_slots':
            updateAllSlots(data.slots);
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
            }, 500);
            break;
        case 'start_countdown':
            if (data.authorized_client === username_lobby) {
                // Solo il client autorizzato esegue il countdown
                startTournamentCountdown();
            }
            break;
        case 'disconnected':
            if (data.authorized === 'false') {
                // Interrompi il countdown solo se l'utente non è autorizzato
                console.log("Countdown interrupted: unauthorized user disconnected.");
                clearInterval(countdownInterval);
                countdownInterval = null; // Resetta la variabile
                let leaveButton = document.querySelector('.lobby-leave');
                console.log(leaveButton);
                if (leaveButton) leaveButton.disabled = false;
            }
            break;
        default:
            break;
    }
};

// Gestione degli errori del WebSocket
LobbySocket.onerror = function(e) {
    console.error('WebSocket error:', e);
};

LobbySocket.onclose = function(e) {

};

// Funzione di inizializzazione della pagina della lobby
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
    setupSlotSelection(tournament, currentUser);

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
    let allSlotsValid = true; // Flag per verificare se tutti gli slot sono validi

    // Verifica che roundsSlots sia definito e non vuoto
    if (!roundsSlots || Object.keys(roundsSlots).length === 0) {
        console.error("No rounds available in roundsSlots.");
        readyButton.disabled = true;
        return;
    }

    // Determina il round massimo
    const roundKeys = Object.keys(roundsSlots).filter(key => roundsSlots[key]); // Filtra solo i round definiti
    const maxRoundKey = roundKeys.reduce((max, key) => {
        const roundNumber = parseInt(key.split('_')[1], 10);
        return (!max || roundNumber > parseInt(max.split('_')[1], 10)) ? key : max;
    }, null);

    if (!maxRoundKey) {
        console.error("No valid round found in roundsSlots.");
        readyButton.disabled = true;
        return;
    }


    // Recupera gli slot del round massimo
    const maxRoundSlots = roundsSlots[maxRoundKey];
    if (!maxRoundSlots || Object.keys(maxRoundSlots).length === 0) {
        console.error(`No slots available for max round: ${maxRoundKey}`);
        readyButton.disabled = true;
        return;
    }

    // Verifica se tutti gli slot del round massimo sono validi
    Object.values(maxRoundSlots).forEach(slot => {
        if (!slot || slot.username === 'empty' || slot.player_id === null) {
            allSlotsValid = false; // Se uno slot non è valido, flagga come non valido
        }
        if (slot && slot.username === username_lobby) {
            userSlotAssigned = true;
        }
    });

    // Se non tutti gli slot sono validi, disabilita il pulsante "Ready"
    if (!allSlotsValid) {
        console.warn("Not all slots in the max round are valid.");
        readyButton.disabled = true;
        return;
    }

    // Verifica lo stato "ready" dell'utente nella lista
    const userItems = userList ? userList.getElementsByTagName('li') : [];
    Array.from(userItems).forEach(item => {
        const username = item.id.replace('user_', '').trim();
        if (username === username_lobby && item.innerHTML.includes('✔️')) {
            userIsReady = true;
        }
    });

    // Abilita il pulsante "Ready" solo se l'utente ha uno slot assegnato, tutti gli slot sono validi, e non è già pronto
    if (userSlotAssigned && allSlotsValid && !userIsReady) {
        readyButton.disabled = false;
    } else {
        readyButton.disabled = true;
    }
}





// Funzione per generare il tabellone del torneo
function generateBracket(tournament) {
    const bracketContainer = document.getElementById('tournament_bracket');
    bracketContainer.innerHTML = ''; 

    const numPlayers = tournament.nb_players;
    const mode = tournament.mode;

    let numMatches;
    let totalRounds;

    // Calcoliamo il numero di partite iniziali e i round totali in base alla modalità e al numero di giocatori
    if (mode === '1v1') {
        numMatches = Math.ceil(numPlayers / 2); // 2 giocatori per match
        totalRounds = Math.ceil(Math.log2(numPlayers)); // Numero totale di round basato sul numero di giocatori
    } else if (mode === '2v2') {
        numMatches = Math.ceil(numPlayers / 4); // 4 giocatori per match (2 team)
        totalRounds = Math.ceil(Math.log2(numMatches * 2)); // Calcolo corretto per i round
    } else if (mode === '4dm') {
        numMatches = 4; // 4 match iniziali per il deathmatch
        totalRounds = 2; // Solo due round: semifinale e finale
    }

    let round = 1;
    let matchIndex = 1; // Tiene traccia del numero del match iniziale
    let winnerIndex = 1; // Tiene traccia del numero del match vincente nel round successivo
    let teamIndex = 1; // Tiene traccia del numero del team progressivo

    while (round <= totalRounds) {
        const roundElement = document.createElement('div');
        roundElement.classList.add('round');
        roundElement.setAttribute('data-round', round);
        
        // Genera il titolo del round (es. "Semifinali", "Finale")
        let roundName = getRoundName(totalRounds, round, mode);
        roundElement.innerHTML = `<div class="round-title">${roundName}</div>`;

        for (let i = 0; i < numMatches; i++) {
            const matchElement = document.createElement('div');
            matchElement.classList.add('match');
            matchElement.dataset.round = round;

            // Verifica se siamo in semifinale o finale per mostrare i nomi corretti
            let matchTitle;
            if (round === totalRounds - 1 && mode !== '4dm') {
                matchTitle = `Semifinale ${i + 1}`; // Semifinali
            } else if (round === totalRounds) {
                matchTitle = `Finale`; // Finale (solo uno)
            } else {
                matchTitle = `Match ${i + 1}`; // Altri round iniziali
            }

            matchElement.innerHTML = `<div class="match-title">${matchTitle}</div>`;

            let slotHTML;
            if (mode === '1v1') {
                // Modalità 1v1: 2 giocatori per match
                if (round === 1) {
                    slotHTML = `
                        <div class="player-slot first-round" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Player ${i * 2 + 1}</div>
                        <div class="player-slot first-round" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Player ${i * 2 + 2}</div>
                    `;
                } else if (round === totalRounds - 1) {
                    // Semifinali: usiamo "Winner Match X"
                    slotHTML = `
                        <div class="player-slot" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Winner Match ${winnerIndex}</div>
                        <div class="player-slot" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Winner Match ${winnerIndex + 1}</div>
                    `;
                    winnerIndex += 2;
                } else if (round === totalRounds) {
                    // Finale: usiamo "Winner Semifinale X"
                    slotHTML = `
                        <div class="player-slot" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Winner SF 1</div>
                        <div class="player-slot" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Winner SF 2</div>
                    `;
                }
            } else if (mode === '2v2') {
                // Modalità 2v2: 2 team per match
                if (round === 1) {
                    // Generazione dei team con nomi progressivi
                    slotHTML = `
                        <div class="team-slot" data-slot="${i * 4 + 1}" data-match="${matchIndex}">Team ${teamIndex} - Player 1</div>
                        <div class="team-slot" data-slot="${i * 4 + 2}" data-match="${matchIndex}">Team ${teamIndex} - Player 2</div>
                        <div class="team-slot" data-slot="${i * 4 + 3}" data-match="${matchIndex}">Team ${teamIndex + 1} - Player 1</div>
                        <div class="team-slot" data-slot="${i * 4 + 4}" data-match="${matchIndex}">Team ${teamIndex + 1} - Player 2</div>
                    `;
                    teamIndex += 2; // Incrementa il numero del team progressivo
                } else if (round === totalRounds - 1) {
                    // Semifinali: usiamo "Winner Match X"
                    slotHTML = `
                        <div class="team-slot" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Winner Match ${winnerIndex} P.1</div>
                        <div class="team-slot" data-slot="${i * 2 + 1}" data-match="${matchIndex}">Winner Match ${winnerIndex} P.2</div>
                        <div class="team-slot" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Winner Match ${winnerIndex + 1} P.1</div>
                        <div class="team-slot" data-slot="${i * 2 + 2}" data-match="${matchIndex}">Winner Match ${winnerIndex + 1} P.2</div>
                    `;
                    winnerIndex += 2;
                } else if (round === totalRounds) {
                    // Finale: un solo match con i vincitori delle semifinali
                    slotHTML = `
                        <div class="team-slot" data-slot="1" data-match="${matchIndex}">Winner SF 1 - P.1</div>
                        <div class="team-slot" data-slot="2" data-match="${matchIndex}">Winner SF 1 - P.2</div>
                        <div class="team-slot" data-slot="3" data-match="${matchIndex}">Winner SF 2 - P.1</div>
                        <div class="team-slot" data-slot="4" data-match="${matchIndex}">Winner SF 2 - P.2</div>
                    `;
                }
            } else if (mode === '4dm') {
                // Modalità deathmatch: 4 giocatori per match
                if (round === 1) {
                    slotHTML = `
                        <div class="player-slot first-round" data-slot="${i * 4 + 1}" data-match="${matchIndex}">Player ${i * 4 + 1}</div>
                        <div class="player-slot first-round" data-slot="${i * 4 + 2}" data-match="${matchIndex}">Player ${i * 4 + 2}</div>
                        <div class="player-slot first-round" data-slot="${i * 4 + 3}" data-match="${matchIndex}">Player ${i * 4 + 3}</div>
                        <div class="player-slot first-round" data-slot="${i * 4 + 4}" data-match="${matchIndex}">Player ${i * 4 + 4}</div>
                    `;
                } else if (round === totalRounds) {
                    // Finale deathmatch: un solo match con i vincitori dei 4 match del primo round
                    slotHTML = `
                        <div class="player-slot" data-slot="1" data-match="${matchIndex}">Winner Match 1</div>
                        <div class="player-slot" data-slot="2" data-match="${matchIndex}">Winner Match 2</div>
                        <div class="player-slot" data-slot="3" data-match="${matchIndex}">Winner Match 3</div>
                        <div class="player-slot" data-slot="4" data-match="${matchIndex}">Winner Match 4</div>
                    `;
                    // Assicuriamoci che ci sia solo una finale
                    numMatches = 0; 
                }
            }

            matchElement.innerHTML += slotHTML; // Aggiunge i giocatori al match
            roundElement.appendChild(matchElement);
            matchIndex++; // Aggiorna il numero del match
        }

        bracketContainer.appendChild(roundElement);

        // Riduci il numero di match per i round successivi, tranne che per il deathmatch nel round finale
        if (mode !== '4dm' || round < totalRounds) {
            numMatches = Math.floor(numMatches / 2);
        }
        
        round++;
        winnerIndex = 1; // Reset dell'indice dei vincitori per il prossimo round
    }

}

// Funzione per ottenere il nome del round
function getRoundName(totalRounds, currentRound, mode) {
    if (mode === '4dm' && currentRound === 2) {
        return 'Final Deathmatch'; // Finale deathmatch specifica
    }
    if (currentRound === totalRounds) {
        return 'Final';
    } else if (currentRound === totalRounds - 1) {
        return 'Semifinal';
    } else {
        return `Round ${currentRound}`;
    }
}

// Funzione per aggiornare tutti gli slot di più round
function updateAllSlots(roundsSlots) {

    // Itera su ogni round
    Object.keys(roundsSlots).forEach(roundKey => {
        const slots = roundsSlots[roundKey];
        const roundNumber = roundKey.split('_')[1]; // Estrae il numero del round


        // Itera su ogni slot del round
        Object.keys(slots).forEach(slotKey => {
            updateSlot(roundNumber, slotKey, slots[slotKey]);
        });
    });

    // Controlla lo stato dello slot e aggiorna il pulsante Ready
    checkUserSlotAndReadyState(roundsSlots);
}


// Funzione per aggiornare un singolo slot
function updateSlot(roundNumber, slotKey, slotData) {
    const slotElement = document.querySelector(`.round[data-round="${roundNumber}"] .player-slot[data-slot="${slotKey}"]`);
    if (slotElement) {
        // Verifica se slotData e username sono validi
        const username = (slotData && typeof slotData.username === 'string') ? slotData.username : null;
        const nickname = usernameToNicknameMap[username] || username;

        if (username && username !== 'empty' && !username.toLowerCase().includes('winner')) {
            // Se c'è un utente nello slot, aggiorna l'username e blocca lo slot
            slotElement.classList.add('occupied', 'locked');
            slotElement.textContent = nickname;
            slotElement.style.pointerEvents = 'none'; // Disabilita ulteriori clic
        } else {
            // Se lo slot è vuoto, ripristina lo stato predefinito
            slotElement.classList.remove('occupied', 'locked');
            slotElement.textContent = `Player ${slotKey}`;
            slotElement.style.pointerEvents = ''; // Riabilita i clic
        }
    } else {
        console.error(`Slot element not found for round ${roundNumber}, slot ${slotKey}. Verify HTML structure.`);
    }
}





// Funzione per impostare la selezione degli slot
function setupSlotSelection(tournament, currentUser) {
    const playerSlots = document.querySelectorAll('.player-slot.first-round');
    const readyButton = document.getElementById('ready');

    playerSlots.forEach(slot => {
        slot.addEventListener('click', function () {
            if (slotSelectionLocked) {
                return;
            }
            // Se lo slot è già occupato da un altro utente o è bloccato, non fare nulla
            if (this.classList.contains('occupied') && this.textContent !== currentUser || this.classList.contains('locked')) {
                return;
            }

            // Chiedi conferma all'utente prima di bloccare lo slot
            if (confirm('Vuoi davvero occupare questo slot? Una volta confermato non potrai più cambiarlo.')) {
                // Invia il messaggio al server tramite WebSocket
                updateSlotOnServer('assign_slot', this.dataset.slot, currentUser);

                // Blocca tutti gli slot per evitare ulteriori modifiche
                lockAllSlots(playerSlots);

                // Abilita il pulsante ready dopo la selezione dello slot
                readyButton.disabled = false;
                // Imposta la variabile per indicare che la selezione è bloccata
                slotSelectionLocked = true;
            }
        });
    });
}


// Funzione per bloccare tutti gli slot una volta che un utente ha confermato la scelta
function lockAllSlots(slots) {
    slots.forEach(slot => {
        // Aggiungi la classe 'locked' per indicare che lo slot è bloccato
        slot.classList.add('locked');
        // Disabilita gli eventi click su tutti gli slot
        slot.style.pointerEvents = 'none';
    });
}


// Funzione per aggiornare lo stato dello slot sul server
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


// Funzione per aggiornare la lista degli utenti nella lobby
function updateUserList(users, slots, readyStatus) {
    const userList = document.getElementById('users_in_lobby');
    userList.innerHTML = '';

    let allReady = true; // Variabile per verificare se tutti i giocatori sono ready

    users.forEach(user => {
        // Trova lo slot associato all'utente
        let userSlot = null;
        for (let slot in slots) {
            if (slots[slot].username === user.username) {
                userSlot = slot;
                break;
            }
        }

        const nickname = usernameToNicknameMap[user.username] || user.username;

        // Controlla se l'utente è ready
        let isReady = false;
        if (userSlot && readyStatus[userSlot]) {
            isReady = readyStatus[userSlot]; // true o false
        }

        // Aggiorna lo stato "allReady" se uno degli utenti non è pronto
        if (!isReady) {
            allReady = false;
        }

        const readyIcon = isReady ? '✔️' : ''; // Aggiungi l'icona se l'utente è pronto

        // Aggiungi l'utente alla lista con l'icona ready se applicabile
        userList.insertAdjacentHTML('beforeend', `<li id="user_${user.username}">${nickname} ${readyIcon}</li>`);
    });

    // Aggiorna lo stato del pulsante "leave"
    const leaveButton = document.getElementById('leave_button');
    if (leaveButton) {
        leaveButton.disabled = allReady ? true : false; // Disabilita se tutti sono ready, altrimenti abilita
    }
}




// Gestione dell'invio dei messaggi in chat
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

// Gestione del pulsante di pronto (ready)
var readyButton = document.getElementById('ready');
if (readyButton !== null) {
    readyButton.addEventListener('click', (e) => {
        // Trova lo slot assegnato all'utente nel round più alto
        let userSlot = null;
        let maxRoundNumber = -1;

        const userNickname = usernameToNicknameMap[username_lobby];
        // Trova tutti i round nel DOM
        const rounds = document.querySelectorAll('.round[data-round]');
        if (!rounds.length) {
            console.error('No rounds found');
            return;
        }

        rounds.forEach(round => {
            const roundNumber = parseInt(round.dataset.round, 10);
            const playerSlots = round.querySelectorAll('.player-slot');

            playerSlots.forEach(slot => {
                if (slot.classList.contains('occupied') && slot.textContent === userNickname && roundNumber > maxRoundNumber) {
                    userSlot = slot.dataset.slot;
                    maxRoundNumber = roundNumber; // Aggiorna il round maggiore trovato
                }
            });
        });

        if (!userSlot) {
            console.error('No slot assigned to user');
            return;
        }

        // Chiedi conferma prima di impostare lo stato ready
        if (confirm('Vuoi confermare di essere pronto? Una volta confermato, non potrai più cambiare lo stato.')) {
            // Invia il cambio di stato ready
            const message = {
                action: 'player_ready',
                slot: userSlot, // Slot corretto trovato
                username: username_lobby,
                status: readyButton.textContent === 'Ready' ? 'ready' : 'not_ready'
            };
            LobbySocket.send(JSON.stringify(message));

            // Blocca il pulsante ready per evitare ulteriori modifiche
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

    // Funzione per verificare la validità del token
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
            loadPage("/api/login/"); // Reindirizza alla pagina di login
        }
    }

    // Funzione per rinfrescare il token
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
        // Verifica e ottieni un token valido
        accessToken = await checkTokenValidity();

        // Effettua la richiesta solo se il token è valido
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


    // Aggiorna la lista utenti con lo stato "ready"
    Array.from(userItems).forEach(item => {
        const username = item.id.replace('user_', '');
        const nickname = usernameToNicknameMap[username] || username;
        const slotKey = Object.keys(slots).find(key => slots[key].username === username);

        if (slotKey && readyStatus[slotKey] !== undefined) {
            item.innerHTML = `${nickname} ${readyStatus[slotKey] ? '✔️' : ''}`;
        } else {
            item.innerHTML = nickname; // Nessuno slot assegnato o dati mancanti
        }
    });

    // Aggiorna il pulsante "Ready" per l'utente corrente
    const readyButton = document.getElementById('ready');
    if (readyButton) {
        const currentUserSlot = Object.keys(slots).find(slotKey => slots[slotKey].username === currentUser);
        readyButton.disabled = currentUserSlot ? readyStatus[currentUserSlot] || false : true;
    }

    // Controlla se tutti gli slot hanno player_id valido
    const allSlotsHavePlayer = Object.keys(slots).every(slotKey => slots[slotKey].player_id);

    // Controlla se tutti i ready status sono true
    const allReady = Object.keys(readyStatus).every(slotKey => readyStatus[slotKey]);

    if (!allSlotsHavePlayer || !allReady) {
        console.warn("Conditions not met: Not all slots have player_id or not all ready statuses are true.");
        return; // Termina se le condizioni non sono soddisfatte
    }

    // Verifica se l'owner è attivo e avvia il torneo se necessario
    const tournamentOwner = document.getElementById('tournament-data').dataset.owner;
    const startButton = document.getElementById('start');
    const activeUsernames = Object.values(slots)
        .map(slot => slot.username)
        .filter(username => username !== "empty");

    if (startButton) {
        const ownerInGame = activeUsernames.includes(tournamentOwner);
        if (ownerInGame) {
            // startButton.disabled = false;
            startTournamentLogic();
        } else {
            console.warn("Owner not in game. Automatically triggering start logic.");
            startTournamentLogic();
        }
    }
}



function disableAllButtonsButLeave() {
    // Disabilita tutti i pulsanti ready, leave e start tournament
    // Blocca visivamente lo slot
    const readyButton = document.querySelector('.lobby-ready');
    const leaveButton = document.querySelector('.lobby-leave');
    if (readyButton) readyButton.disabled = true; // Disabilita il pulsante Ready
    if (leaveButton) leaveButton.disabled = false; // Abilita il pulsante Leave
    

    // Disabilita anche il pulsante "Start Tournament" se presente
    const startTournamentButton = document.querySelector('.start-tournament');
    if (startTournamentButton) {
        startTournamentButton.disabled = true;
    }
}


function disableButtonsAndSlots(playersToBlock) {
    // Recupera userId dal localStorage
    const userId = Number(localStorage.getItem('userId')); // Assumi che l'ID sia memorizzato come stringa numerica

    const readyButton = document.querySelector('.lobby-ready');
    const leaveButton = document.querySelector('.lobby-leave');

    if (!playersToBlock.includes(userId)) {
        // Se l'userId non è tra quelli da bloccare, esci dalla funzione
        if (leaveButton) leaveButton.disabled = false;
        return;
    }

    if (readyButton) readyButton.disabled = true;
    if (leaveButton) leaveButton.disabled = true;
    
}

// Listener per il pulsante "Start Round"
var startTournament = document.getElementById("start");
if (startTournament) {
    startTournament.addEventListener('click', (e) => {
        e.preventDefault();
        startTournamentLogic(); // Richiama la funzione incapsulata
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
        console.log('Popup already exists. Skipping creation.');
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
            username: username_lobby
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

    const winnerNickname = usernameToNicknameMap[winner.username] || winner.username;

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


