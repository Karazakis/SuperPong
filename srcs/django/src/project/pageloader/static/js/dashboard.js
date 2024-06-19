
document.getElementById('singleplayer').addEventListener('click', function() {    
    loadPage("api/create/?source=single");
}
);

document.getElementById('multiplayer').addEventListener('click', function() {
    loadPage("api/multiplayer/");
}
);