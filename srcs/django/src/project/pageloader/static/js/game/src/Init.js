

function getPlayerControls(playerId) {
    const playerDiv = document.getElementById(playerId);
    if (playerDiv) {
        return {
            left: playerDiv.getAttribute('data-left'),
            right: playerDiv.getAttribute('data-right'),
            shoot: playerDiv.getAttribute('data-shoot'),
            boost: playerDiv.getAttribute('data-boost')
        };
    } else {
        console.error(`Player div with ID ${playerId} not found.`);
        return null;
    }
}

function getGameRules() {
    const elemRules = document.getElementById("gamerules");
    if (elemRules) {
        return elemRules.innerHTML;
    } else {
        console.error('Game rules element not found.');
        return null;
    }
}

function setGameSettings(gameSettings) {
    if(gameSettings.gameType = "single-game") {
        console.log("single game loaded");
    }
    else if (gameSettings.gameType = "local-game") {
        console.log("local game loaded");
    }
    else if (gameSettings.gameType = "remote-game") {
        console.log("remote game loaded");
    }
    if(gameSettings.gameMode == "1v1") {
        console.log("1v1 loaded");
        const playerIds = ['player0', 'player1'];
        playerIds.forEach(playerId => {
        const controls = getPlayerControls(playerId);
        if (controls) {
            console.log(`Controls for ${playerId}:`, controls);
        }        
    });
    }
    else if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        console.log("2v2 or 4dm loaded");
        const playerIds = ['player0', 'player1', 'player2', 'player3'];
        playerIds.forEach(playerId => {
        const controls = getPlayerControls(playerId);
        if (controls) {
            console.log(`Controls for ${playerId}:`, controls);
        }
    });
    }
}

export function init(){
    console.log('init.js loaded');
    
    const gameType = document.getElementById("gametype");
    const gameMode = document.getElementById("gamemode");
    const gameRules = getGameRules();
    const gameTimeLimit = document.getElementById("gametime");
    const gameScoreLimit = document.getElementById("gamescore");
    const gameBalls = document.getElementById("gameballs");
    const gameBoosts = document.getElementById("gameboost");
    
    const gameSettings = {
        gameType: gameType.innerHTML,
        gameMode: gameMode.innerHTML,
        gameRules: gameRules,
        gameTimeLimit: gameTimeLimit.innerHTML,
        gameScoreLimit: gameScoreLimit.innerHTML,
        gameBalls: gameBalls.innerHTML,
        gameBoosts: gameBoosts.innerHTML
    };
    setGameSettings(gameSettings);
    return gameSettings;
}