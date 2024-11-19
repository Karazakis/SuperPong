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

id = localStorage.getItem('userId');
let url = `wss://${window.location.host}/wss/socket-server/?id=${id}`;
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
	    
		if (data.type === 'message') {
		    let messages = document.getElementById('messages');
		    const actualUserId = localStorage.getItem('userId');
	    
		    // Recupera l'utente attuale, compresi gli utenti bloccati
		    (async function() {
			try {
			    const actualUser = await recoverUser(actualUserId);
			    const blockedUsers = actualUser.blocked_userslist || [];
			    let isBlocked = false;
	    
			    // Verifica se l'utente che ha inviato il messaggio è bloccato
			    for (const blockedUser of blockedUsers) {
				if (blockedUser.username === data.player) {
				    isBlocked = true;
				    break;
				}
			    }
	    
			    // Se l'utente non è bloccato, mostra il messaggio
			    if (!isBlocked) {
				if (messages) {
				    messages.insertAdjacentHTML('beforeend', `<div class="d-flex justify-content-start" style="height: 2vh;"><span><strong>${data.player}:</strong> ${data.message}</span></div>`);
				    messages.scrollTop = messages.scrollHeight;
				} else {
				    console.error("L'elemento messages non esiste");
				}
			    } else {
				console.log(`Messaggio da utente bloccato (${data.player}) non visualizzato`);
			    }
			} catch (error) {
			    console.error('Errore nel recupero dell\'utente o degli utenti bloccati:', error);
			}
		    })();
		} else if (data.type === 'user_list') {
		    let listElementId = 'users';
		    const listElement = document.getElementById(listElementId);
	    
		    if (listElement) {
			console.log('Elemento listElement trovato:', listElement);
			(async function() {
			    //console.log('Inizio di aggiornamento della lista utenti');
			    listElement.innerHTML = '';
			    const itemList = data.list;
			    //console.log('Lista degli ID utenti:', itemList);
			    const elementsToAdd = [];
			    const existingIds = new Set();
			    const actualUserId = localStorage.getItem('userId');
			    const actualUser = await recoverUser(actualUserId);
			    const blockedUsers = actualUser.blocked_userslist || [];
			    //console.log('Utente attuale (blocked_users):', blockedUsers);
	    
			    for (const id of itemList) {
				const itemElementId = listElementId.slice(0, -1) + '_' + id;
				//console.log(`Controllo esistenza elemento con ID: ${itemElementId}`);
	    
				// Controlla se l'elemento con l'ID specifico esiste già
				if (!existingIds.has(itemElementId) && !document.getElementById(itemElementId)) {
				    //console.log(`Elemento con ID ${itemElementId} non trovato, creazione di un nuovo elemento`);
				    let itemElement = document.createElement('li');
				    itemElement.id = itemElementId;
	    
				    try {
					const item = await recoverUser(id);
					//console.log(`Utente recuperato: ${item.username} (ID: ${id})`);
					let isblocked = blockedUsers.some(blockedUser => blockedUser.id == id);
	    
					if (isblocked) {
					    itemElement.classList.add('user-blocked');
					    console.log(`Utente bloccato trovato: ${item.username}, classe user-blocked aggiunta`);
					}
	    
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
				    console.log(`Elemento con ID ${itemElementId} già esistente, salto la creazione`);
				}
			    }
	    
			    // Appendi tutti gli elementi alla fine
			    elementsToAdd.forEach(element => {
				//console.log(`Aggiunta dell'elemento con ID ${element.id} alla lista`);
				listElement.appendChild(element);
			    });
			    //console.log('Aggiornamento della lista utenti completato');
			})();
		    } else {
			console.error("L'elemento users non esiste");
		    }
		} else if (data.type === 'invite_game') {
		    // Gestione dell'invito a giocare
		    let invite = confirm(`${data.requesting_user} ti ha invitato a giocare`);
	    
		    if (invite) {
			let request_url = `/api/invite_game/${data.request_type}/${data.target_user}/`;
			let requestData = {
			    target_user: data.target_user,
			    requesting_user: data.requesting_user,
			    request: 'accept',
			    game: "yes"
			};
	    
			fetch(request_url, {
			    method: 'POST',
			    headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${accessToken}`,
				'X-CSRFToken': csrfToken
			    },
			    body: JSON.stringify(requestData)
			}).then(response => {
			    if (response.ok) {
				// Invia la conferma tramite WebSocket
				chatSocket.send(JSON.stringify({
				    'pending_request': 'accept',
				    'request': 'accept',
				    'type': 'game',
				    'target_user': data.requesting_user,
				    'requesting_user': data.target_user,
				    'request_type': 'game',
				}));
	    
				alert('Hai accettato l\'invito a giocare!');
			    } else {
				console.error('Errore durante l\'invio dell\'invito a giocare', response.statusText);
			    }
			}).catch(error => {
			    console.error('Errore durante la fetch:', error);
			});
	    
			let gameListElement = document.getElementById("dashboard-gamelist");
			if (gameListElement) {
			    let itemElement = document.createElement('li');
			    itemElement.id = `player_${data.requesting_user}`;
			    recoverUser(data.requesting_user).then(item => {
				itemElement.textContent = item.username;
				try {
				    itemElement.dataset.id = data.requesting_user;
				    itemElement.oncontextmenu = function(event) {
					event.preventDefault();
					showGameContextMenu(event, data.requesting_user);
				    };
				    gameListElement.appendChild(itemElement);
				} catch (error) {
				    console.error('Errore durante l\'impostazione dell\'ID:', error);
				}
			    });
			} else {
			    console.error("L'elemento dashboard-gamelist non esiste");
			}
		    }
		} else if (data.type === 'friend_request') {
		    let request = confirm(`${data.requesting_user} vuole aggiungerti come amico`);
	    
		    if (request) {
			let request_url = `/api/request/${data.request_type}/${data.target_user}/`;
			let requestData = {
			    target_user: data.target_user,
			    requesting_user: data.requesting_user,
			    request: 'accept',
			    true: "no"
			};
	    
			fetch(request_url, {
			    method: 'POST',
			    headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${accessToken}`,
				'X-CSRFToken': csrfToken
			    },
			    body: JSON.stringify(requestData)
			}).then(response => {
			    if (response.ok) {
				chatSocket.send(JSON.stringify({
				    'pending_request': 'accept',
				    'request': 'accept',
				    'type': 'accept',
				    'target_user': data.requesting_user,
				    'requesting_user': data.target_user,
				    'request_type': 'accept',
				}));
			    } else {
				console.error('Errore durante l\'invio della richiesta', response.statusText);
			    }
			}).catch(error => {
			    console.error('Errore durante la fetch:', error);
			});
	    
			let friendListElement = document.getElementById("dashboard-friendlist");
			if (friendListElement) {
			    let itemElement = document.createElement('li');
			    itemElement.id = `friend_${data.requesting_user}`;
			    recoverUser(data.requesting_user).then(item => {
				itemElement.textContent = item.username;
				try {
				    itemElement.dataset.id = data.requesting_user;
				    itemElement.oncontextmenu = function(event) {
					event.preventDefault();
					showFriendContextMenu(event, data.requesting_user);
				    };
				    friendListElement.appendChild(itemElement);
				} catch (error) {
				    console.error('Errore durante l\'impostazione dell\'ID:', error);
				}
			    });
			} else {
			    console.error("L'elemento dashboard-friendlist non esiste");
			}
		    }
		} else if (data.type === 'accept') {
		    let friendListElement = document.getElementById("dashboard-friendlist");
	    
		    if (friendListElement) {
			let itemElement = document.createElement('li');
			itemElement.id = `friend_${data.target_user}`;
			recoverUser(data.target_user).then(item => {
			    itemElement.textContent = item.username;
			    try {
				itemElement.dataset.id = data.target_user;
				itemElement.oncontextmenu = function(event) {
				    event.preventDefault();
				    showFriendContextMenu(event, data.target_user);
				};
				friendListElement.appendChild(itemElement);
			    } catch (error) {
				console.error('Errore durante l\'impostazione dell\'ID:', error);
			    }
			});
			alert(`${data.target_user} ha accettato la tua richiesta`);
		    } else {
			console.error("L'elemento dashboard-friendlist non esiste");
		    }
		} else if (data.type === 'remove') {
		    const friendElement = document.getElementById("friend_" + data.target_user);
		    if (friendElement) {
			friendElement.remove();
			alert(`${data.target_user} ha rimosso l'amicizia`);
		    }
		} else if (data.type === 'pending_requests') {
		    let listElementId = 'pending-requests';
		    const listElement = document.getElementById(listElementId);
		    if (listElement) {
			(async function() {
			    const itemList = data.requests;
			    for (const elem of itemList) {
				let itemElement = document.createElement('li');
				itemElement.id = listElementId.slice(0, -1) + '_' + elem.id;
				itemElement.textContent = elem.request_type + ' request from ' + elem.requesting_user.username;
				try {
				    itemElement.dataset.id = elem.id;
				    listElement.appendChild(itemElement);
				} catch (error) {
				    console.error('Errore durante l\'impostazione dell\'ID:', error);
				}
			    }
			})();
		    } else {
			console.error("L'elemento pending-requests non esiste");
		    }
		}
	    };
	}	    

initializeWebSocket();

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
        console.error('Errore durante il recupero dei dati dell\'utente:', error);
        throw error;
    }
}


document.getElementById("addfriendcontext").addEventListener('click', async function(e) {
	const accessToken = localStorage.getItem("accessToken");
	const id = e.target.dataset.id;
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
		// Opzionalmente, puoi gestire la risposta positiva qui
		console.log('Utente bloccato con successo');
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
	const id = e.target.dataset.id;  // ID dell'utente target
	const csrfToken = getCookie('csrftoken');
    
	const requestData = {
	    requesting_user: localStorage.getItem('username'),  // Utente che manda l'invito
	    request: 'pending'  // Stato della richiesta, che potrebbe essere 'pending', 'accepted', ecc.
	};
    
	const requestType = 'game';  // Tipo di richiesta (in questo caso, "game")
	
	// Funzione per verificare la validità del token
	async function checkTokenValidity(url) {
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
    
		    // Invia il messaggio tramite WebSocket per aggiornare in tempo reale
		    chatSocket.send(JSON.stringify({
			'pending_request': 'send',
			'target_user': id,
			'requesting_user': localStorage.getItem('userId'),
			'type': 'game'
		    }));
		}
	    } catch (error) {
		console.error('Errore durante la fetch:', error);
		alert('Errore durante la fetch: ' + error.message);
	    }
	};
    
	await checkTokenValidity(`/api/request/${requestType}/${id}/`);
    });
    
    

document.getElementById("invitetournamentcontext").addEventListener('click', async function(e) {
    const id = e.target.dataset.id;
    loadPage(`api/invite_tournament/${id}/`);

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
			// Opzionalmente, puoi gestire la risposta positiva qui
			console.log('Invito accettato con successo');
		} catch (error) {
			console.error('Errore durante la richiesta:', error);
			}
		}
		checkTokenValidity(`/api/invite_tournament/${id}/`);
}
);

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
			let itemElement = document.createElement('li');
			itemElement.id = `friend_${data.target_user}`;
			recoverUser(data.target_user).then(item => {
				itemElement.textContent = item.username;
				try {
				itemElement.dataset.id = data.target_user;
				itemElement.oncontextmenu = function(event) {
					event.preventDefault();
					showFriendContextMenu(event, data.target_user);
				};
				friendListElement.appendChild(itemElement);
				} catch (error) {
				console.error('Errore durante l\'impostazione dell\'ID:', error);
				}
			});
			alert(`${data.target_user} ha accettato la tua richiesta`);
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
        console.error('Errore durante il recupero dei dati dell\'utente:', error);
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