function toggleRuleInput() {
    const ruleSelect = document.getElementById('rule');
    const timeOptions = document.getElementById('timeOptions');
    const scoreOptions = document.getElementById('scoreOptions');
    
    if (ruleSelect.value === 'time') {
        timeOptions.style.display = 'block';
        scoreOptions.style.display = 'none';
    } else if (ruleSelect.value === 'score') {
        scoreOptions.style.display = 'block';
        timeOptions.style.display = 'none';
    }
}
document.getElementById('rule').addEventListener('change', toggleRuleInput);

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/remote/");
    });
}

document.getElementById('create').addEventListener('click', function(event) {
    event.preventDefault();
    const actual_url = window.location.href;
    let Type = 'default';
    if (actual_url.includes('tournament')) {
       Type = 'tournament-game';
    } else if (actual_url.includes('remote')) {
       Type = 'remote-game';
    } else if (actual_url.includes('local')) {
         Type = 'local-game';
    } else if (actual_url.includes('single')) {
        Type = 'single-game';
    }

    const data = {
        name: document.getElementById('name').value,
        type: Type,
        mode: document.getElementById('mode').value,
        rules: document.getElementById('rule').value,
        timelimit: parseInt(document.getElementById('timelimit').value, 10) || 0,
        scorelimit: parseInt(document.getElementById('scorelimit').value, 10) || 0,
        balls: parseInt(document.getElementById('balls').value, 10) || 1,
        boost: document.getElementById('boost').checked
    };

    // Aggiungi il numero di giocatori solo se il campo esiste
    const nbPlayersElement = document.getElementById('nb_players');
    if (nbPlayersElement) {
        data.nb_players = parseInt(nbPlayersElement.value, 10) || 2;
    }

    const currentUrl = window.location.href;
    const queryString = new URLSearchParams(data).toString(); // Crea la stringa di query

    let source = 'default';
    if (currentUrl.includes('create_remote')) {
        source = 'remote';
    } else if (currentUrl.includes('create_local')) {
        source = 'local';
    } else if (currentUrl.includes('create_single')) {
        source = 'single';
    } else if (currentUrl.includes('create_tournament')) {
        source = 'tournament';
    }

    const url = `/api/create/?source=${source}`;
    if (source === 'remote' || source === 'tournament') {
        console.log('data:', data);
        console.log('url:', url);
        let accessToken = localStorage.getItem("accessToken");
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${accessToken}`,
                'X-CSRFToken': getCookie('csrftoken')

            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('data:', source);
                if (source === 'tournament') {
                    console.log('dataquiz:', data.success);
                    loadPage("api/tournament_lobby/" + data.success + "/");
                } else {
                    loadPage("api/lobby/" + data.success + "/");
                }
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Errore durante la creazione:', error));
    } else if (source === 'local' || source === 'single') {

        let UserId = localStorage.getItem('userId');

        let targetUrl = "api/game/local/?" + queryString + '&userid=' + UserId;
        if (source === 'single') {
            targetUrl = "api/game/single/?" + queryString + '&userid=' + UserId;
        }

        loadPage(targetUrl);
    }
});
