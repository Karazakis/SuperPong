var chatSocket;


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
		recoverUser(id);
        //console.error('Errore durante il recupero dei dati dell\'utente:', error);
        //throw error;
    }
}


function disableJoinGameButton(){
    let joinGameBtn = document.getElementsByClassName("join-btn");
    for (let i = 0; i < joinGameBtn.length; i++) {
        joinGameBtn[i].disabled = true;
        joinGameBtn[i].style.backgroundColor = "grey";
    }
}

function checkCurrentLobbyandDisable(){
    let userId = localStorage.getItem("userId");
    let baseUrl = window.location.origin;
    let url = baseUrl + "/api/request_status/" + userId + "/";

    fetch(url).catch(error => console.log('Errore durante il recupero della pagina:', error))
    .then(response => response.json())
    .then(data => {
        if(data.game !== null)
        {
            disableJoinGameButton();

            document.getElementById("rejoin-lobby-btn-join").onclick = function() {
                let game_id_lobby = document.getElementById("rejoin-lobby-btn-join").dataset.id;
                document.getElementById("rejoin-lobby").style.display = "none";        
                loadPage(`/api/lobby/${game_id_lobby}/`);
            };
            document.getElementById("rejoin-lobby-btn-join").dataset.type = "game";
            document.getElementById("rejoin-lobby-btn-join").dataset.id = data.game.game;
            document.getElementById("rejoin-lobby").style.display = "block";

        } else if(data.game === null && data.tournament === null) {
            document.getElementById("rejoin-lobby").style.display = "none";
        }
    }).catch(error => console.error('Errore durante il recupero della pagina:', error));
}

function renderHtml(url, html, dash_base, callback, mode = 'not_logged') {
    
    const container_main = document.getElementById('main-container');
    const container_app = document.getElementById('app');

    // Condizione specifica per l'URL contenente "game"
    if (url.includes('game') && !url.includes('forbidden')) {
        if (container_main !== null) {
            container_main.remove();
        }
        // Aggiunta del contenuto della dashboard base se non esiste già e se la modalità è corretta
        if (document.getElementById('dashboard-base-content') !== null) {
            const dashboardBase = document.getElementById('dashboard-base-content');
            dashboardBase.remove();
        }
        let gameDashboardBase = document.createElement('div');
        gameDashboardBase.id = 'game-dashboard-base-content';
        gameDashboardBase.innerHTML = dash_base;
        container_app.appendChild(gameDashboardBase);
        callback();
    } else {
        if(window.inGame)
        {
            window.inGame = false;
        }
        let gameDash = document.getElementById('game-dashboard-base-content');
        let genDash = document.getElementById('dashboard-base-content');
        if(gameDash !== null)
        {
            //TODO chiudere il socket se esiste e togliere i listener
            if(window.GameSocket !== undefined && window.GameSocket !== null)
            {
                window.GameSocket.close();
            }
            gameDash.remove();
        }
        if (url.includes('login') || url.includes('signup') || url.includes('home')) {
            if (genDash !== null) {
                genDash.remove();
            }
        }
        if (genDash !== null) {
            genDash.style.display = 'block'; // Mostra la dashboard quando si esce dal gioco
        }

        if (container_main !== null) {
            container_main.innerHTML = html;
        } else {
            const maincontainerBase = document.createElement('div');
            maincontainerBase.id = 'main-container';
            maincontainerBase.className = "d-flex flex-column d-inline-block";
            maincontainerBase.innerHTML = html;
            container_app.appendChild(maincontainerBase);
        }

        // Aggiunta del contenuto della dashboard base se non esiste già e se la modalità è corretta
        if (genDash === null && (mode === 'logged_nav' || mode === 'dashboard')) {
            const dashboardBase = document.createElement('div');
            dashboardBase.id = 'dashboard-base-content';
            dashboardBase.innerHTML = dash_base;
            container_app.appendChild(dashboardBase);
        }

        callback();  // Chiama la callback dopo aver impostato innerHTML
    }
}



function clearScripts(url) {
    const container = document.getElementById('body');
    const scripts = container.getElementsByTagName('script');
    const scriptArray = Array.from(scripts);

    scriptArray.forEach(script => {
        if ((url.includes('login') || url.includes('signup') || url.includes('home') || url.includes('game')) || script.id !== 'dashboard-base') {
            try {
                // Controlla se lo script ha ancora un parent node prima di tentare la rimozione
                if (script.parentNode === container) {
                    container.removeChild(script);
                }
            } catch (e) {
                console.warn('Errore durante la rimozione dello script:', script, e);
            }
        }
    });
}




function insertScript(url, src, mode = 'not_logged') {
    clearScripts(url); // Pulisci gli script precedenti
    if(mode === 'logged_nav' || mode === 'dashboard')
    {
        if (url.includes('game') && !url.includes('forbidden'))
        {
            const container = document.getElementById('body');
            if(document.getElementById('game-dashboard-base') === null)
            {
                const script = document.createElement('script');
                script.src = window.location.origin + "/static/js/game-dashboard-base.js?v=" + Math.random();
                script.type = 'text/javascript';
                script.id = 'game-dashboard-base';
                script.async = true;
                document.getElementById('body').appendChild(script);
            }
        }
        else
        {
            const container = document.getElementById('body');
            if(document.getElementById('dashboard-base') === null)
            {
                const script = document.createElement('script');
                script.src = window.location.origin + "/static/js/dashboard-base.js";
                script.type = 'text/javascript';
                script.id = 'dashboard-base';
                script.async = true;
                document.getElementById('body').appendChild(script);
            }
        }
    }
    const script = document.createElement('script');
    script.src = window.location.origin + "/static/js/" + src;
    if(src === "game.js")
    {
        script.src += "?v=" + Math.random();
        script.type = 'module';
    }
    else
    {
        script.type = 'text/javascript';
    }
    script.async = 'true';
    document.getElementById('body').appendChild(script);

    if(url.includes('game') || url.includes('lobby'))
    {
        if (url.includes('join'))
        {   
            checkCurrentLobbyandDisable();
        }
    } else {
        if (url.includes('login') || url.includes('signup') || url.includes('home')) {
        } else {
            checkCurrentLobbyandDisable();
        }
    }

}

function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken"); // Assumi di avere salvato il refreshToken in localStorage

    return fetch("/api/token/refresh/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.access) {
            localStorage.setItem("accessToken", data.access);
            return data.access;
        } else {
            throw new Error("Impossibile rinnovare il token di accesso");
        }
    });
}

function loadPage(url) {
    let accessToken = localStorage.getItem("accessToken");
    const baseUrl = window.location.origin + (url.startsWith("/") ? url : "/" + url);
    const refreshUrl = `${window.location.origin}/api/token/refresh/`; // URL per verificare e refreshare il token
    // Funzione per eseguire la richiesta effettiva di caricamento della pagina
    window.previousUrl = url;
    if(window.LobbySocket !== undefined)
    {
        window.LobbySocket.close();
    }
    if(window.GameSocket !== undefined && window.GameSocket !== null)
    {
        window.GameSocket.close();
    }

    if(!url.includes("game")){
        if (window.starSky == null) {
            let canva = document.getElementsByTagName('canvas');
            if (canva) {
                for (let i = 0; i < canva.length; i++) {
                    canva[i].remove();
                }
            }
            window.initStarSky();
            window.animateStarSky();
        }
    }
    const performRequest = (token, url) => {
        
        if (url === "api/home/" || url == "api/login/" || url === "api/signup/") {   
            fetch(baseUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                renderHtml(url, data.html, data.nav_stat, function() {
                    // Questa callback viene eseguita dopo che l'HTML è stato inserito
                    insertScript(url, data.scripts, data.nav_stat);  // Ora puoi inserire gli script
                }, data.nav_stat);
                newUrl = data.url.startsWith("/") ? data.url : "/" + data.url;
                if (newUrl !== window.location.pathname) {
                    history.pushState({page: newUrl}, newUrl, newUrl);
                }
            })
            .catch(error => console.error('Errore durante il recupero della pagina:', error));
        } else {
            headers = {
                "Authorization": `Bearer ${token}`
            };
            fetch(baseUrl, {
                method: "GET",
                headers: headers
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else if (response.status === 401) {
                    return { 'status': 'not_logged' };
                } else {
                    throw new Error('Network response was not ok');
                }
            })
            .then(data => {
                if (data.status === 'not_logged') {
                    loadPage("api/home/");
                    return;
                }
                renderHtml(url, data.html, data.dash_base, function() {
                    insertScript(url, data.scripts, data.nav_stat);
                }, data.nav_stat);
                let newUrl = data.url.startsWith("/") ? data.url : "/" + data.url;
                newUrl = newUrl.endsWith("/") ? newUrl : newUrl + "/";
                if (newUrl !== window.location.pathname) {
                    history.pushState({ page: newUrl }, newUrl, newUrl);
                }
            })
            .catch(error => {
                loadPage("api/dashboard/");
                console.warn('Errore durante il recupero della pagina:', error);
            });
        }
    };

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
                        loadPage("api/home/");
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
    

    if (url !== "api/home/" && url !== "api/login/" && url !== "api/signup/") {
        checkTokenValidity(url);
    } else {
        performRequest(accessToken, url);
    }
}

function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken"); // Supponendo che tu abbia memorizzato il refresh token
    return fetch(`${window.location.origin}/api/token/refresh/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh: refreshToken })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access) {
            localStorage.setItem("accessToken", data.access);
            return data.access;
        } else {
            return null; // Token non valido
        }
    })
    .catch(error => {
        console.error('Errore durante il refresh del token:', error);
        return null;
    });
}


async function checkUserPermission(page) {
    const url = page;

    if ((url.includes("local") || url.includes("single")) && !url.includes("create")) {
        return false;
    } else {
        if (url.includes("lobby")) {
            if (url.includes("tournament")) {
                //qui andrebbe fatto: recuperato l'id dek torneo attuale, recuperata la lista dei tornei giocati e vedere se l'id e negli id della lista
                return true;
            } else {
                let sanitizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;
                let lobbyId = parseInt(sanitizedUrl.split("/").pop());

                let data = await recoverUser(localStorage.getItem("userId"));
                if (data) {
                    let lobby = data.in_game_lobby;
        
                    return lobby === lobbyId;
                }
            }
        } else {
            let sanitizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;
            let gameId = sanitizedUrl.split("/").pop();

            let data = await recoverUser(localStorage.getItem("userId"));
            if (data) {
                let game = data.game_history;
                for (let element of game) {
                    if (element.id == gameId) {
                        if (element.status != "finished" && element.status != "not_started") {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
            }
        }
    }
    return false;
}


document.addEventListener("DOMContentLoaded", function() {
    let page = window.location.pathname;
    if (page.includes("home") || page.includes("login") || page.includes("signup")) {
       loadPage("api" + page);
       return;
    }

    checkUserPermission(page).then((check) => {
        
        if (localStorage.getItem("accessToken") === null) {
            loadPage("api/home/");
        } else if ((page.includes("game") || page.includes("lobby")) && check === false) {
            if (page.includes("game")) {
                loadPage("api/forbidden/game/");
            } else {
                loadPage("api/forbidden/lobby/");
            }
        } else {
            if (window.location.pathname == "/") {
                loadPage("api/dashboard/");
            } else {
                if (page.includes("create")) {
                    let parts = page.split("_");
                    const sourcePart = parts[1].replace(/\/$/, "");
                    let apiUrl = `api${parts[0]}/?source=${sourcePart}`;
                    loadPage(apiUrl);
                } else {
                    loadPage("api" + window.location.pathname);
                }
            }
        }
    });
    
    window.onpopstate = function(event) {
        console.log('popstate', event, window.previousUrl);
        event.preventDefault();
        
        if (window.previousUrl.includes("game") && !window.previousUrl.includes("forbidden")) {
            
            let confirmLeave = confirm("Are you sure you want to leave the game?");
            if (confirmLeave) {
                console.log('leavegame'); 
                gameEnded = true;
                new Promise(resolve => {
                    setTimeout(resolve, 20);
                });

                if (document.getElementById('game-details').dataset.gameStatus !== 'finished' && document.getElementById('gametype').textContent !== 'local-game') {
                    if (document.getElementById("leavegame").dataset.posit === "p1") {
                        endgameOnline(true, true);
                    }
                    window.GameSocket.send(JSON.stringify({ action: "leave" }));
                    console.log('leave');
                }
                history.pushState({ page: window.previousUrl }, window.previousUrl, window.previousUrl);
                const event = new Event('cleanupGameEvent');
                document.dispatchEvent(event);
                let gameType = document.getElementById('gametype').textContent;
                if (gameType === 'tournament') {
                    let tournament_id = document.getElementById('gametype').dataset.tournament;
                    window.joinTournament(tournament_id);
                } else if (gameType === 'local-game') {
                    gameover(-1, -1, true, true);
                    loadPage('api/dashboard/');
                } else {
                    loadPage('api/dashboard/');
                }
                return;
            } else {
                let cleanUrl = window.previousUrl.replace("api", "");
                console.log('il previous', cleanUrl);
                window.previousUrl = event.state.page;
                history.pushState({ page: cleanUrl }, cleanUrl, cleanUrl);
                return;
            }
        }

        if (event.state === null) {
            loadPage("api/dashboard/");
            return;
        }

        let page = event.state.page;
        if (page.includes("create")) {
            const parts = page.split("_");
            const sourcePart = parts[1].replace(/\/$/, "");
            const apiUrl = `api${parts[0]}/?source=${sourcePart}`;
            loadPage(apiUrl);
        } else if (page.includes("game") || page.includes("lobby")) {
            if (checkUserPermission(page) == true) {
                loadPage("api" + page);
            }
            else
            {
                if (page.includes("game")) {
                    loadPage("api/forbidden/game/");
                }
                else
                {
                    loadPage("api/forbidden/lobby/");
                }
            }

        }
        else
        {
            loadPage("api" + page);
        }
    };
    
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
