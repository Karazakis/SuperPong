var chatSocket;


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
    console.log("url nel:",url);

    fetch(url).catch(error => console.error('Errore durante il recupero della pagina:', error))
    .then(response => response.json())
    .then(data => {
        console.log("nel check",data);
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
            document.getElementById("rejoin-lobby-btn-leave").onclick = function() {
                let game_id_lobby = document.getElementById("rejoin-lobby-btn-join").dataset.id;
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
                        document.getElementById("rejoin-lobby").style.display = "none";
                    } else {
                        return response.json().then(data => { throw new Error(data.error); });
                    }
                })
                .catch(error => console.error('Error:', error));
            };
            document.getElementById("rejoin-lobby-btn-leave").dataset.type = "game";
            document.getElementById("rejoin-lobby-btn-leave").dataset.id = data.game.game;
            document.getElementById("rejoin-lobby").style.display = "block";

        } else if(data.game === null && data.tournament === null) {
            document.getElementById("rejoin-lobby").style.display = "none";
        }/* else if(data.tournament !== null) {
            disableJoinGameButton();
            document.getElementById("rejoin-lobby-btn-join").dataset.type = "tournament";
            document.getElementById("rejoin-lobby-btn-join").dataset.id = data.tournament.tournament.id;
            document.getElementById("rejoin-lobby-btn-leave").dataset.type = "tournament";
            document.getElementById("rejoin-lobby-btn-leave").dataset.id = data.tournament.tournament.id;
            document.getElementById("rejoin-lobby").style.display = "block";
        }  */
    }).catch(error => console.error('Errore durante il recupero della pagina:', error));
}

function renderHtml(url, html, dash_base, callback, mode = 'not_logged') {
    
    const container_main = document.getElementById('main-container');
    const container_app = document.getElementById('app');

    // Condizione specifica per l'URL contenente "game"
    if (url.includes('game')) {
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
        if (url.includes('game'))
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
            console.log("checkCurrentLobbyandDisable");
            checkCurrentLobbyandDisable();
        }
    } else {
        if (url.includes('login') || url.includes('signup') || url.includes('home')) {
            console.log("niente");
        } else {
            console.log("checkCurrentLobbyandDisable");
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

// function isAuthenticated() {
//     const accessToken = localStorage.getItem("accessToken");
//     return accessToken !== null;
// }

function loadPage(url) {
    let accessToken = localStorage.getItem("accessToken");
    const baseUrl = window.location.origin + (url.startsWith("/") ? url : "/" + url);
    const refreshUrl = `${window.location.origin}/api/token/refresh/`; // URL per verificare e refreshare il token
    console.log("baseUrl:", baseUrl);
    // Funzione per eseguire la richiesta effettiva di caricamento della pagina
    if(window.LobbySocket !== undefined)
    {
        console.log("chiudo lobby socket");
        window.LobbySocket.close();
    }
    if(window.GameSocket !== undefined && window.GameSocket !== null)
    {
        window.GameSocket.close();
    }

    if(!url.includes("game")){
        if (window.starSky == null) {
            window.initStarSky();
            window.animateStarSky();
        }
    }
    const performRequest = (token, url) => {
        console.log("url:", url);  
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
                    loadPage("api/login/");
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
                console.error('Errore durante il recupero della pagina:', error);
            });
        }
    };

    // Funzione per eseguire la verifica e il refresh del token
    function checkTokenValidity(url) {
        // Rimuovi l'intestazione Authorization per la richiesta GET di verifica del token
        fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
            method: "GET"
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Token valido') {
                // Token valido, procedi con la richiesta effettiva
                performRequest(accessToken, url);
            } else if (data.message === 'Token non valido') {
                // Token non valido, prova a rinfrescare
                return refreshAccessToken().then(newAccessToken => {
                    if (newAccessToken) {
                        accessToken = newAccessToken;  // Aggiorna il token di accesso per le richieste future
                        localStorage.setItem("accessToken", newAccessToken);
                        // Richiesta effettiva con nuovo token
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
    

    // Controllo URL per decidere se fare la richiesta pilota
    if (url !== "api/home/" && url !== "api/login/" && url !== "api/signup/") {
        checkTokenValidity(url);
    } else {
        performRequest(accessToken, url); // Carica direttamente se è una delle pagine libere
    }
}

// Funzione per rinfrescare il token di accesso
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


document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname == "/")
    {
        loadPage("api/home/");
    }
    else
    {
        let page = window.location.pathname;
    
        if (page.includes("create")) {
            let parts = page.split("_");
            let apiUrl = `api${parts[0]}/?source=${parts[1]}`;
            console.log("apiUrl:", apiUrl);
            loadPage(apiUrl);
        } else {
            loadPage("api" + window.location.pathname);
        }
    }
    
    window.onpopstate = function(event) {
        console.log("I tasti del browser sono stati premuti ", event.state.page);
        event.preventDefault();
        let page = event.state.page;
    
        if (page.includes("create")) {
            const parts = page.split("_");
    
            // Rimuovi eventuali slash finali da parts[1]
            const sourcePart = parts[1].replace(/\/$/, "");
    
            const apiUrl = `api${parts[0]}/?source=${sourcePart}`;
            console.log("apiUrl:", apiUrl);
            loadPage(apiUrl);
        } else {
            // Se la stringa non contiene "create", carica la pagina con l'URL standard
            loadPage("api" + page);
        }
    };
    
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}