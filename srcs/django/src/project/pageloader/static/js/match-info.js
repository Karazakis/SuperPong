var goBackBtn = document.getElementById('go-back-btn');
if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
        loadPage("api/dashboard_nav/");
    });
}

var goBackPrf = document.getElementById('go-back-prf');
if (goBackPrf) {
    goBackPrf.addEventListener('click', function() {
        var profileId = sessionStorage.getItem('profile_id');
        
        if (profileId) {
            loadPage(`api/profile/${profileId}/`);
        } else {
            console.error("ID del profilo non trovato nel sessionStorage.");
        }
    });
}

