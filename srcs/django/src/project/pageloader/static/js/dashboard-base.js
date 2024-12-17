document.getElementById('profile').addEventListener('click', function() {    
    var userId = localStorage.getItem('userId'); // Assicurati che 'userId' sia la chiave corretta
    if (userId) {
        loadPage("api/profile/" + userId + '/');
    } else {
        console.error("ID utente non trovato in localStorage.");
    }
}
);

document.getElementById('settings').addEventListener('click', function() {
    loadPage("api/settings/");
}
);

document.getElementById('logout').addEventListener('click', function() {
    fetch("/api/logout/")
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if(data.success) {
                localStorage.removeItem('username');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userId');
                const container = document.getElementById('body');
                const basescript = document.getElementById('dashboard-base');  
                container.removeChild(basescript);
                loadPage("api/home/");
            }
        })
        .catch(error => console.error('Errore durante il recupero della pagina:', error));
}
);

//id = localStorage.getItem('userId');
//url = `wss://${window.location.host}/wss/socket-server/?id=${id}`;
var chatSocket;
function initializeWebSocket() {
	if (chatSocket) {
        // Chiudi la connessione WebSocket esistente
        chatSocket.close();
    }
	let id = localStorage.getItem('userId');
	let url = `wss://${window.location.host}/wss/socket-server/?id=${id}`;
	chatSocket = new WebSocket(url);
	chatSocket.onopen = async function(event) {
		var id = localStorage.getItem('userId');
		chatSocket.send(JSON.stringify({
			'user_list': 'get',
		}));
		try {
			var user = await recoverUser(id);
		
			if (user.user_friend_list !== undefined) {
				UpdateFriendList(user);
			}
		
			if (user.pending_requests !== undefined) {
				UpdateRequestList(user);
			}
		} catch (error) {
			console.error("Error fetching user:", error);
		}
		
	};

	chatSocket.onmessage = function(e) {
		let data = JSON.parse(e.data);
	    
		const accessToken = localStorage.getItem("accessToken");
		const csrfToken = getCookie('csrftoken');
		const userId = localStorage.getItem("userId");
	    console.log("data ricevuti nel socket: ", data);
		if (data.type === 'message') {
			let messages = document.getElementById('messages');
			const actualUserId = localStorage.getItem('userId');
	
			(async function() {
				try {
					let actualUser = null;
					actualUser = await recoverUser(actualUserId);
					if (!actualUser) {
						throw new Error('Errore durante il recupero dell\'utente');
					}
					const blockedUsers = actualUser.blocked_userslist || [];
					let isBlocked = false;
	
					for (const blockedUser of blockedUsers) {
						if (blockedUser.username === data.player) {
							isBlocked = true;
							break;
						}
					}
	
					if (!isBlocked) {
						if (data.message.startsWith('@')) {
							handlePrivateMessage(data, actualUser.username);
						} else {
							displayMessage(data, 'black');
						}
					}
				} catch (error) {
					console.error('Errore nel recupero dell\'utente o degli utenti bloccati:', error);
				}
			})();
		} else if (data.type === 'user_list') {
		    let listElementId = 'users';
		    const listElement = document.getElementById(listElementId);
	    
		    if (listElement) {
			(async function() {
			    listElement.innerHTML = '';
			    const itemList = data.list;
			    const elementsToAdd = [];
			    const existingIds = new Set();
			    const actualUserId = localStorage.getItem('userId');
			    const actualUser = await recoverUser(actualUserId);
			    const blockedUsers = actualUser.blocked_userslist || [];
	    
			    for (const id of itemList) {
					const itemElementId = listElementId.slice(0, -1) + '_' + id;
			
					// Controlla se l'elemento con l'ID specifico esiste già
					if (!existingIds.has(itemElementId) && !document.getElementById(itemElementId)) {
						let itemElement = document.createElement('li');
						itemElement.id = itemElementId;
			
						try {
							const item = await recoverUser(id);
							let isblocked = blockedUsers.some(blockedUser => blockedUser.id == id);
				
							if (isblocked) {
								itemElement.classList.add('user-blocked');
							}
							console.log("item: ", item);
							itemElement.textContent = item.username;
							itemElement.dataset.id = id;
							itemElement.oncontextmenu = function(event) {
								event.preventDefault();
								showContextMenu(event, id, isblocked);
							};
							elementsToAdd.push(itemElement);
							existingIds.add(itemElementId);
						} catch (error) {
							console.error(`Errore durante il recupero dell'utente con ID ${id}:`, error);
						}
					} else {
					}
			    }
	    
			    // Appendi tutti gli elementi alla fine
			    elementsToAdd.forEach(element => {
				listElement.appendChild(element);
			    });
			})();
		    } else {
			//console.error("L'elemento users non esiste");
		    }
		} else if (data.type === 'invite_game') {
			handleGameInvite(data, accessToken, csrfToken);		    
		} else if (data.type === 'friend_request') {
		} else if (data.type === 'accept') {
			updateFriendshipStatus(data);
		} else if (data.type === 'remove') {
			updateFriendshipStatus(data);
		} else if (data.type === 'pending_request') {
			if (data.request_type === 'game') {
			    handleGameInvite(data);
			} else if (data.request_type === 'friend') {
				handleFriendRequest(data, accessToken, csrfToken);
			} else if (data.type === 'tournament') {
				handleTournamentInvite(data);
			}
		}
	    };
	}

initializeWebSocket();

function handleGameInvite(data, accessToken, csrfToken) {
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
	
    let invite = confirm(`${data.requesting_user} ti ha invitato a giocare`);
    if (invite) {
		joinGame(data.target_lobby);
    } else {
		chatSocket.send(JSON.stringify({
			'type': 'remove',
			'pending_request': 'remove',
			'target_user': data.requesting_user,
			'requesting_user': data.target_user,
			'lobby_id': data.target_lobby
		}));
    }
}


function handleTournamentInvite(data, accessToken, csrfToken) {
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
	
    let invite = confirm(`${data.requesting_user} ti ha invitato ad un torneo`);
    if (invite) {
		joinTournament(data.target_lobby);
    } else {
		chatSocket.send(JSON.stringify({
			'type': 'remove',
			'pending_request': 'remove',
			'target_user': data.requesting_user,
			'requesting_user': data.target_user,
			'lobby_id': data.target_lobby
		}));
    }
}


function updateGameInviteStatus(data) {
    let message;
    switch (data.type) {
        case 'accept':
            message = `${data.target_user} ha accettato l'invito a giocare`;
            break;
        case 'decline':
            message = `${data.target_user} ha rifiutato l'invito a giocare`;
            break;
        default:
            console.error('Unhandled game status update:', data.type);
            return;
    }
    alert(message);
}

function handleFriendRequest(data, accessToken, csrfToken) {
    let request = confirm(`${data.requesting_user} vuole aggiungerti come amico`);
    if (request) {
        processFriendRequest('accept', data, accessToken, csrfToken);
		updateFriendListFromServer();
    } else {
        processFriendRequest('decline', data, accessToken, csrfToken);
    }
}

async function processFriendRequest(action, data, accessToken, csrfToken) {
	
	const requestData = {
        target_user: data.target_user,
        requesting_user: data.requesting_user,
        request: action
    };
	
	
	try {
	    const response = await fetch(`/api/request/friend/${data.target_user}/`, {
		method: 'POST',
		headers: {
		    'Content-Type': 'application/json',
		    'Authorization': `Bearer ${accessToken}`,
		    'X-CSRFToken': csrfToken
		},
		body: JSON.stringify(requestData)
	    });
	
	    if (!response.ok) {
		const errorMessage = await response.json();
		console.error('Errore durante l\'invio della risposta:', errorMessage);
		alert(`Errore durante l'invio della risposta: ${errorMessage.error}`);
	    } else {
		alert('risposta inviata con successo');
	
		chatSocket.send(JSON.stringify({
			'type': action,
			'pending_request': action,
			'target_user': data.requesting_user,
			'requesting_user': data.target_user,
		}));
	    }
	} catch (error) {
	    console.error('Errore durante la fetch:', error);
	    alert('Errore durante la fetch: ' + error.message);
	}



	/* 
    let request_url = `/api/request/friend/${data.target_user}/`;
    

    fetch(request_url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(requestData)
    }).then(response => {
		chatSocket.send(JSON.stringify({
			'type': action,
			'pending_request': action,
			'target_user': data.requesting_user,
			'requesting_user': data.target_user,
		}));
        if (response.ok) {
            alert(`Hai ${action === 'accept' ? 'accettato' : 'rifiutato'} la richiesta di amicizia!`);
        } else {
            throw new Error('Failed to process friend request');
        }
    }).catch(error => {
        console.error('Error processing friend request:', error);
    }); */
	updateFriendListFromServer();
}

function updateFriendshipStatus(data) {
    let message;
    switch (data.type) {
        case 'accept':
            message = `${data.target_user} ha accettato la tua richiesta`;
            break;
        case 'decline':
            message = `${data.target_user} ha rifiutato la tua richiesta`;
            break;
        case 'remove':
            message = `${data.target_user} ha rimosso l'amicizia`;
            break;
        default:
            console.error('Unhandled status update:', data.type);
            return;
    }
    alert(message);

    // Aggiorna la lista degli amici dopo l'aggiornamento dello stato dell'amicizia
    updateFriendListFromServer();
}


async function updateFriendListFromServer() {
    const userId = localStorage.getItem('userId');
    try {
        const user = await recoverUser(userId); // Recupera l'utente aggiornato dal server
        if (!user) {
            throw new Error('Errore durante il recupero dei dati utente');
        }
        let friendListElement = document.getElementById("dashboard-friendlist");
        if (!friendListElement) {
            console.error("Elemento della lista amici non trovato");
            return;
        }

        // Svuota la lista amici
        friendListElement.innerHTML = '';

        // Aggiorna la lista amici
        for (let friend of user.user_friend_list) {
            let itemElement = document.createElement('li');
            itemElement.id = `friend_${friend.id}`;
            itemElement.textContent = friend.username;
            try {
                itemElement.dataset.id = friend.id;
                itemElement.oncontextmenu = function(event) {
                    event.preventDefault();
                    showFriendContextMenu(event, friend.id, friend.username);
                };
                friendListElement.appendChild(itemElement);
            } catch (error) {
                console.error('Errore durante l\'impostazione dell\'ID:', error);
            }
        }
    } catch (error) {
        console.error('Errore durante l\'aggiornamento della lista amici:', error);
    }
}



function handlePrivateMessage(data, currentUsername) {
    const endOfUsernameIndex = data.message.indexOf(' ');
    const targetUsername = data.message.substring(1, endOfUsernameIndex);
    const messageContent = data.message.substring(endOfUsernameIndex + 1);

    // Se l'utente corrente è il destinatario, mostra il messaggio senza il nome del destinatario
    if (currentUsername === targetUsername) {
        displayMessage({ player: data.player, message: messageContent }, 'green');
    }
    // Se l'utente corrente è il mittente, mostra il messaggio con il nome del destinatario in parentesi
    if (data.player === currentUsername) {
        const formattedMessage = `(a ${targetUsername}) ${messageContent}`;
        displayMessage({ player: data.player, message: formattedMessage }, 'green');
    }
}

function displayMessage(data, color) {
    let messages = document.getElementById('messages');
    if (messages) {
        messages.insertAdjacentHTML('beforeend', `<div class="d-flex justify-content-start" style="height: 2vh;"><span style="color: ${color};"><strong>${data.player}:</strong> ${data.message}</span></div>`);
        messages.scrollTop = messages.scrollHeight;
    } else {
        console.error("L'elemento messages non esiste");
    }
}


function UpdateFriendList(user) {
	let friendListElement = document.getElementById("dashboard-friendlist");
	for (let friend of user.user_friend_list) {
	    let itemElement = document.createElement('li');
	    itemElement.id = `friend_${friend.id}`;
	    itemElement.textContent = friend.username;
	    try {
		itemElement.dataset.id = friend.id;
		itemElement.oncontextmenu = function(event) {
		    event.preventDefault();
		    showFriendContextMenu(event, friend.id, friend.username);
		};
		friendListElement.appendChild(itemElement);
	    } catch (error) {
		console.error('Errore durante l\'impostazione dell\'ID:', error);
	    }
	}
}
    //asdasdasdasd
function UpdateRequestList(user) {
	let listElementId = 'pending-requests';
	const listElement = document.getElementById(listElementId);
	for (let request of user.pending_requests) {
	    let itemElement = document.createElement('li');
	    itemElement.id = listElementId.slice(0, -1) + '_' + request.id;
	    itemElement.textContent = request.request_type + ' request from ' + request.requesting_user;
	    try {
			itemElement.dataset.id = request.id;
			itemElement.oncontextmenu = function(event) {
				event.preventDefault();
				showRequestContextMenu(event, request.id, request.requesting_user);
			};
			listElement.appendChild(itemElement);
	    } catch (error) {
			console.error('Errore durante l\'impostazione dell\'ID:', error);
	    }
	}
}


var form = document.getElementById('dashboard_chat_form');
form.addEventListener('submit', (e)=> {
    e.preventDefault();
    let message = e.target.message.value;
	
    username = localStorage.getItem('username');
    chatSocket.send(JSON.stringify({
        'message': message,
        'username': username
    }));
    form.reset();
});


function showContextMenu(event, id, isblocked = false) {
    // Ottieni il menu contestuale
	console.log("isblocked",isblocked);
    const contextMenu = document.getElementById("contextMenu");
    const addfriendcontext = document.getElementById("addfriendcontext");
    const viewpfoilecontext = document.getElementById("viewprofilecontext");
    const blockusercontext = document.getElementById("blockusercontext");
    // Posiziona il menu contestuale in base alla posizione del clic

    addfriendcontext.dataset.id = id;
    viewpfoilecontext.dataset.id = id;
    blockusercontext.dataset.id = id;
    if (isblocked) {
	blockusercontext.textContent = "Unlock User";
}
    contextMenu.style.left = event.pageX + "px";
    contextMenu.style.top = event.pageY + "px";

    // Mostra il menu
    contextMenu.style.display = "block";
    
    // Nascondi il menu quando si clicca altrove
    window.onclick = function() {
        contextMenu.style.display = "none";
    };
}

function showFriendContextMenu(event, id, username) {
    // Ottieni il menu contestuale
    const contextMenu = document.getElementById("friendContextMenu");
    const invitegamecontext = document.getElementById("invitegamecontext");
    const invitetournamentcontext = document.getElementById("invitetournamentcontext");
    const removefriendcontext = document.getElementById("removefriendcontext");
    // Posiziona il menu contestuale in base alla posizione del clic
	let pathname = window.location.pathname;
	console.log("nel context",pathname);
	if (pathname.includes('lobby') === false) 
	{
		invitegamecontext.style.display = "none";
		invitetournamentcontext.style.display = "none";
	}
	else
	{
		invitegamecontext.style.display = "block";
		invitetournamentcontext.style.display = "block";
	}
    invitegamecontext.dataset.id = id;
	invitegamecontext.dataset.username = username;
    invitetournamentcontext.dataset.id = id;
	invitetournamentcontext.dataset.username = username;
    removefriendcontext.dataset.id = id;
	removefriendcontext.dataset.username = username;

    contextMenu.style.left = event.pageX + "px";
    contextMenu.style.top = event.pageY + "px";

    // Mostra il menu
    contextMenu.style.display = "block";

    // Nascondi il menu quando si clicca altrove
    window.onclick = function() {
        contextMenu.style.display = "none";
    };
}

function showRequestContextMenu(event, id, requesting_user) {
    // Ottieni il menu contestuale
	console.log("requesting_user",requesting_user);
    const contextMenu = document.getElementById("requestContextMenu");
    const acceptrequestcontext = document.getElementById("acceptrequestcontext");
    const declinerequestcontext = document.getElementById("declinerequestcontext");
    // Posiziona il menu contestuale in base alla posizione del clic

    acceptrequestcontext.dataset.id = id;
	acceptrequestcontext.dataset.requesting_user = requesting_user;
    declinerequestcontext.dataset.id = id;
	declinerequestcontext.dataset.requesting_user = requesting_user;

    contextMenu.style.left = event.pageX + "px";
    contextMenu.style.top = event.pageY + "px";

    // Mostra il menu
    contextMenu.style.display = "block";

    // Nascondi il menu quando si clicca altrove
    window.onclick = function() {
        contextMenu.style.display = "none";
    };
}
    
    


async function recoverUser(id) {
    let accessToken = localStorage.getItem("accessToken");
	const checkAndRefreshToken = async () => {
        try {
            const response = await fetch(`/api/token/refresh/?token=${accessToken}`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.message === 'Token valido') {
                // Il token è valido, procedi con la richiesta
                return accessToken;
            } else if (data.message === 'Token non valido') {
                // Il token non è valido, tentiamo di rinnovarlo
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    localStorage.setItem('accessToken', newAccessToken);
                    return newAccessToken;
                } else {
					accessToken = localStorage.getItem("accessToken");
					checkAndRefreshToken();
                    return null;
                }
            } else {
                console.error('Errore durante il controllo del token:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Errore durante la verifica o il rinnovo del token:', error);
            return null;
        }
    };

    // Verifica la validità del token e procedi con la richiesta se tutto è in ordine
    accessToken = await checkAndRefreshToken();
    if (!accessToken) {
        // Se non è possibile ottenere un token valido, esci
        return;
    }
    try {
        // La funzione fetch ritorna una promessa, quindi puoi usare await qui
        const response = await fetch(`/api/request_user/${id}/`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        const text = await response.text();  // Otteniamo il testo grezzo della risposta

        if (!response.ok) {
            console.error(`Errore nella risposta della rete: ${response.status} ${response.statusText}`);
            throw new Error('Network response was not ok');
        }

        const data = JSON.parse(text);  // Prova a fare il parse del messaggio

        return data; // Modifica questo percorso in base alla struttura della tua risposta

    } catch (error) {
		recoverUser(id);
        //console.error('Errore durante il recupero dei dati dell\'utente:', error);
        //throw error;
    }
}


document.getElementById("addfriendcontext").addEventListener('click', async function(e) {
	const accessToken = localStorage.getItem("accessToken");
	const id = e.target.dataset.id;
	if (id === localStorage.getItem('userId')) {
		alert('Non puoi aggiungere te stesso come amico');
		return;
	}
	const csrfToken = getCookie('csrftoken');
	
	const requestData = {
	    requesting_user: localStorage.getItem('username'),
	    request: 'pending'
	};
	
	const requestType = 'friend';
	
	try {
	    const response = await fetch(`/api/request/${requestType}/${id}/`, {
		method: 'POST',
		headers: {
		    'Content-Type': 'application/json',
		    'Authorization': `Bearer ${accessToken}`,
		    'X-CSRFToken': csrfToken
		},
		body: JSON.stringify(requestData)
	    });
	
	    if (!response.ok) {
		const errorMessage = await response.json();
		console.error('Errore durante l\'invio della richiesta:', errorMessage);
		alert(`Errore durante l'invio della richiesta: ${errorMessage.error}`);
	    } else {
		alert('Richiesta inviata con successo');
	
		chatSocket.send(JSON.stringify({
		    'pending_request': 'send',
		    'target_user': id,
		    'requesting_user': localStorage.getItem('userId'),
		    'type': 'friend'
		}));
	    }
	} catch (error) {
	    console.error('Errore durante la fetch:', error);
	    alert('Errore durante la fetch: ' + error.message);
	}
});


document.getElementById("viewprofilecontext").addEventListener('click', async function(e) {
    const id = e.target.dataset.id;
    loadPage(`api/profile/${id}/`);
});


document.getElementById("blockusercontext").addEventListener('click', async function(e) {
	let accessToken = localStorage.getItem("accessToken");
	const id = e.target.dataset.id;
    
	// Funzione per verificare la validità del token
	async function checkTokenValidity(url) {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    // Token valido, procedi con la richiesta effettiva
		    await performRequest(accessToken, url);
		} else if (data.message === 'Token non valido') {
		    // Token non valido, prova a rinfrescare
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;  // Aggiorna il token di accesso per le richieste future
			localStorage.setItem("accessToken", newAccessToken);
			// Richiesta effettiva con nuovo token
			await performRequest(newAccessToken, url);
		    } else {
			loadPage("api/login/");
		    }
		} else {
		    throw new Error('Network response was not ok');
		}
	    } catch (error) {
		console.error('Errore durante la verifica del token:', error);
	    }
	}
    
	// Funzione per eseguire la richiesta effettiva
	const performRequest = async (token, url) => {
	    try {
		const response = await fetch(url, {
		    method: 'POST',
		    headers: {
			'Content-Type': 'application/json',
			"Authorization": `Bearer ${token}`
		    }
		});
    
		if (!response.ok) {
		    throw new Error('Errore durante il blocco dell\'utente');
		}
	    } catch (error) {
		console.error('Errore durante la richiesta:', error);
	    }
	    const userElement = document.getElementById('user_' + id);
	    if (userElement) {
			userElement.classList.toggle('user-blocked');
			if (userElement.classList.contains('user-blocked')) {
				document.getElementById('blockusercontext').textContent = 'Unlock User';
			} else {
				document.getElementById('blockusercontext').textContent = 'Block';
			}
	    }
	};
    
	await checkTokenValidity(`/api/block_user/${id}/`);
    });
    


document.getElementById("invitegamecontext").addEventListener('click', async function(e) {
	let accessToken = localStorage.getItem("accessToken");  // Usa let al posto di const
	const id = e.target.dataset.id; 
	const csrfToken = getCookie('csrftoken');
    let lobbyId = window.location.pathname.split('/').filter(part => part !== '').pop();
	const requestData = {
	    requesting_user: localStorage.getItem('username'),
		target_user: id,
	    request: 'pending',  
	};
    
	const requestType = 'game'; 
	let url = `/api/request/${requestType}/${lobbyId}/`;
	// Funzione per verificare la validità del token
	async function checkTokenValidity(url, requestType) {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    // Token valido, procedi con la richiesta effettiva
		    await performRequest(accessToken);
		} else if (data.message === 'Token non valido') {
		    // Token non valido, prova a rinfrescare
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;  // Aggiorna il token di accesso per le richieste future
			localStorage.setItem("accessToken", newAccessToken);
			// Richiesta effettiva con nuovo token
			console
			await performRequest(newAccessToken, url, requestType);
		    } else {
			loadPage("api/login/");
		    }
		} else {
		    throw new Error('Network response was not ok');
		}
	    } catch (error) {
		console.error('Errore durante la verifica del token:', error);
	    }
	}
    
	// Funzione per eseguire la richiesta effettiva
	const performRequest = async (token, url, requestType) => {
	    try {
		const response = await fetch(url, {
		    method: 'POST',  // Usa POST se richiesto
		    headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
			'X-CSRFToken': csrfToken
		    },
		    body: JSON.stringify(requestData)
		});
    
		if (!response.ok) {
		    const errorMessage = await response.json();
		    console.error('Errore durante l\'invio dell\'invito a giocare:', errorMessage);
		    alert(`Errore durante l'invio dell'invito: ${errorMessage.error}`);
		} else {
		    alert('Invito a giocare inviato con successo');
			console.log("request type: ", requestType);
			if (requestType === undefined) {
				requestType = 'game';
			}
		    // Invia il messaggio tramite WebSocket per aggiornare in tempo reale
			lobbyId = window.location.pathname.split('/').filter(part => part !== '').pop();
		    chatSocket.send(JSON.stringify({
			'pending_request': 'send',
			'target_user': id,
			'requesting_user': localStorage.getItem('userId'),
			'target_lobby': lobbyId,
			'type': requestType
		    }));
		}
	    } catch (error) {
		console.error('Errore durante la fetch:', error);
		alert('Errore durante la fetch: ' + error.message);
	    }
	};
    console.log("request type: ", requestType);
	if (requestType === 'game') {
		await checkTokenValidity(`/api/request/${requestType}/${id}/`, requestType);
	}
});
    
    

document.getElementById("invitetournamentcontext").addEventListener('click', async function(e) {
	let accessToken = localStorage.getItem("accessToken");  // Usa let al posto di const
	const id = e.target.dataset.id; 
	const csrfToken = getCookie('csrftoken');
    let lobbyId = window.location.pathname.split('/').filter(part => part !== '').pop();
	const requestData = {
	    requesting_user: localStorage.getItem('username'),
		target_user: id,
	    request: 'pending',  
	};
    
	const requestType = 'tournament'; 
	let url = `/api/request/${requestType}/${lobbyId}/`;
	// Funzione per verificare la validità del token
	async function checkTokenValidity(url, requestType) {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    // Token valido, procedi con la richiesta effettiva
		    await performRequest(accessToken);
		} else if (data.message === 'Token non valido') {
		    // Token non valido, prova a rinfrescare
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;  // Aggiorna il token di accesso per le richieste future
			localStorage.setItem("accessToken", newAccessToken);
			// Richiesta effettiva con nuovo token
			console
			await performRequest(newAccessToken, url, requestType);
		    } else {
			loadPage("api/login/");
		    }
		} else {
		    throw new Error('Network response was not ok');
		}
	    } catch (error) {
		console.error('Errore durante la verifica del token:', error);
	    }
	}
    
	// Funzione per eseguire la richiesta effettiva
	const performRequest = async (token, url, requestType) => {
	    try {
		const response = await fetch(url, {
		    method: 'POST',  // Usa POST se richiesto
		    headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
			'X-CSRFToken': csrfToken
		    },
		    body: JSON.stringify(requestData)
		});
    
		if (!response.ok) {
		    const errorMessage = await response.json();
		    console.error('Errore durante l\'invio dell\'invito a torneo:', errorMessage);
		    alert(`Errore durante l'invio dell'invito: ${errorMessage.error}`);
		} else {
		    alert('Invito a torneo inviato con successo');
			console.log("request type: ", requestType);
			if (requestType === undefined) {
				requestType = 'tournament';
			}
		    // Invia il messaggio tramite WebSocket per aggiornare in tempo reale
			lobbyId = window.location.pathname.split('/').filter(part => part !== '').pop();
		    chatSocket.send(JSON.stringify({
			'pending_request': 'send',
			'target_user': id,
			'requesting_user': localStorage.getItem('userId'),
			'target_lobby': lobbyId,
			'type': requestType
		    }));
		}
	    } catch (error) {
		console.error('Errore durante la fetch:', error);
		alert('Errore durante la fetch: ' + error.message);
	    }
	};
    console.log("request type: ", requestType);
	if (requestType === 'tournament') {
		await checkTokenValidity(`/api/request/${requestType}/${id}/`, requestType);
	}
});



document.getElementById("removefriendcontext").addEventListener('click', async function(e) {
    let accessToken = localStorage.getItem("accessToken");
	const id = localStorage.getItem("userId");
	const csrfToken = getCookie('csrftoken');
	target_user = e.target.dataset.username;

	const responseData = {
		target_user: target_user, 
	    request: 'remove',
		true: "yes"
	};
    
    const response = await fetch(`/api/request/friend/${id}/`, {
        method: 'POST',
        headers: {
			'Content-Type': 'application/json',
			"Authorization": `Bearer ${accessToken}`,
			'X-CSRFToken': csrfToken
        },
		body: JSON.stringify(responseData)
    });

    if (!response.ok) {
        console.error('Errore durante la rimozione dell\'amico');
    } else {
    }
	document.getElementById("friend_" + e.target.dataset.id).remove();
	chatSocket.send(JSON.stringify({
		'type': 'remove',
		'pending_request': 'remove',
		'target_user': e.target.dataset.id,
		'requesting_user': localStorage.getItem('userId'),
	}));
}
);

document.getElementById("acceptrequestcontext").addEventListener('click', async function(e) {
	let accessToken = localStorage.getItem("accessToken");
	let id = localStorage.getItem("userId");
	const csrfToken = getCookie('csrftoken');
	const request_user = e.target.dataset.requesting_user;


	const responseData = {
		requesting_user: request_user,
	    request: 'accept',
		true: "yes"
	};
    
	const response = await fetch(`/api/request/friend/${id}/`, {
	    method: 'POST',
	    headers: {
		'Content-Type': 'application/json',
		"Authorization": `Bearer ${accessToken}`,
		'X-CSRFToken': csrfToken
	    },
	    body: JSON.stringify(responseData)
	});

	
    
	if (!response.ok) {
	    const errorMessage = await response.json();
	    console.error('Errore durante l\'accettazione della richiesta', response.status, response.statusText, errorMessage);
	} else {
		document.getElementById("pending-request_" + e.target.dataset.id).remove();
		chatSocket.send(JSON.stringify({
			'type': 'accept',
			'target_user': e.target.dataset.requesting_user,
			'requesting_user': e.target.dataset.id,
			'request_type': 'accept',
		}));
		
		let friendListElement = document.getElementById("dashboard-friendlist");

		if (friendListElement) {
			console.log("friendListElement",friendListElement, response);
			let itemElement = document.createElement('li');
			console.log("nel accept",e.target.dataset);
			itemElement.id = `friend_${e.target.dataset.id}`;
			recoverUser(e.target.dataset.id).then(item => {
				itemElement.textContent = item.username;
				try {
				itemElement.dataset.id = e.target.dataset.id;
				itemElement.oncontextmenu = function(event) {
					event.preventDefault();
					showFriendContextMenu(event, e.target.dataset.id);
				};
				friendListElement.appendChild(itemElement);
				} catch (error) {
				console.error('Errore durante l\'impostazione dell\'ID:', error);
				}
			});
			alert(`${e.target.dataset.id} ha accettato la tua richiesta`);
		}
		
	}

});


document.getElementById("declinerequestcontext").addEventListener('click', async function(e) {
	let accessToken = localStorage.getItem("accessToken");
	let id = localStorage.getItem("userId");
	const csrfToken = getCookie('csrftoken');
	const request_user = e.target.dataset.requesting_user;


	const responseData = {
		requesting_user: request_user,
	    request: 'decline',
		true: "yes"
	};
    
	const response = await fetch(`/api/request/friend/${id}/`, {
	    method: 'POST',
	    headers: {
		'Content-Type': 'application/json',
		"Authorization": `Bearer ${accessToken}`,
		'X-CSRFToken': csrfToken
	    },
	    body: JSON.stringify(responseData)
	});

	
    
	if (!response.ok) {
	    const errorMessage = await response.json();
	    console.error('Errore durante l\'accettazione della richiesta', response.status, response.statusText, errorMessage);
	} else {
		document.getElementById("pending-request_" + e.target.dataset.id).remove();
	}
}
);

async function updateUserProfile() {
    const userId = localStorage.getItem('userId');
    let accessToken = localStorage.getItem('accessToken');

    if (!userId || !accessToken) {
        console.error('ID utente o token di accesso mancante');
        return;
    }

    // Funzione per verificare la validità del token e, se necessario, rinnovarlo
    const checkAndRefreshToken = async () => {
        try {
            const response = await fetch(`/api/token/refresh/?token=${accessToken}`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.message === 'Token valido') {
                // Il token è valido, procedi con la richiesta
                return accessToken;
            } else if (data.message === 'Token non valido') {
                // Il token non è valido, tentiamo di rinnovarlo
                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    localStorage.setItem('accessToken', newAccessToken);
                    return newAccessToken;
                } else {
                    console.error('Impossibile rinnovare il token');
                    return null;
                }
            } else {
                console.error('Errore durante il controllo del token:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Errore durante la verifica o il rinnovo del token:', error);
            return null;
        }
    };

    // Verifica la validità del token e procedi con la richiesta se tutto è in ordine
    accessToken = await checkAndRefreshToken();
    if (!accessToken) {
        // Se non è possibile ottenere un token valido, esci
        return;
    }

    // Effettua la richiesta per aggiornare il profilo utente
    try {
        const response = await fetch(`/api/userinfo/${userId}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error('Errore durante il recupero dei dati dell\'utente');
            return;
        }

        const user = await response.json();

        const nicknameElement = document.getElementById('profile-nickname');
        const profilePictureElement = document.getElementById('profile-picture');

        if (nicknameElement && profilePictureElement) {
            nicknameElement.innerHTML = `<h4>${user.nickname}</h4>`;
            profilePictureElement.src = "/static/" + user.img_profile;
        } else {
            console.error('Elementi HTML non trovati');
        }

    } catch (error) {
		recoverUser(id);
        //console.error('Errore durante il recupero dei dati dell\'utente:', error);
    }
}

// Funzione per il rinnovo del token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.error('Token di refresh mancante');
        return null;
    }

    try {
        const response = await fetch('/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            return data.access;
        } else {
            console.error('Errore durante il rinnovo del token di accesso');
            return null;
        }
    } catch (error) {
        console.error('Errore durante il rinnovo del token di accesso:', error);
        return null;
    }
}


window.addEventListener('profileUpdated', updateUserProfile);