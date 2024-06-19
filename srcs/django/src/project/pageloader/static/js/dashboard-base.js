document.getElementById('profile').addEventListener('click', function() {    
    var userId = localStorage.getItem('userId'); // Assicurati che 'userId' sia la chiave corretta
    if (userId) {
        loadPage("api/profile/" + userId + '/');
    } else {
        console.error("ID utente non trovato in localStorage.");
        // Gestisci l'assenza di un ID utente, ad esempio reindirizzando all'homepage o mostrando un messaggio
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
            console.log('Logout effettuato con successo');
            return response.json();
        })
        .then(data => {
            if(data.success) {
                console.log('Logout effettuato con successo');
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
url = `wss://${window.location.host}/wss/socket-server/?id=${id}`;
var chatSocket = new WebSocket(url);

chatSocket.onopen = function(event) {
    chatSocket.send(JSON.stringify({
        'user_list': 'get',
    }));
    /* 
    chatSocket.send(JSON.stringify({
        'pending_request': 'get',
    }));
    chatSocket.send(JSON.stringify({
        'friend_list': 'get',
    }));
    */
};

chatSocket.onmessage = function(e) {
    let data = JSON.parse(e.data);
    console.log(data);
    if(data.type === 'message') {
        let messages = document.getElementById('messages')
        
        messages.insertAdjacentHTML('beforeend' , `<div class="d-flex justify-content-start" style="heigth: 2vh;" ><span><strong>${data.player}:</strong>${data.message}</span></div>`);
        messages.scrollTop = messages.scrollHeight;
    }
    else if (data.type === 'user_list' || data.type === 'friend_list' || data.type === 'pending_request'){
        //e qui poi tu fai il delirio e aggiungi tutte le liste nei vari posti come fatto per user_list

        const users_ele = document.getElementById('users');
        users_ele.innerHTML = '';
        (async function() {
            const userlist = data.list;
            for (const id of userlist) {
                let userElement = document.createElement('li');
                userElement.id = 'user_' + id;
                const user = await recoverUser(id);
                userElement.textContent = user.username;

                try {
                    userElement.dataset.id = id;
                    userElement.oncontextmenu = function(event) {
                        event.preventDefault();
                        showContextMenu(event, id);
                    };
                    users_ele.appendChild(userElement);
                } catch (error) {
                    console.error('Errore durante l\'impostazione dell\'ID utente:', error);
                }
            }
        })();
    }
    else if (data.type === 'pending_request') {
        if(data.request === 'get') {
            //
            let request = confirm(`${data.requesting_user} vuole aggiungerti come amico`);
            if(request) {
                //PER DIEGO fare fetch per modificare lo stato della richiesta
                //PER DIEGO aggiungere in entrambi gli utenti l'altro come amico
                if ('requesting_user' in data) {
                    chatSocket.send(JSON.stringify({
                        'pending_request': 'accept',
                        'target_user': data.requesting_user,
                        'requesting_user': data.target_user,
                        'type': data.request_type,
                    }));
                } else {
                    console.error("Il campo 'requesting_user' non è presente nei dati.");
                }
            }
        }
        else if(data.request === 'accept') {
            //if else per gestire i diversi type
            alert(`${data.target_user} ha accettato la tua richiesta`);
            //aggiungere nella fiendlist della dashboard nuovo amigo
        }
    }
};


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


function showContextMenu(event, id) {
    // Ottieni il menu contestuale
    const contextMenu = document.getElementById("contextMenu");
    const addfriendcontext = document.getElementById("addfriendcontext");
    const viewpfoilecontext = document.getElementById("viewprofilecontext");
    const blockusercontext = document.getElementById("blockusercontext");
    // Posiziona il menu contestuale in base alla posizione del clic

    addfriendcontext.dataset.id = id;
    viewpfoilecontext.dataset.id = id;
    blockusercontext.dataset.id = id;

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
    const accessToken = localStorage.getItem("accessToken");

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
        targetUserId: id,
        requestingUser: localStorage.getItem('username'),
    };

    const requestType = 'friend';  // Tipo di richiesta, potrebbe essere "friend" in questo caso

    const response = await fetch(`/api/request/${requestType}/${id}/`, {  // Aggiorna l'URL con il tipo di richiesta
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        console.error('Errore durante l\'invio della richiesta');
    } else {
        chatSocket.send(JSON.stringify({
            'pending_request': 'get',
            'target_user': id,
            'requesting_user': localStorage.getItem('userId'),
            'type': 'friend'
        }));
    }
});


document.getElementById("viewprofilecontext").addEventListener('click', async function(e) {
    const id = e.target.dataset.id;
    loadPage(`api/profile/${id}/`);
});


document.getElementById("blockusercontext").addEventListener('click', async function(e) {
    let accessToken = localStorage.getItem("accessToken");
    const id = e.target.dataset.id;
    const response = await fetch(`/api/block_user/${id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${accessToken}`
        },
    });

    if (!response.ok) {
        console.error('Errore durante il blocco dell\'utente');
    } else {
        console.log('Utente bloccato con successo');
    }
});
