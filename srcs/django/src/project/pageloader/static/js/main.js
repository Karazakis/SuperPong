var chatSocket;

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
            dashboardBase.style.display = 'none';
        }
        let gameDashboardBase = document.createElement('div');
        gameDashboardBase.id = 'game-dashboard-base-content';
        gameDashboardBase.innerHTML = dash_base;
        container_app.appendChild(gameDashboardBase);
        callback();
    } else {
        let gameDash = document.getElementById('game-dashboard-base-content');
        let genDash = document.getElementById('dashboard-base-content');
        if(gameDash !== null)
        {
            gameDash.remove();
        }
        if (url.includes('login') || url.includes('signup') || url.includes('home')) {
            if (genDash !== null) {
                genDash.remove();
            }
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
        if (document.getElementById('dashboard-base-content') === null && (mode === 'logged_nav' || mode === 'dashboard')) {
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
                container.removeChild(script);
            } catch (e) {
                console.warn('Failed to remove script:', script, e);
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
                script.src = window.location.origin + "/static/js/game-dashboard-base.js";
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
      script.type = 'module';
    }
    else
    {
        script.type = 'text/javascript';
    }
    script.async = 'true';
    document.getElementById('body').appendChild(script);
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
    if(url !== "api/home/" && url !== "api/login/" && url !== "api/signup/")
    {
        fetch(baseUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json(); // Gestione del successo
            } else if (response.status === 401) { // Token di accesso potenzialmente scaduto
                return refreshAccessToken().then(newAccessToken => {
                    accessToken = newAccessToken; // Aggiorna il token di accesso per le richieste future
                    return fetch(baseUrl, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${newAccessToken}`
                        }
                    });
                })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    } else if (response.status === 401) {
                        data = {'status': 'not_logged'};
                        return data
                    } else {
                        throw new Error('Network response was not ok');
                    }
                });
            } else {
                throw new Error('Network response was not ok');
            }
        })
        .then(data => {
            if(data.status === 'not_logged')
            {
                loadPage("api/login/");
                return;
            }
            renderHtml(url, data.html, data.dash_base, function() {
                insertScript(url, data.scripts, data.nav_stat);
            }, data.nav_stat);
            newUrl = data.url.startsWith("/") ? data.url : "/" + data.url;
            newUrl = newUrl.endsWith("/") ? newUrl : newUrl + "/";
            if (newUrl !== window.location.pathname) {
                history.pushState({page: newUrl}, newUrl, newUrl);
            }
        })
        .catch(error => console.error('Errore durante il recupero della pagina:', error));
    }
    else
    {
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
    }
}

document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname == "/")
    {
        loadPage("api/home/");
    }
    else
    {
        loadPage("api" + window.location.pathname);
    }
    
    window.onpopstate = function(event) {
        event.preventDefault();
        loadPage("api" + event.state.page);
    };
    
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}