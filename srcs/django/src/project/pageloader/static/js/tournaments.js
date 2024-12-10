document.getElementById('jointournament').addEventListener('click', function() {    
    loadPage("api/join_tournament/");
}
);

document.getElementById('createtournament').addEventListener('click', function() {
    loadPage("api/create/?source=tournament");
}
);

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/remote/");
    });
}