// Inizializzazione delle variabili
var urlPathLobby = window.location.pathname;
var round_id_lobby = urlPathLobby.split('/').filter(part => part !== '').pop();
var userId_lobby = localStorage.getItem('userId');
var username_lobby = localStorage.getItem('username');
var slotSelectionLocked = false;
// Configurazione del WebSocket
var lobby = `wss://${window.location.host}/wss/tournament/${round_id_lobby}/?id=${userId_lobby}`;
var LobbySocket = new WebSocket(lobby);


onPageLoad();

// Gestione dell'apertura del WebSocket
LobbySocket.onopen = function(e) {
    console.log('WebSocket connection opened');
    LobbySocket.send(JSON.stringify({ action: "join", round_id_lobby: round_id_lobby, username: username_lobby }));
};

// Gestione dei messaggi ricevuti dal WebSocket
LobbySocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    console.log("received data:", data);

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
        case 'update_team':
            updateTeamSlots(data);
            updateUserList(data.users);
            break;
        case 'update_lobby':
            updateUserList(data.user_list,data.slots, data.ready_status);
            break;
        case 'block_slots':
            console.log("Blocking slots and disabling buttons");
            disableButtonsAndSlots();
            break;
        case 'join_game_notification':
            console.log("Join game notification received");
            showJoinGamePopup(data.game_link);
            break;
        case 'tournament_finished':
            console.log("Tournament finished!");
            showWinnerPopup(data.winner);
            break;
        default:
            console.log("Unrecognized action:", data.type);
            break;
    }
};

// Gestione degli errori del WebSocket
LobbySocket.onerror = function(e) {
    console.error('WebSocket error:', e);
};

// Gestione della chiusura del WebSocket
LobbySocket.onclose = function(e) {
    console.log('WebSocket connection closed:', e);
};

// Funzione di inizializzazione della pagina della lobby
function onPageLoad() {
    console.log("Pagina lobby torneo caricata");
    const tournamentDataElement = document.getElementById('tournament-data');
    const roundsDataElement = document.getElementById('rounds-data');
    const currentUserElement = document.getElementById('current-user');
    
    const tournament = {
        mode: tournamentDataElement.dataset.mode,
        nb_players: parseInt(tournamentDataElement.dataset.nbPlayers, 10),
        rounds: JSON.parse(roundsDataElement.textContent.trim())
    };
    const currentUser = currentUserElement.dataset.username;

    console.log('Tournament data:', tournament);
    console.log('Current user:', currentUser);

    generateBracket(tournament);
    setupSlotSelection(tournament, currentUser);
    // necessaria per il ready se si esce e si rientra nella lobby
    checkUserSlotAndReadyState();
}

function checkUserSlotAndReadyState() {
    const slots = document.querySelectorAll('.player-slot');
    const readyButton = document.getElementById('ready');
    let userSlotAssigned = false;
    let userIsReady = false;

    slots.forEach(slot => {
        // Controlla se lo slot è occupato dall'utente
        if (slot.classList.contains('occupied') && slot.textContent === username_lobby) {
            userSlotAssigned = true;
        }
    });

    // Verifica lo stato ready dell'utente
    const userList = document.getElementById('users_in_lobby');
    const userItems = userList.getElementsByTagName('li');
    
    Array.from(userItems).forEach(item => {
        const username = item.id.replace('user_', '');
        if (username === username_lobby && item.innerHTML.includes('✔️')) {
            userIsReady = true;
        }
    });

    // Abilita il pulsante "Ready" solo se l'utente ha uno slot assegnato e non è già pronto
    if (userSlotAssigned && !userIsReady) {
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
        console.log(`Generating round ${round}`); 
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

    console.log('Bracket generated');
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
    console.log('Updating all slots for rounds:', roundsSlots);

    // Itera su ogni round
    Object.keys(roundsSlots).forEach(roundKey => {
        const slots = roundsSlots[roundKey];
        const roundNumber = roundKey.split('_')[1]; // Estrae il numero del round

        console.log(`Updating slots for round ${roundNumber}:`, slots);

        // Itera su ogni slot del round
        Object.keys(slots).forEach(slotKey => {
            updateSlot(roundNumber, slotKey, slots[slotKey]);
        });
    });

    // Controlla lo stato dello slot e aggiorna il pulsante Ready
    checkUserSlotAndReadyState();
}


// Funzione per aggiornare un singolo slot
function updateSlot(roundNumber, slotKey, slotData) {
    const slotElement = document.querySelector(`.round[data-round="${roundNumber}"] .player-slot[data-slot="${slotKey}"]`);
    if (slotElement) {
        if (slotData && slotData.username !== 'empty') {
            // Se c'è un utente nello slot, aggiorna l'username e blocca lo slot
            slotElement.classList.add('occupied', 'locked');
            slotElement.textContent = slotData.username;
            slotElement.style.pointerEvents = 'none'; // Disabilita ulteriori clic
        } else {
            // Se lo slot è vuoto, ripristina lo stato predefinito
            slotElement.classList.remove('occupied', 'locked');
            slotElement.textContent = `Player ${slotKey}`;
            slotElement.style.pointerEvents = ''; // Riabilita i clic
        }
        console.log(`Updated slot ${slotKey} in round ${roundNumber} with data:`, slotData);
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
    console.log("Sending data to server:", data);
    LobbySocket.send(JSON.stringify(data));
}


// Funzione per aggiornare la lista degli utenti nella lobby
function updateUserList(users, slots, readyStatus) {
    const userList = document.getElementById('users_in_lobby');
    userList.innerHTML = '';

    users.forEach(user => {
        // Trova lo slot associato all'utente
        let userSlot = null;
        for (let slot in slots) {
            if (slots[slot].username === user.username) {
                userSlot = slot;
                break;
            }
        }

        // Controlla se l'utente è ready
        let isReady = false;
        if (userSlot && readyStatus[userSlot]) {
            isReady = readyStatus[userSlot];  // true o false
        }

        const readyIcon = isReady ? '✔️' : '';  // Aggiungi l'icona se l'utente è pronto

        // Aggiungi l'utente alla lista con l'icona ready se applicabile
        userList.insertAdjacentHTML('beforeend', `<li id="user_${user.username}">${user.username} ${readyIcon}</li>`);
    });
}


// Funzione per gestire la selezione dei team
var buttons = document.querySelectorAll('.lobby-join-team');
buttons.forEach(button => {
    button.addEventListener('click', function() {
        const teamSelected = this.getAttribute('data-team');
        const isJoin = this.textContent === 'Join Team';

        console.log('Button clicked:', teamSelected, username_lobby, isJoin); 

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

        console.log('Message sent:', message); 
    });
});

// Funzione per disabilitare i pulsanti di altri team
function disableOtherTeamButton(currentTeam) {
    buttons.forEach(button => {
        if (button.getAttribute('data-team') !== currentTeam) {
            button.disabled = true;
        }
    });
}

// Funzione per abilitare i pulsanti dei team
function enableOtherTeamButton() {
    buttons.forEach(button => {
        button.disabled = false;
    });
}

// Funzione per aggiornare i team nella lobby
function updateTeamSlots(data) {
    const team = data.team;
    const player = data.player;
    console.log('updateTeamSlots:', team, player); 
    if (data.action === 'join_team') {
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
    } else if (data.action === 'leave_team') {
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

// Funzione per verificare se i team sono pieni
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
                if (slot.classList.contains('occupied') && slot.textContent === username_lobby && roundNumber > maxRoundNumber) {
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
 


// Gestione del pulsante di eliminazione della lobby
var deleteButton = document.getElementById('delete');
if (deleteButton) {
    deleteButton.addEventListener('click', (e) => {
        let accessToken = localStorage.getItem("accessToken");
        fetch(`/api/lobby/${round_id_lobby}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => {
            if (response.ok) {
                loadPage('/api/remote/');
            } else {
                return response.json().then(data => { throw new Error(data.error); });
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

// Gestione del pulsante di uscita dalla lobby (POST PRATICAMENTE INUTILE)
var leaveButton = document.getElementById('leave');
if (leaveButton) {
    leaveButton.addEventListener('click', (e) => {
        e.preventDefault();

        let accessToken = localStorage.getItem("accessToken");

        fetch(`/api/tournament_lobby/${round_id_lobby}/`, {
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
                LobbySocket.send(JSON.stringify({ action: 'leave', username: username_lobby }));
                LobbySocket.close();
                loadPage('/api/tournaments/');
            } else {
                return response.json().then(data => { throw new Error(data.error); });
            }
        })
        .catch(error => console.error('Error:', error));
    });
}



// function updateReadyStatusInUserList(slots, readyStatus) {

//     if (!slots || Object.keys(slots).length === 0) {
//         console.error("No slots data available");
//         return;
//     }

//     const userList = document.getElementById('users_in_lobby');
//     const userItems = userList.getElementsByTagName('li');
//     const currentUser = username_lobby;

//     // Itera su ogni utente nella lista e aggiorna lo stato ready
//     Array.from(userItems).forEach(item => {
//         const username = item.id.replace('user_', '');
//         const slot = Object.keys(slots).find(key => slots[key].username === username);

//         if (slot) {
//             if (readyStatus[slot] !== undefined) {
//                 if (readyStatus[slot]) {
//                     item.innerHTML = `${username} ✔️`;
//                 } else {
//                     item.innerHTML = username;
//                 }
//             }
//         }
//     });

//     // Aggiorna lo stato del pulsante "Ready" per l'utente corrente
//     const readyButton = document.getElementById('ready');
//     if (readyButton) {
//         const currentUserSlot = Object.keys(slots).find(slot => slots[slot].username === currentUser);
//         if (currentUserSlot) {
//             if (readyStatus[currentUserSlot]) {
//                 // Se l'utente è pronto, disabilita il pulsante
//                 readyButton.disabled = true;
//             } else {
//                 // Se l'utente non è pronto, abilita il pulsante
//                 readyButton.disabled = false;
//             }
//         } else {
//             // Se l'utente non ha uno slot, disabilita il pulsante
//             readyButton.disabled = true;
//         }
//     }

//     // Verifica se tutti sono pronti e gli slot sono occupati per abilitare il pulsante "Start" per l'owner
//     let allReady = true;
//     let allOccupied = true;

//     Object.keys(slots).forEach(slot => {
//         if (slots[slot].username === 'empty') {
//             allOccupied = false;
//         }
//         if (slots[slot].username !== 'empty' && !readyStatus[slot]) {
//             allReady = false;
//         }
//     });

//     const tournamentOwner = document.getElementById('tournament-data').dataset.owner;

//     if (currentUser === tournamentOwner) {
//         const startButton = document.getElementById('start');
//         if (startButton) {
//             startButton.disabled = !(allOccupied && allReady);
//         }
//     }
// }

function updateReadyStatusInUserList(slots, readyStatus) {
    if (!slots || Object.keys(slots).length === 0) {
        console.error("No slots data available");
        return;
    }

    const userList = document.getElementById('users_in_lobby');
    const userItems = userList.getElementsByTagName('li');
    const currentUser = username_lobby;

    console.log("Slots received:", slots);
    console.log("Ready status received:", readyStatus);

    // Itera sugli utenti nella lista e aggiorna lo stato "ready"
    Array.from(userItems).forEach(item => {
        const username = item.id.replace('user_', '');
        const slotKey = Object.keys(slots).find(key => slots[key].username === username);

        if (slotKey && readyStatus[slotKey] !== undefined) {
            // Aggiorna lo stato di "ready" nella lista utenti
            if (readyStatus[slotKey]) {
                item.innerHTML = `${username} ✔️`; // Segna come pronto
            } else {
                item.innerHTML = username; // Non pronto
            }
        } else {
            item.innerHTML = username; // Nessuno slot assegnato
        }
    });

    // Aggiorna il pulsante "Ready" per l'utente corrente
    const readyButton = document.getElementById('ready');
    if (readyButton) {
        const currentUserSlot = Object.keys(slots).find(slotKey => slots[slotKey].username === currentUser);
        if (currentUserSlot) {
            readyButton.disabled = readyStatus[currentUserSlot] || false; // Disabilita se pronto
        } else {
            readyButton.disabled = true; // Disabilita se nessuno slot assegnato
        }
    }

    // Controlla se tutti gli slot occupati sono pronti
    const allReady = Object.keys(slots).every(slotKey => 
        slots[slotKey].username !== "empty" && readyStatus[slotKey]
    );

    const allOccupied = Object.keys(slots).every(slotKey => 
        slots[slotKey].username !== "empty"
    );

    // Controlla se l'owner è attivo
    const tournamentOwner = document.getElementById('tournament-data').dataset.owner;
    const startButton = document.getElementById('start');
    const activeUsernames = Object.values(slots)
        .map(slot => slot.username)
        .filter(username => username !== "empty");

    if (startButton) {
        const ownerInGame = activeUsernames.includes(tournamentOwner);
        if (ownerInGame) {
            startButton.disabled = !(allOccupied && allReady);
        } else {
            console.log("Owner not in game. Automatically triggering start logic.");
            startTournamentLogic(); // Avvia direttamente la logica
        }
    }
}




// Funzione per disabilitare i pulsanti e bloccare gli slot
function disableButtonsAndSlots() {
    // Disabilita i pulsanti ready e leave per tutti i giocatori
    document.querySelectorAll('.lobby-ready, .lobby-leave').forEach(button => {
        button.disabled = true;
    });
    // Blocca gli slot dei giocatori (aggiunge una classe 'blocked' agli slot)
    document.querySelectorAll('.player-slot').forEach(slot => {
        slot.classList.add('blocked');
    });
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
    console.log("Starting the tournament...");

    // Disabilita i pulsanti
    const startTournament = document.getElementById("start");
    const leaveTournament = document.getElementById("leave");
    if (startTournament) startTournament.disabled = true;
    if (leaveTournament) leaveTournament.disabled = true;

    // Invio del messaggio per iniziare il processo di round
    LobbySocket.send(JSON.stringify({
        action: 'start_tournament_preparation'
    }));

    // Countdown lato client inviato come messaggi di chat
    let countdown = 10; // Countdown di 10 secondi
    const countdownInterval = setInterval(function () {
        countdown--;

        // Invio del messaggio di chat con "SYSTEM" come username
        const message = {
            action: 'chat_message',
            username: 'SYSTEM',
            message: `Round starting in ${countdown} seconds...`
        };
        LobbySocket.send(JSON.stringify(message));

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            console.log("Countdown finished. Tournament is starting!");

            // Invia il messaggio per confermare che il countdown è terminato
            LobbySocket.send(JSON.stringify({
                action: 'countdown_complete'
            }));
        }
    }, 1000); // Aggiorna il countdown ogni secondo
}


// Funzione per mostrare il popup per joinare il game
function showJoinGamePopup(gameLink) {
    console.log("Showing game popup with link:", gameLink);  // Log per controllare che la funzione venga chiamata correttamente

    // Creazione del popup
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Game is ready!</h2>
            <p>Your game is about to start. Click below to join.</p>
            <button id="join-game-btn" class="btn btn-primary">Join Game</button>
        </div>
    `;

    // Trova il contenitore in cui appenderlo. Assicurati che esista o creane uno.
    const container = document.getElementById('main-container'); // Usa un container specifico se esiste
    container.appendChild(popup);
    console.log("Popup created and appended to the DOM");  // Verifica che il popup sia stato aggiunto al DOM

    // Aggiungi uno stile di base per il popup (puoi migliorarlo con CSS)
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#fff';
    popup.style.padding = '20px';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '9999'; // Assicura che il popup sia in cima a tutti gli altri elementi

    // Al click del pulsante, usa loadPage per caricare la pagina del game
    document.getElementById('join-game-btn').addEventListener('click', function() {
        console.log("Join Game button clicked. Loading game page:", gameLink);  // Log per verificare che il pulsante sia stato cliccato
        container.removeChild(popup);  // Rimuove il popup
        loadPage(gameLink);  // Usa loadPage per caricare la pagina
    });
}

function showWinnerPopup(winner) {
    console.log("Showing winner popup for:", winner); // Log per controllare che la funzione venga chiamata correttamente

    // Creazione del popup
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
        <div class="popup-content">
            <h2>Congratulations!</h2>
            <p>The tournament has concluded.</p>
            <h3>Winner: ${winner.username}</h3>
            <button id="close-popup-btn" class="btn btn-primary">Close</button>
        </div>
    `;

    // Trova il contenitore in cui appenderlo. Assicurati che esista o creane uno.
    const container = document.getElementById('main-container'); // Usa un container specifico se esiste
    if (!container) {
        console.error("Main container not found. Popup cannot be displayed.");
        return;
    }
    container.appendChild(popup);
    console.log("Winner popup created and appended to the DOM"); // Verifica che il popup sia stato aggiunto al DOM

    // Aggiungi uno stile di base per il popup (puoi migliorarlo con CSS)
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#fff';
    popup.style.padding = '20px';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '9999'; // Assicura che il popup sia in cima a tutti gli altri elementi
    popup.style.textAlign = 'center'; // Per centratura del testo

    // Aggiungi un gestore di eventi al pulsante di chiusura
    document.getElementById('close-popup-btn').addEventListener('click', function() {
        console.log("Close button clicked. Removing popup."); // Log per verificare che il pulsante sia stato cliccato
        container.removeChild(popup); // Rimuove il popup
    });
}


