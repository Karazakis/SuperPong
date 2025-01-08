

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
    if (gameRules === 'time')
    {
        const gameSettings = {
        gameType: gameType.innerHTML,
        gameMode: gameMode.innerHTML,
        gameRules: gameRules,
        gameTimeLimit: gameTimeLimit.innerHTML,
        gameBalls: gameBalls.innerHTML,
        gameBoosts: gameBoosts.innerHTML
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
        };
    return gameSettings;
}