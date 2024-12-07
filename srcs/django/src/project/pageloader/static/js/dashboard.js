document.getElementById('localgame').addEventListener('click', function() {    
    loadPage("api/create/?source=local");
}
);

document.getElementById('remotegame').addEventListener('click', function() {
    loadPage("api/remote/");
}
);

