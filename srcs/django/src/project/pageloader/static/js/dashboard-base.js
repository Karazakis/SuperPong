document.getElementById('profile').addEventListener('click', function() {    
    var userId = localStorage.getItem('userId');
    if (userId) {
        loadPage("api/profile/" + userId + '/');
    } else {
        console.error("ID utente non trovato in localStorage.");
    }
}
);

document.getElementById('settings').addEventListener('click', function() {
    loadPage("api/settings/");
});

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
				window.chatSocket.close();
                loadPage("api/home/");
            }
        })
        .catch(error => console.error('Errore durante il recupero della pagina:', error));
}
);

window.chatSocket = null;
function initializeWebSocket() {
	if (window.chatSocket !== null) {
        window.chatSocket.close();
    }
	let id = localStorage.getItem('userId');
	let url = `wss://${window.location.host}/wss/socket-server/?id=${id}`;
	window.chatSocket = new WebSocket(url);
	window.chatSocket.onopen = async function(event) {
		var id = localStorage.getItem('userId');
		window.chatSocket.send(JSON.stringify({
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

	window.chatSocket.onmessage = function(e) {
		let data = JSON.parse(e.data);
	    
		const accessToken = localStorage.getItem("accessToken");
		const csrfToken = getCookie('csrftoken');
		const userId = localStorage.getItem("userId");
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
							actualUser = await recoverUser(actualUserId)
							handlePrivateMessage(data, actualUser.nickname, actualUser.username);
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
		    let listElement = document.getElementById(listElementId);
		    if (listElement) {
			(async function() {
			    const itemList = data.list;
			    const elementsToAdd = [];
				const existingIds = new Set();
			    const actualUserId = localStorage.getItem('userId');
			    const actualUser = await recoverUser(actualUserId);
			    const blockedUsers = actualUser.blocked_userslist || [];
				listElement.innerHTML = '';

			    for (const id of itemList) {
					const itemElementId = listElementId.slice(0, -1) + '_' + id;
			
					if (!existingIds.has(itemElementId) && !document.getElementById(itemElementId)) {
						let itemElement = document.createElement('li');
						itemElement.id = itemElementId;
			
						try {
							const item = await recoverUser(id);
							let isblocked = blockedUsers.some(blockedUser => blockedUser.id == id);
				
							if (isblocked) {
								itemElement.classList.add('user-blocked');
							}
							itemElement.textContent = item.nickname;
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
	    
			    elementsToAdd.forEach(element => {
					if (!listElement.querySelector(`#${element.id}`)) {
						listElement.appendChild(element);
					}
				});
				
			})();
		    } else {
				
		    }
		} else if (data.type === 'invite_game') {
			handleGameInvite(data, accessToken, csrfToken);		    
		} else if (data.type === 'friend_request') {
			handleFriendRequest(data, accessToken, csrfToken);
		} else if (data.type === 'accept') {
			updateRequestStatus(data);
		} else if (data.type === 'decline') {
			updateRequestStatus(data);
		} else if (data.type === 'remove') {
			updateRequestStatus(data);
		} else if (data.type === 'pending_request') {
			if (data.request_type === 'game') {
			    handleGameInvite(data);
			} else if (data.request_type === 'friend') {
				handleFriendRequest(data, accessToken, csrfToken);
			} else if (data.request_type === 'tournament') {
				handleTournamentInvite(data);
			}
		}
	    };
	}

initializeWebSocket();

 async function handleGameInvite(data, accessToken, csrfToken) {

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

    let actualRequestingUser = await recoverUser(data.requesting_user)
    let invite = window.confirm(`${actualRequestingUser.nickname} invited you to a game`);
    if (invite) {
		let pathname = window.location.pathname;
		if (pathname.includes('lobby') === true && pathname.includes('join') === false) {
			alert("Sei già in una lobby");
			return;
		}
		joinGame(data.target_lobby);
    } else {
		window.chatSocket.send(JSON.stringify({
			'type': 'decline',
			'pending_request': 'decline',
			'target_user': data.requesting_user,
			'requesting_user': data.target_user,
			'lobby_id': data.target_lobby
		}));
    }
}


async function handleTournamentInvite(data, accessToken, csrfToken) {

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
	
    let actualRequestingUser = await recoverUser(data.requesting_user)        
    let invite = window.confirm(`${actualRequestingUser.nickname} invited you to a tournament.`);
    if (invite) {
		let pathname = window.location.pathname;
		if (pathname.includes('lobby') === true) {
			alert("Sei già in una lobby");
			return;
		}
		joinTournament(data.target_lobby);
    } else {
		window.chatSocket.send(JSON.stringify({
			'type': 'decline',
			'pending_request': 'decline',
			'target_user': data.requesting_user,
			'requesting_user': data.target_user,
			'lobby_id': data.target_lobby
		}));
    }
}


async function updateGameInviteStatus(data) {
    let actualTargetUser = await recoverUser(data.target_user)	
    let message;
    switch (data.type) {
        case 'accept':
            message = `${actualTargetUser.nickname} ha accettato l'invito a giocare`;
            break;
        case 'decline':
            message = `${actualTargetUser.nickname} ha rifiutato l'invito a giocare`;
            break;
        default:
            console.error('Unhandled game status update:', data.type);
            return;
    }
    alert(message);
}

async function handleFriendRequest(data, accessToken, csrfToken) {
	let pathname = window.location.pathname;
    let actualRequestingUser = await recoverUser(data.requesting_user)
	let user = await recoverUser(data.target_user)    
    let request = window.confirm(`${actualRequestingUser.nickname} wants to add you as a friend`);
    if (request) {
        processFriendRequest('accept', data, accessToken, csrfToken);
		if (pathname.includes('game') === false){
			updateFriendListFromServer();
		}
    } else {
        processFriendRequest('decline', data, accessToken, csrfToken);
		if (user.pending_requests !== undefined) {
			if (pathname.includes('game') === false) {
				UpdateRequestList(user);
			}
		}
    }
}

async function processFriendRequest(action, data, accessToken, csrfToken) {
	let pathname = window.location.pathname;

	const requestData = {
        target_user: data.target_user,
        requesting_user: data.requesting_user,
        request: action
    };
	
	async function checkTokenValidity() {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    return;
		} else if (data.message === 'Token non valido') {
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;
			localStorage.setItem("accessToken", newAccessToken);
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

	await checkTokenValidity()
	
	try {
	    const response = await fetch(`/api/request/friend/${data.requesting_user}/`, {
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
		
			window.chatSocket.send(JSON.stringify({
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
	if (pathname.includes('game') === false) {
		updateFriendListFromServer();
	}
}

async function updateRequestStatus(data) {
    let actualRequestingUser = await recoverUser(data.requesting_user)
    let actualTargetUser = await recoverUser(data.target_user)
    let message;
    switch (data.type) {
        case 'accept':
            message = `${actualTargetUser.nickname} accepted your request`;
            break;
        case 'decline':
            message = `${actualTargetUser.nickname} declined your request`;
            break;
        case 'remove':
		message = `${actualTargetUser.nickname} removed friendship`;
		break;
        default:
            console.error('Unhandled status update:', data.type);
            return;
    }
    alert(message);


    let pathname = window.location.pathname;
    if (pathname.includes('game') === false) {
	updateFriendListFromServer();
    }
}


async function updatePendingRequestsFromServer() {
    const userId = localStorage.getItem('userId');
    try {
        const response = await fetch(`/api/pending-requests/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch pending requests');
        const pendingRequests = await response.json();
        const listElement = document.getElementById('pending-requests');
        listElement.innerHTML = '';

        pendingRequests.forEach(request => {
            const item = document.createElement('li');
            item.textContent = `Request from ${request.requesting_user.nickname}`;
            listElement.appendChild(item);
        });
    } catch (error) {
        console.error('Error updating pending requests:', error);
    }
}



async function updateFriendListFromServer() {
    const userId = localStorage.getItem('userId');
    try {
        const user = await recoverUser(userId);
        if (!user) {
            throw new Error('Errore durante il recupero dei dati utente');
        }
        let friendListElement = document.getElementById("dashboard-friendlist");
        if (!friendListElement) {
            console.error("Elemento della lista amici non trovato");
            return;
        }

        friendListElement.innerHTML = '';

        for (let friend of user.user_friend_list) {
            let itemElement = document.createElement('li');
            itemElement.id = `friend_${friend.id}`;
            itemElement.textContent = friend.nickname;
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



function handlePrivateMessage(data, currentNickname, currenteUsername) {
    const endOfUsernameIndex = data.message.indexOf(' ');
    const targetNickname = data.message.substring(1, endOfUsernameIndex);
    const messageContent = data.message.substring(endOfUsernameIndex + 1);


    if (currentNickname === targetNickname) {
        displayMessage({ player: data.nickname, nickname: data.nickname, message: messageContent }, 'green');
    }

    if (data.player === currenteUsername) {
        const formattedMessage = `(a ${targetNickname}) ${messageContent}`;
        displayMessage({ player: data.nickname, nickname: data.nickname, message: formattedMessage }, 'green');
    }
}

function displayMessage(data, color) {
    let messages = document.getElementById('messages');
    if (messages) {
        messages.insertAdjacentHTML('beforeend', `<div class="d-flex justify-content-start" style="height: 2vh;"><span style="color: ${color};"><strong>${data.nickname}:</strong> ${data.message}</span></div>`);
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
	    itemElement.textContent = friend.nickname;
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

async function UpdateRequestList(user) {
	let listElementId = 'pending-requests';
	const listElement = document.getElementById(listElementId);
	let reqUser;
	for (let request of user.pending_requests) {
		let itemElement = document.createElement('li');
	    itemElement.id = listElementId.slice(0, -1) + '_' + request.id;
		reqUser = await recoverUser(request.requesting_user_id);
	    itemElement.textContent = request.request_type + ' request from ' + reqUser.nickname;
		
	    try {
			itemElement.dataset.id = request.id;
			itemElement.dataset.requesting_user = request.requesting_user_id;
			itemElement.dataset.target_user = request.target_user_id;
			itemElement.oncontextmenu = function(event) {
				event.preventDefault();
				showRequestContextMenu(event, request.id, request.requesting_user_id, request.target_user_id);
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
    window.chatSocket.send(JSON.stringify({
        'message': message,
        'username': username
    }));
    form.reset();
});


function showContextMenu(event, id, isblocked = false) {
    const contextMenu = document.getElementById("contextMenu");
    const addfriendcontext = document.getElementById("addfriendcontext");
    const viewpfoilecontext = document.getElementById("viewprofilecontext");
    const blockusercontext = document.getElementById("blockusercontext");
    let pathname = window.location.pathname;
    if (pathname.includes('lobby') === true) {
	viewpfoilecontext.style.display = "none";
    }
    else {
	viewpfoilecontext.style.display = "block";
    }

    addfriendcontext.dataset.id = id;
    viewpfoilecontext.dataset.id = id;
    blockusercontext.dataset.id = id;
    if (isblocked) {
	blockusercontext.textContent = "Unlock User";
}
    contextMenu.style.left = event.pageX + "px";
    contextMenu.style.top = event.pageY + "px";

    contextMenu.style.display = "block";
    
    window.onclick = function() {
        contextMenu.style.display = "none";
    };
}

function showFriendContextMenu(event, id, username) {
    const contextMenu = document.getElementById("friendContextMenu");
    const invitegamecontext = document.getElementById("invitegamecontext");
    const invitetournamentcontext = document.getElementById("invitetournamentcontext");
    const removefriendcontext = document.getElementById("removefriendcontext");
	let pathname = window.location.pathname;
	if (pathname.includes('lobby') === false && pathname.includes('tournament') === false)
	{
		invitegamecontext.style.display = "none";
		invitetournamentcontext.style.display = "none";
	}
	else if (pathname.includes('lobby') === true && pathname.includes('tournament') === false)
	{
		invitegamecontext.style.display = "block";
		invitetournamentcontext.style.display = "none";
	}
	else if (pathname.includes('lobby') === true && pathname.includes('tournament') === true)
	{
		invitegamecontext.style.display = "none";
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

    contextMenu.style.display = "block";

    window.onclick = function() {
        contextMenu.style.display = "none";
    };
}

function showRequestContextMenu(event, id, requesting_user, target_user) {
    const contextMenu = document.getElementById("requestContextMenu");
    const acceptrequestcontext = document.getElementById("acceptrequestcontext");
    const declinerequestcontext = document.getElementById("declinerequestcontext");

    acceptrequestcontext.dataset.id = id;
	acceptrequestcontext.dataset.requesting_user = requesting_user;
	acceptrequestcontext.dataset.target_user = target_user;
    declinerequestcontext.dataset.id = id;
	declinerequestcontext.dataset.requesting_user = requesting_user;

    contextMenu.style.left = event.pageX + "px";
    contextMenu.style.top = event.pageY + "px";

    contextMenu.style.display = "block";

    window.onclick = function() {
        contextMenu.style.display = "none";
    };
}
    
    


async function recoverUser(id) {
	if (id == null) {
		return;
	}
    let accessToken = localStorage.getItem("accessToken");
	const checkAndRefreshToken = async () => {
        try {
            const response = await fetch(`/api/token/refresh/?token=${accessToken}`, {
                method: 'GET',
            });

            const data = await response.json();

            if (data.message === 'Token valido') {
                return accessToken;
            } else if (data.message === 'Token non valido') {
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

    accessToken = await checkAndRefreshToken();
    if (!accessToken) {
        return;
    }
    try {
        const response = await fetch(`/api/request_user/${id}/`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        const text = await response.text();  

        if (!response.ok) {
            console.error(`Errore nella risposta della rete: ${response.status} ${response.statusText}`);
            throw new Error('Network response was not ok');
        }

        const data = JSON.parse(text);  

        return data; 

    } catch (error) {
		console.log("DA ERRORE MA L'ID è: ",id);
		
    }
}


document.getElementById("addfriendcontext").addEventListener('click', async function(e) {
	const accessToken = localStorage.getItem("accessToken");
	const id = e.target.dataset.id;
	if (id === localStorage.getItem('userId')) {
		alert('You cant add yourself as friend');
		return;
	}
	const csrfToken = getCookie('csrftoken');

	const user = await recoverUser(localStorage.getItem('userId'));
    const alreadyFriend = user.user_friend_list.some(friend => friend.id === id);

    if (alreadyFriend) {
        alert('Questo utente è già nella tua lista di amici');
        return;
    }

	const requestData = {
	    requesting_user: localStorage.getItem('username'),
	    request: 'pending'
	};
	
	const requestType = 'friend';
	
	async function checkTokenValidity() {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    return;
		} else if (data.message === 'Token non valido') {
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;
			localStorage.setItem("accessToken", newAccessToken);
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
    
	await checkTokenValidity();
	
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
			const responseData = await response.json();
			if (responseData.already_exists) { 
				alert('La richiesta è in attesa di essere accettata o rifutata');
			} else if (responseData.already_friend) {
				alert('The user is already a friend.')
			} else {
				alert('Friend request sent');
				window.chatSocket.send(JSON.stringify({
					'pending_request': 'send',
					'target_user': id,
					'requesting_user': localStorage.getItem('userId'),
					'type': 'friend'
				}));
			}	
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
	if (id === localStorage.getItem('userId')) {
		alert('Non puoi bloccare te stesso');
		return;
	}

	async function checkTokenValidity(url) {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    await performRequest(accessToken, url);
		} else if (data.message === 'Token non valido') {
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;
			localStorage.setItem("accessToken", newAccessToken);
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
	let accessToken = localStorage.getItem("accessToken");
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
	async function checkTokenValidity(url, requestType) {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    await performRequest(accessToken);
		} else if (data.message === 'Token non valido') {
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;
			localStorage.setItem("accessToken", newAccessToken);
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
	const performRequest = async (token, url, requestType) => {
	    try {
		const response = await fetch(url, {
		    method: 'POST',
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

			if (requestType === undefined) {
				requestType = 'game';
			}
			lobbyId = window.location.pathname.split('/').filter(part => part !== '').pop();
		    window.chatSocket.send(JSON.stringify({
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
	if (requestType === 'game') {
		await checkTokenValidity(`/api/request/${requestType}/${id}/`, requestType);
	}
});
    
    

document.getElementById("invitetournamentcontext").addEventListener('click', async function(e) {
	let accessToken = localStorage.getItem("accessToken");
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
	async function checkTokenValidity(url, requestType) {
	    try {
		const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
		    method: "GET"
		});
		const data = await response.json();
    
		if (data.message === 'Token valido') {
		    await performRequest(accessToken);
		} else if (data.message === 'Token non valido') {
		    const newAccessToken = await refreshAccessToken();
		    if (newAccessToken) {
			accessToken = newAccessToken;
			localStorage.setItem("accessToken", newAccessToken);
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
    
	const performRequest = async (token, url, requestType) => {
	    try {
		const response = await fetch(url, {
		    method: 'POST',
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
			if (requestType === undefined) {
				requestType = 'tournament';
			}
			lobbyId = window.location.pathname.split('/').filter(part => part !== '').pop();
		    window.chatSocket.send(JSON.stringify({
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
	window.chatSocket.send(JSON.stringify({
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
	const target_user = e.target.dataset.target_user;
	let user_id = localStorage.getItem('userId')

	const responseData = {
		target_user: target_user,
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
		window.chatSocket.send(JSON.stringify({
			'type': 'accept',
			'target_user': e.target.dataset.requesting_user,
			'requesting_user': e.target.dataset.target_user,
			'request_type': 'accept',
			'pending_request': 'accept'
		}));

		actual_user = await recoverUser(user_id)
		UpdateFriendList(actual_user)
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

