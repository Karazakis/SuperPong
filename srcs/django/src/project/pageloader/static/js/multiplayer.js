document.getElementById('localgame').addEventListener('click', function() {    
    loadPage("api/create/?source=local");
}
);

document.getElementById('remotegame').addEventListener('click', function() {
    loadPage("api/remote/");
}
);

var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/dashboard_nav/");
    });
}