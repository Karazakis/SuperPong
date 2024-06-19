document.querySelectorAll('.key-capture').forEach(function(input) {
    input.addEventListener('keydown', function(event) {
        event.preventDefault(); // Previene l'azione di default dei tasti speciali
        
        // Imposta il valore dell'input con il nome del tasto premuto
        this.value = event.code;
        // Usa event.key o event.code a seconda delle tue necessità
    });
});

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/dashboard_nav/");
    });
}


document.getElementById('profile-settings-btn').addEventListener('click', function(event) {
    event.preventDefault(); // Previene il comportamento di submit predefinito del form
    
    const formData = new FormData();
    formData.append('id', localStorage.getItem('userId'));
    formData.append('username', document.getElementById('username').value);
    formData.append('nickname', document.getElementById('nickname').value);
    formData.append('email', document.getElementById('email').value);
    const imgProfileInput = document.getElementById('img_profile');
    if (imgProfileInput.files.length > 0) {
        const imgProfile = imgProfileInput.files[0]; // Prende il primo file selezionato
        formData.append('img_profile', imgProfile); // Aggiunge l'immagine al FormData
    }
    formData.append('password', document.getElementById('password').value);
    formData.append('right1', document.getElementById('keyInput11').value);
    formData.append('left1', document.getElementById('keyInput12').value);
    formData.append('shoot1', document.getElementById('keyInput13').value);
    formData.append('boost1', document.getElementById('keyInput14').value);
    formData.append('right2', document.getElementById('keyInput21').value);
    formData.append('left2', document.getElementById('keyInput22').value);
    formData.append('shoot2', document.getElementById('keyInput23').value);
    formData.append('boost2', document.getElementById('keyInput24').value);
    formData.append('right3', document.getElementById('keyInput31').value);
    formData.append('left3', document.getElementById('keyInput32').value);
    formData.append('shoot3', document.getElementById('keyInput33').value);
    formData.append('boost3', document.getElementById('keyInput34').value);
    formData.append('right4', document.getElementById('keyInput41').value);
    formData.append('left4', document.getElementById('keyInput42').value);
    formData.append('shoot4', document.getElementById('keyInput43').value);
    formData.append('boost4', document.getElementById('keyInput44').value);
    
    // Invia i dati all'API usando fetch
    fetch('/api/settings/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            console.log(response);
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Supponendo che 'data.success' sia l'ID per la lobby creata
            // e che 'loadPage()' sia una funzione definita da te per gestire il routing SPA
            loadPage("api/settings/");
        } else {
            alert(data.message); // Gestisci l'errore mostrando il messaggio ricevuto
        }
    })
    .catch(error => console.error('Errore durante la creazione del gioco:', error));
});

document.getElementById('game-settings-btn').addEventListener('click', function(event) {
    event.preventDefault(); // Previene il comportamento di submit predefinito del form
    
    
    const formData = new FormData();
    formData.append('id', localStorage.getItem('userId'));
    formData.append('username', document.getElementById('username').value);
    formData.append('nickname', document.getElementById('nickname').value);
    formData.append('email', document.getElementById('email').value);
    const imgProfileInput = document.getElementById('img_profile');
    if (imgProfileInput.files.length > 0) {
        const imgProfile = imgProfileInput.files[0]; // Prende il primo file selezionato
        formData.append('img_profile', imgProfile); // Aggiunge l'immagine al FormData
    }
    formData.append('password', document.getElementById('password').value);
    formData.append('right1', document.getElementById('keyInput11').value);
    formData.append('left1', document.getElementById('keyInput12').value);
    formData.append('shoot1', document.getElementById('keyInput13').value);
    formData.append('boost1', document.getElementById('keyInput14').value);
    formData.append('right2', document.getElementById('keyInput21').value);
    formData.append('left2', document.getElementById('keyInput22').value);
    formData.append('shoot2', document.getElementById('keyInput23').value);
    formData.append('boost2', document.getElementById('keyInput24').value);
    formData.append('right3', document.getElementById('keyInput31').value);
    formData.append('left3', document.getElementById('keyInput32').value);
    formData.append('shoot3', document.getElementById('keyInput33').value);
    formData.append('boost3', document.getElementById('keyInput34').value);
    formData.append('right4', document.getElementById('keyInput41').value);
    formData.append('left4', document.getElementById('keyInput42').value);
    formData.append('shoot4', document.getElementById('keyInput43').value);
    formData.append('boost4', document.getElementById('keyInput44').value);
    
    // Invia i dati all'API usando fetch
    fetch('/api/settings/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Supponendo che 'data.success' sia l'ID per la lobby creata
            // e che 'loadPage()' sia una funzione definita da te per gestire il routing SPA
            loadPage("api/settings/");
        } else {
            alert(data.message); // Gestisci l'errore mostrando il messaggio ricevuto
        }
    })
    .catch(error => console.error('Errore durante la creazione del gioco:', error));
});