document.getElementById('join').addEventListener('click', function() {    
    loadPage("api/join_lobby/");
}
);

document.getElementById('create').addEventListener('click', function() {
    loadPage("api/create/?source=remote");
}
);

document.getElementById('tournaments').addEventListener('click', function() {
    loadPage("api/tournaments/");
}
);

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/dashboard/");
    });
}