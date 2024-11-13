

function getGameRules() {
    const elemRules = document.getElementById("gamerules");
    if (elemRules) {
        return elemRules.innerHTML;
    } else {
        console.error('Game rules element not found.');
        return null;
    }
}


export function init(){
    
    const gameType = document.getElementById("gametype");
    const gameMode = document.getElementById("gamemode");
    const gameRules = getGameRules();
    const gameTimeLimit = document.getElementById("gametime");
    const gameScoreLimit = document.getElementById("gamescore");
    const gameBalls = document.getElementById("gameballs");
    const gameBoosts = document.getElementById("gameboost");
    //const gameRandomCorners = Array.from({ length: 50 }, () => Math.floor(Math.random() * 4)); // chioccia
    if (gameRules === 'time')
    {
        const gameSettings = {
        gameType: gameType.innerHTML,
        gameMode: gameMode.innerHTML,
        gameRules: gameRules,
        gameTimeLimit: gameTimeLimit.innerHTML,
        gameBalls: gameBalls.innerHTML,
        gameBoosts: gameBoosts.innerHTML
        //gameRandomCorners: gameRandomCorners // chioccia
        };
        return gameSettings;
    }
        const gameSettings = {
        gameType: gameType.innerHTML,
        gameMode: gameMode.innerHTML,
        gameRules: gameRules,
        gameScoreLimit: gameScoreLimit.innerHTML,
        gameBalls: gameBalls.innerHTML,
        gameBoosts: gameBoosts.innerHTML
        //gameRandomCorners: gameRandomCorners // chioccia
        };
    return gameSettings;
}