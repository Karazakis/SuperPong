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
            disableButtonsAndSlots(data.players_to_block);
            break;
        case 'join_game_notification':
            console.log("Join game notification received");
            showJoinGamePopup(data.game_link);
            break;
        case 'tournament_finished':
            console.log("Tournament finished! Displaying winner popup after delay.");
            setTimeout(() => {
                showWinnerPopup(data.winner);
            }, 500);
            break;
        case 'start_countdown':
            if (data.authorized_client === username_lobby) {
                // Solo il client autorizzato esegue il countdown
                console.log("You are authorized to start the countdown.");
                startTournamentCountdown();
            }
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
    //checkUserSlotAndReadyState();
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

    console.log(`Max round detected: ${maxRoundKey}`);

    // Recupera gli slot del round massimo
    const maxRoundSlots = roundsSlots[maxRoundKey];
    if (!maxRoundSlots || Object.keys(maxRoundSlots).length === 0) {
        console.error(`No slots available for max round: ${maxRoundKey}`);
        readyButton.disabled = true;
        return;
    }
    console.log(`Slots for max round (${maxRoundKey}):`, maxRoundSlots);

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
    checkUserSlotAndReadyState(roundsSlots);
}


// Funzione per aggiornare un singolo slot
function updateSlot(roundNumber, slotKey, slotData) {
    const slotElement = document.querySelector(`.round[data-round="${roundNumber}"] .player-slot[data-slot="${slotKey}"]`);
    if (slotElement) {
        if (slotData && slotData.username !== 'empty' && !slotData.username.toLowerCase().includes('winner') ) {
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


var leaveButton = document.getElementById('leave');
if (leaveButton) {
    leaveButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await leaveLobby();
    });
}


async function leaveLobby() {
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

    console.log("Slots received:", slots);
    console.log("Ready status received:", readyStatus);

    // Aggiorna la lista utenti con lo stato "ready"
    Array.from(userItems).forEach(item => {
        const username = item.id.replace('user_', '');
        const slotKey = Object.keys(slots).find(key => slots[key].username === username);

        if (slotKey && readyStatus[slotKey] !== undefined) {
            item.innerHTML = `${username} ${readyStatus[slotKey] ? '✔️' : ''}`;
        } else {
            item.innerHTML = username; // Nessuno slot assegnato o dati mancanti
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
            startButton.disabled = false; // Attiva il pulsante "Start"
        } else {
            console.warn("Owner not in game. Automatically triggering start logic.");
            startTournamentLogic(); // Avvia direttamente la logica
        }
    }
}



function disableAllButtonsButLeave() {
    // Disabilita tutti i pulsanti ready, leave e start tournament
    // Blocca visivamente lo slot
    const readyButton = slot.querySelector('.lobby-ready');
    const leaveButton = slot.querySelector('.lobby-leave');
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
    console.log(userId);

    const readyButton = document.querySelector('.lobby-ready');
    const leaveButton = document.querySelector('.lobby-leave');

    if (!playersToBlock.includes(userId)) {
        // Se l'userId non è tra quelli da bloccare, esci dalla funzione
        console.log(`Utente con ${userId} non e' da bloccare: playerstoblock = ${playersToBlock}`)
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
}

function startTournamentCountdown() {
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


