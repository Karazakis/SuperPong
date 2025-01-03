
import { Corner } from "/static/js/game/src/Corner.js";
import {init} from "/static/js/game/src/Init.js";
import { Model3D } from "/static/js/game/src/Model3D.js";
import { BotTop } from "/static/js/game/src/BotTop.js";
import { BotSide } from "/static/js/game/src/BotSide.js";
import {Mesh, SphereGeometry } from "/static/js/game/module/three.module.js";

import { cornerCollision, penetrationDepthCorner2, ballCollision, penetrationDepth, collisionResponse, ballPadCollisionResponse } from "/static/js/game/src/Collision.js";



document.addEventListener('cleanupGameEvent', function() {
    cleanupGame();
});

window.inGame = true;
function cleanupGame() {      
    window.inGame = false;
    gameEnded = true;
    new Promise(resolve => {
        setTimeout(resolve, 20);
    });

    window.clearAllScene();
    if (window.animationFrameId !== null && window.animationFrameId !== undefined) {
        cancelAnimationFrame(window.animationFrameId);
        window.animationFrameId = null;
    }
    BALLS.forEach(ball => ball.destroy());
    BALLS = [];
    ufo = [];
    if (paddle1) {
        paddle1.destroy();
    }
    paddle1 = null;
    if (paddle2) {
        paddle2.destroy();
    }
    paddle2 = null;
    if (paddle3) {
        paddle3.destroy();
    }
    paddle3 = null;
    if (paddle4) {
        paddle4.destroy();
    }
    paddle4 = null;
    if (bot) {
        bot.destroy();
    }
    bot = null;
    if (bot2) {
        bot2.destroy();
    }
    bot2 = null;
    if (bot3) {
        bot3.destroy();
    }
    bot3 = null;

    if (BALLS){
        BALLS.forEach(ball => ball.destroy());
        BALLS = [];
    }
    walls = [false, false, false, false];
    keyboardState = {};
    closestBall1 = 0;
    closestBall2 = 0;
    closestBall3 = 0;
    score = [10, 10, 10, 10];
    scoreTeam = [20, 20];
    isPaused = false;
    window.removeEventListener('resize', window.onWindowResize, false);
    cornerBotLeft.destroy();

    cornerBotRight.destroy();
    cornerTopRight.destroy();
    cornerTotLeft.destroy();

    const model3D = new Model3D();
    if (gameSettings.gameType === "remote-game" || gameSettings.gameType === "tournament") {
        window.removeEventListener('keydown', handleKeyDownOnline);
        window.handleKeyDownOnline = null;
        window.removeEventListener('keyup', handleKeyUpOnline);
        window.handleKeyUpOnline = null;
    } else {
        window.removeEventListener('keydown', handleKeyDown);
        window.handleKeyDown = null;
        window.removeEventListener('keyup', handleKeyUp);
        window.handleKeyUp = null;
    }

    if (window.GameSocket) {
        window.GameSocket.close();
        window.GameSocket = null;
    }
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    
}

export const gameSettings = init();
function isInKeyPlayer(key)
{
    const playerDiv = document.getElementById('player0');
    const playerKeys = {
        left: playerDiv.getAttribute('data-keyleft'),
        right: playerDiv.getAttribute('data-keyright'),
        shoot: playerDiv.getAttribute('data-keyshoot'),
        boost: playerDiv.getAttribute('data-keyboost')
    };

    if(key == playerKeys.left || key == playerKeys.right || key == playerKeys.shoot || key == playerKeys.boost)
        return true;
    return false;
}

function getPlayerControl(key)
{
    const playerDiv = document.getElementById('player0');
    const playerKeys = {
        left: playerDiv.getAttribute('data-keyleft'),
        right: playerDiv.getAttribute('data-keyright'),
        shoot: playerDiv.getAttribute('data-keyshoot'),
        boost: playerDiv.getAttribute('data-keyboost')
    };

    if(key == playerKeys.left)
        return document.getElementById('player0').getAttribute('data-left');
    if(key == playerKeys.right)
        return document.getElementById('player0').getAttribute('data-right');
    if(key == playerKeys.shoot)
        return document.getElementById('player0').getAttribute('data-shoot');
    if(key == playerKeys.boost)
        return document.getElementById('player0').getAttribute('data-boost');
    return 'none';
}

const GEOMETRY = new THREE.SphereGeometry(3, 5, 20, 20);
GEOMETRY.rotateZ(Math.PI / 2);

const MATERIAL = new THREE.MeshNormalMaterial({transparent: true, opacity: 0.0}); // , transparent: true, opacity: 0.3});
const TURBO_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x00ff0000, transparent: true, opacity: 0.3 });

export class Pad { 

    constructor(scene, boundaries, spawnX, spawnY ,left, right, shoot, turbo, id) {
        this.scene = scene;
        this.geometry = GEOMETRY;
        this.material = MATERIAL;
        this.turboMaterial = TURBO_MATERIAL;
        this.mesh = new Mesh(GEOMETRY, MATERIAL);
        this.mesh.spawn = new THREE.Vector2(spawnX, spawnY);
        this.boundaries = new THREE.Vector2(boundaries.x, boundaries.y);
        this.mesh.position.set(this.mesh.spawn.x, this.mesh.spawn.y);
        
        this.mesh.speed = 20;
        this.mesh.right = right;
        this.mesh.left = left;
        this.mesh.countdownTurbo = 0;
        this.r = 3;        
        this.mesh.hasBall = [false, false, false];
        this.mesh.previousMState = false;
        this.ballSlots = [
            new THREE.Vector2(-3, 2.5),
            new THREE.Vector2(0, 3.5),
            new THREE.Vector2(3, 2.5),
        ];
        this.mesh.shoot = shoot;
        this.mesh.turbo = turbo;
        this.mesh.attachedBalls = [null, null, null];
        this.turboCD = 2000;
        this.turboDuration = 250;
        this.turboSpeed = 45;
        this.shootRelease = 3000;
        this.mesh.previousPositionX = this.mesh.position.x;
        this.lastUpdateTime = 0;
        this.updateInterval = 15;
        this.hit = 0;
        this.id = id;
        this.keyPressCount = 0;
        this.keyPressedFlag = {right: false, left: false, shoot: false, turbo: false};
        this.scene.add(this.mesh);
    }

    destroy(){
        if (this.mesh !== null)
        {
            this.mesh.position.set(0, -30, 0);
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;       
        }
    }

    update(dt) {
        const currentTime = Date.now();

        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }

        let moved = false;

        if (keyboardState[this.mesh.right]) {
            if (this.mesh.position.x < this.boundaries.x - 7) {
                this.mesh.position.x += dt * this.mesh.speed;
                moved = true;
            }
            this.handleKeyPress('right');
        } else {
            this.keyPressedFlag.right = false;
        }
        if (keyboardState[this.mesh.left]) {
            if (this.mesh.position.x > -this.boundaries.x + 7) {
                this.mesh.position.x -= dt * this.mesh.speed;
                moved = true;
            }
            this.handleKeyPress('left');
        } else {
            this.keyPressedFlag.left = false;
        }
        this.lastUpdateTime = currentTime;
    }

    handleKeyPress(key) {
        if (!this.keyPressedFlag[key]) {
            this.keyPressCount++;
            this.keyPressedFlag[key] = true;
        }
    }

    collision(ball, paddle){
        return (ball.r + paddle.r >= paddle.mesh.position.distanceTo(ball.mesh.position));
    }

    shoot(balls) {
        const releaseBalls = () => {

            for (let j = 0; j < this.mesh.attachedBalls.length; j++) {
                if (this.mesh.attachedBalls[j] != null) {
                    // const originalVelocity = this.mesh.attachedBalls[j].mesh.velocity.clone();
                    // const reducedVelocity = originalVelocity.multiplyScalar(0.5); // Riduce la velocità del 50%
                    //this.mesh.attachedBalls[j].mesh.velocity.copy(reducedVelocity);
                    if (this.mesh.hasBall[0]) {
                        this.mesh.attachedBalls[j].mesh.velocity.set(-25, 15, 0);
                    } else if (this.mesh.hasBall[1]) {
                        this.mesh.attachedBalls[j].mesh.velocity.set(0, 15, 0);
                    } else if (this.mesh.hasBall[2]) {
                        this.mesh.attachedBalls[j].mesh.velocity.set(25, 15, 0);
                    }
                    this.mesh.hasBall[j] = false;
                    this.mesh.attachedBalls[j].mesh.isAttached = false;
                    this.mesh.attachedBalls[j] = null;
                }
            }
            clearTimeout(this.releaseTimeout); // Cancella il timer
            this.releaseTimeout = null;
            this.mesh.previousMState = false;
        };
    
        for (let i = 0; i < balls.length; i++) {
            if (this.collision(balls[i], this)) {
                if (keyboardState[this.mesh.shoot]) { // Il tasto 'm' è premuto
                    if (!this.mesh.previousMState && !balls[i].mesh.isAttached) {
                        let closestSlot = -1;
                        let minDistance = Infinity;
                        for (let j = 0; j < this.ballSlots.length; j++) {
                            if (!this.mesh.hasBall[j]) {
                                const slotPosition = new THREE.Vector2(
                                    this.mesh.position.x + this.ballSlots[j].x,
                                    this.mesh.position.y + this.ballSlots[j].y
                                );
                                const distance = slotPosition.distanceTo(balls[i].mesh.position);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestSlot = j;
                                }
                            }
                        }
                        if (closestSlot !== -1) {
                            balls[i].mesh.position.set(
                                this.mesh.position.x + this.ballSlots[closestSlot].x,
                                this.mesh.position.y + this.ballSlots[closestSlot].y,
                                this.mesh.position.z
                            );
                            this.mesh.hasBall[closestSlot] = true;
                            this.mesh.attachedBalls[closestSlot] = balls[i];
                            balls[i].mesh.isAttached = true;
                            balls[i].mesh.velocity.set(0, 0, 0);
                        }
                    }
                    
                    else if (this.mesh.previousMState && balls[i].mesh.isAttached == false ) {
                        let closestSlot = -1;
                        let minDistance = Infinity;
                        for (let j = 0; j < this.ballSlots.length; j++) {
                            if (!this.mesh.hasBall[j]) {
                                const slotPosition = new THREE.Vector2(
                                    this.mesh.position.x + this.ballSlots[j].x,
                                    this.mesh.position.y + this.ballSlots[j].y
                                );
                                const distance = slotPosition.distanceTo(balls[i].mesh.position);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestSlot = j;
                                }
                            }
                        }
                        if (closestSlot !== -1) {
                            balls[i].mesh.position.x = this.mesh.position.x + this.ballSlots[closestSlot].x;
                            balls[i].mesh.position.y = this.mesh.position.y + this.ballSlots[closestSlot].y;
                            this.mesh.hasBall[closestSlot] = true;
                            this.mesh.attachedBalls[closestSlot] = balls[i];
                            balls[i].mesh.isAttached = true;
                            balls[i].mesh.velocity.set(0, 0, 0);
                        }
                    }
                    
                    if (!this.releaseTimeout) {
                        this.releaseTimeout = setTimeout(releaseBalls, this.shootRelease);
                    }
                } else {
                    if (this.mesh.previousMState) {
                        for (let j = 0; j < this.mesh.attachedBalls.length; j++) {
                            if (this.mesh.attachedBalls[j] != null) {
                                if (this.mesh.hasBall[0]) {
                                    this.mesh.attachedBalls[j].mesh.velocity.set(-25, 40, 0);
                                } else if (this.mesh.hasBall[1]) {
                                    this.mesh.attachedBalls[j].mesh.velocity.set(0, 40, 0);
                                } else if (this.mesh.hasBall[2]) {
                                    this.mesh.attachedBalls[j].mesh.velocity.set(25, 40, 0);
                                }
                                this.mesh.hasBall[j] = false;
                                this.mesh.attachedBalls[j] = null;
                                balls[i].mesh.isAttached = false;
                            }
                        }
                        clearTimeout(this.releaseTimeout);
                        this.releaseTimeout = null;
                    }
                }
                this.mesh.previousMState = keyboardState[this.mesh.shoot];
            }
        }
    }
    
    turbo(){
        if(this.mesh.countdownTurbo == 0 && keyboardState[this.mesh.turbo]){
            this.mesh.speed = this.turboSpeed;
            this.mesh.countdownTurbo = 1;
            this.mesh.material = this.turboMaterial;
            setTimeout(() => { 
                this.mesh.countdownTurbo = 0;
            }, this.turboCD);
            setTimeout(() => {
                this.mesh.speed = 20;
                this.mesh.material = this.material;
            }, this.turboDuration);
        }
    }
}

export function 

endgameOnline(isLeft = false, isHostLeft = false) {
    const accessToken = localStorage.getItem("accessToken");
	const csrfToken = getCookie('csrftoken');
    let gameId = window.location.pathname.split("/");
    let url = "/api/game/" + gameId[2]  + "/";
    document.getElementById('game-details').dataset.gameStatus = "finished";
    async function checkTokenValidity(url) {
		try {
			const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
			method: "GET"
			});
			const data = await response.json();
	
			if (data.message === 'Token valido') {
			// Token valido, procedi con la richiesta effettiva
			await performRequest(accessToken, url);
			} else if (data.message === 'Token non valido') {
			// Token non valido, prova a rinfrescare
			const newAccessToken = await refreshAccessToken();
			if (newAccessToken) {
				accessToken = newAccessToken;  // Aggiorna il token di accesso per le richieste future
				localStorage.setItem("accessToken", newAccessToken);
				// Richiesta effettiva con nuovo token
				await performRequest(newAccessToken, url);
			} else {
				loadPage("api/login/");
			}
			} else {
			throw new Error('Network response was not ok');
			}
		} catch (error) {
			console.error('Errore durante la verifica del token:', error);
		}
		}
		const performRequest = async (token, url) => {
            let hitPlayer1 = 0;
            let hitPlayer2 = 0;
            let keyCountPlayer1 = 0;
            let keyCountPlayer2 = 0;
            if (paddle1 !== null) {
                hitPlayer1 = paddle1.hit;
                hitPlayer2 = paddle2.hit;
                keyCountPlayer1 = paddle1.keyPressCount;
                keyCountPlayer2 = paddle2.keyPressCount;
            }
                
            try {
                let scorePlayer1 = document.getElementById('player0score').textContent;
                let scorePlayer2 = document.getElementById('player1score').textContent;
                
               
                let ballCount = ballC;
                let abandon = 0;
                if (isLeft === true) {
                    if (isHostLeft === true) {
                        abandon = 1;
                    } else {
                        abandon = 2;
                    }
                }

                let data = {
                    scorePlayer1: scorePlayer1,
                    scorePlayer2: scorePlayer2,
                    player1_hit: hitPlayer1,
                    player2_hit: hitPlayer2,
                    player1_keyPressCount: keyCountPlayer1,
                    player2_keyPressCount: keyCountPlayer2,
                    ballCount: ballCount,
                    abandon: abandon,
                    gameStatus: "finished"
                };
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });


            } catch (error) {
                console.error('Errore durante la richiesta:', error);
            }
		}
		checkTokenValidity(url);
}

export function 

endgameLocal(abandon = false) {
    const accessToken = localStorage.getItem("accessToken");
	const csrfToken = getCookie('csrftoken');
    let url = "/api/game/local/";
    document.getElementById('game-details').dataset.gameStatus = "finished";
    async function checkTokenValidity(url) {
		try {
			const response = await fetch(`${window.location.origin}/api/token/refresh/?token=${accessToken}`, {
			method: "GET"
			});
			const data = await response.json();
	
			if (data.message === 'Token valido') {
			// Token valido, procedi con la richiesta effettiva
			await performRequest(accessToken, url, abandon);
			} else if (data.message === 'Token non valido') {
			// Token non valido, prova a rinfrescare
			const newAccessToken = await refreshAccessToken();
			if (newAccessToken) {
				accessToken = newAccessToken;  // Aggiorna il token di accesso per le richieste future
				localStorage.setItem("accessToken", newAccessToken);
				// Richiesta effettiva con nuovo token
				await performRequest(newAccessToken, url);
			} else {
				loadPage("api/login/");
			}
			} else {
			throw new Error('Network response was not ok');
			}
		} catch (error) {
			console.error('Errore durante la verifica del token:', error);
		}
		}
		const performRequest = async (token, url, abandon) => {
            try {
                let gameName = document.querySelector("#dashbase .small strong").textContent;
                let gameMode = gameSettings.gameMode;
                let gameLimit = gameSettings.gameScoreLimit;
                let gameRules = gameSettings.gameRules;
                let gameBalls = gameSettings.gameBalls;
                let gameBoosts = gameSettings.gameBoosts;
                let scorePlayer1 = document.getElementById('player0score').textContent;
                let scorePlayer2 = document.getElementById('player1score').textContent;
                
                // Controllo su paddle1 e paddle2
                let hitPlayer1 = paddle1 ? paddle1.hit : 0;
                let hitPlayer2 = paddle2 ? paddle2.hit : 0;
                let keyCountPlayer1 = paddle1 ? paddle1.keyPressCount : 0;
                let keyCountPlayer2 = paddle2 ? paddle2.keyPressCount : 0;

                let ballCount = ballC;
                let data = {
                    scorePlayer1: scorePlayer1,
                    scorePlayer2: scorePlayer2,
                    player1_hit: hitPlayer1,
                    player2_hit: hitPlayer2,
                    player1_keyPressCount: keyCountPlayer1,
                    player2_keyPressCount: keyCountPlayer2,
                    ballCount: ballCount,
                    gameStatus: "finished",
                    name: gameName,
                    mode: gameMode,
                    limit: gameLimit,
                    rules: gameRules,
                    balls: gameBalls,
                    boost: gameBoosts
                };
                if (abandon === true) {
                    data.abandon = 1; 
                }
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });


            } catch (error) {
                console.error('Errore durante la richiesta:', error);
            }
		}
		checkTokenValidity(url);
}

window.endgameOnline = endgameOnline;
window.gameover = gameover;

function startTimer() {
    // Inizializza il timer del gioco
    if (gameEnded === true) {
        return;
    }
    const timerElement = document.getElementById('game-timer');
    const countdownElement = document.getElementById('countdown');
    const timerValue = parseInt(timerElement.getAttribute('data-timer'), 10);
    if (!isNaN(timerValue) && timerValue > 0) {
        let timeRemaining = timerValue * 60;

        // Aggiorna il countdown all'inizio
        countdownElement.textContent = timeRemaining;

        // Imposta un intervallo per aggiornare il countdown ogni secondo
        const countdownInterval = setInterval(function() {
            timeRemaining--;
            countdownElement.textContent = timeRemaining;
            if (window.inGame === false) {
                clearInterval(countdownInterval);
            }
            // Quando il tempo scade, ferma il timer e chiama endgame()
            if (timeRemaining <= 0) {
                clearInterval(countdownInterval);
                gameover();
            }
        }, 1000); // 1000 millisecondi = 1 secondo
    } else {
        console.error("Valore del timer non valido:", timerValue);
    }
}

let goldenGoal = false;

function startTimerOnline() {
    let timerElement = document.getElementById('game-timer');
    let countdownElement = document.getElementById('countdown');
    let timerValue = parseInt(timerElement.getAttribute('data-timer'), 10);

    if (typeof GameSocket === 'undefined' || GameSocket === null) {
        return;
    }
    if (!isNaN(timerValue) && timerValue > 0) {
        let timeRemaining = timerValue;

        countdownElement.textContent = timeRemaining;
        GameSocket.send(JSON.stringify({ action: 'time_update', time: timeRemaining }));
        const countdownInterval = setInterval(function() {
            if (GameSocket === null) {
                clearInterval(countdownInterval);
                return;
            }
            
            if (gamePaused === false && gameIsStarting === false) {
                timeRemaining--;
                GameSocket.send(JSON.stringify({ action: 'time_update', time: timeRemaining }));
            }

            if (timeRemaining <= 0) {
                if (gameSettings.gameType === "tournament" && score[0] === score[1]) {
                    goldenGoal = true;
                }

                clearInterval(countdownInterval);
                if (isHost && goldenGoal === false) {
                    GameSocket.send(JSON.stringify({ action: 'game_over' , p1: score[0], p2: score[1] }));
                }
            }
        }, 1000);
    } else {
        console.error("Valore del timer non valido:", timerValue);
    }
}


window.gameScene = new THREE.Scene();
const ambientLight = new THREE.AmbientLight(0xffffff);
window.gameScene.add(ambientLight);

let bot = null;
let bot2 = null;
let bot3 = null;
const boundaries = new THREE.Vector2(20, 20); // limiti gioco
const clock = new THREE.Clock();
    
function getPlayerControls(playerId) {
    const playerDiv = document.getElementById(playerId);
    if (playerDiv) {
        return {
            left: playerDiv.getAttribute('data-left'),
            right: playerDiv.getAttribute('data-right'),
            shoot: playerDiv.getAttribute('data-shoot'),
            boost: playerDiv.getAttribute('data-boost'),
            posit: playerDiv.getAttribute('data-posit')
        };
    } else {
        console.error(`Player div with ID ${playerId} not found.`);
        return null;
    }
}


export let keyboardState = {};
let p1Elem, p1Controls, p2Elem, p2Controls, p3Elem, p3Controls, p4Elem, p4Controls;

p1Controls = getPlayerControls("player0");
export const posit = p1Controls.posit;
let paddle1 = new Pad(window.gameScene, boundaries, 0, -20, p1Controls.left, p1Controls.right, p1Controls.shoot, p1Controls.boost, 1);
let paddle2;
let paddle3;
let paddle4;
let walls = [false, true, false, true]; // attiva i muri laterali
const cornerBotLeft = new Corner(window.gameScene, -21, -21, 0, 5);
const cornerBotRight = new Corner(window.gameScene, 21, -21, 0, 5);
const cornerTopRight = new Corner(window.gameScene, 21, 21, 0, 5);
const cornerTotLeft = new Corner(window.gameScene, -21, 21, 0, 5);

const model3D = new Model3D();
let ufo = [];

const isOnlineGame = gameSettings.gameType === "remote-game" || gameSettings.gameType === "tournament";
export const isHost = posit === "p1";

document.getElementById('leavegame').dataset.posit = posit;

if (gameSettings.gameType == "single-game") {
    bot = new BotTop(window.gameScene, new THREE.Vector3(0, 20, 0), new THREE.Vector2(20, 20));
    if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        walls[1] = false; 
        walls[3] = false;
        bot2 = new BotSide(window.gameScene, new THREE.Vector3(20, 0, 0), new THREE.Vector2(20, 20));
        bot3 = new BotSide(window.gameScene, new THREE.Vector3(-20, 0, 0), new THREE.Vector2(20, 20));
    }
} else if (gameSettings.gameType == "local-game") {
    p2Controls = getPlayerControls("player1");
    paddle2 = new Pad(window.gameScene, boundaries, 0, 20, p2Controls.left, p2Controls.right, p2Controls.shoot, p2Controls.boost, 2);
    if(gameSettings.gameMode == "1v1") {
    }
    else if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        p3Controls = getPlayerControls("player2");
        p4Controls = getPlayerControls("player3");
        if (p3Controls) {
            paddle3 = new Pad(window.gameScene, boundaries, 20, 0, p3Controls.left, p3Controls.right, p3Controls.shoot, p3Controls.boost, 3, "vertical");
        }
        if (p4Controls) {
            paddle4 = new Pad(window.gameScene, boundaries, -20, 0, p4Controls.left, p4Controls.right, p4Controls.shoot, p4Controls.boost, 4, "vertical");
        }
        walls[1] = false; 
        walls[3] = false;
    }
} else if (gameSettings.gameType == "remote-game" || gameSettings.gameType == "tournament") {
    p2Controls = getPlayerControls("player1");
    paddle2 = new Pad(window.gameScene, boundaries, 0, 20, p2Controls.right, p2Controls.left, p2Controls.shoot, p2Controls.boost, 2);
    if(gameSettings.gameMode == "1v1") {
    }
    else if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        p3Controls = getPlayerControls("player2");
        p4Controls = getPlayerControls("player3");
        if (p3Controls) {
            paddle3 = new Pad(window.gameScene, boundaries, 20, 0, p3Controls.left, p3Controls.right, p3Controls.shoot, p3Controls.boost, 3, "vertical");
        }
        if (p4Controls) {
            paddle4 = new Pad(window.gameScene, boundaries, -20, 0, p4Controls.left, p4Controls.right, p4Controls.shoot, p4Controls.boost, 4, "vertical");
        }
        walls[1] = false; 
        walls[3] = false;
    }
}

const gridColor = new THREE.Color('#58ff33');
const gridHelper = new THREE.GridHelper(boundaries.x * 2, boundaries.y / 2, gridColor, gridColor);
gridHelper.rotateX(Math.PI / 2);
gridHelper.position.z = -1;
window.gameScene.add(gridHelper);

const pointLight = new THREE.PointLight(0xffffff, 0.5); // Luce puntiforme
pointLight.position.set(20, -20, 40);
window.gameScene.add(pointLight);

let BALLS = [];
let corners = [cornerBotLeft, cornerBotRight, cornerTopRight, cornerTotLeft];
let interval = 2;
let timer = 0;
let timer2 = 0;
let gamePaused = true;

function arrow (position, angle) {
    const geometry = new THREE.ConeGeometry(0.5, 5, 20, 20);
    const material = new THREE.MeshNormalMaterial();
    const arrow = new THREE.Mesh(geometry, material);
    arrow.position.set(position.x, position.y, position.z);
    arrow.rotateZ(Math.PI / angle);
    window.gameScene.add(arrow);
    setTimeout(() => {
        if (window.gameScene !== null)
            window.gameScene.remove(arrow);
    } , 2000);
}

let maxBalls = gameSettings.gameBalls;
let ballC = 0;

function launchBall(n2online = 0, ballId = null) {
    let direction;
    let n = 0;
    let n2 = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (gameSettings.gameType == "remote-game" || gameSettings.gameType == "tournament") {
        if(posit == "p1"){
            n2 = n2online;
        }
        else if(posit == "p2"){
            if (n2online == 0){
                n2 = 2;
            } else if (n2online == 1) {
                n2 = 3;
            } else if (n2online == 2) {
                n2 = 0;
            } else if (n2online == 3) {
                n2 = 1;
            }
        }
        else if(posit == "p3"){
            if (n2online == 0){
                n2 = 1;
            } else if (n2online == 1) {
                n2 = 3;
            } else if (n2online == 2) {
                n2 = 2;
            } else if (n2online == 3) {
                n2 = 1;
            }
        }
        else if(posit == "p4")
        {
            if (n2online == 0){
                n2 = 3;
            } else if (n2online == 1) {
                n2 = 3;
            } else if (n2online == 2) {
                n2 = 2;
            } else if (n2online == 3) {
                n2 = 1;
            }

        }
    }
    if(n2 == 0){
        arrow (new THREE.Vector3(10, 10, 0), 1.3);
        x = 16;
        y = 16;
        if(n == 0){
            direction = new THREE.Vector3(-2, -1, 0);
        }
        else{
            direction = new THREE.Vector3(-1, -2, 0);
        }
    }
    else if(n2 == 1){
        arrow (new THREE.Vector3(10, -10, 0), 4);
        x = 16;
        y = -16;
        if(n == 0){
            direction = new THREE.Vector3(-1, 2, 0);
        }
        else{
            direction = new THREE.Vector3(-2, 1, 0);
    }
    }
    else if(n2 == 2){
        arrow (new THREE.Vector3(-10, -10, 0), -4);
        x = -16;
        y = -16;
        if(n == 0){
            direction = new THREE.Vector3(2, 1, 0);
        }
        else{
            direction = new THREE.Vector3(1, 2, 0);
        }
    }
    else{
        arrow (new THREE.Vector3(-10, 10, 0), 0.8);
        x = -16;
        y = 16;
        if(n == 0){
            direction = new THREE.Vector3(1, -2, 0);
        }
        else{
            direction = new THREE.Vector3(2, -1, 0);
        }
    }
    if (0 <= maxBalls) {
        maxBalls--;
        setTimeout(() => {
            let ball;
            if (isOnlineGame !== false) {
                 
                ball = new Ball2(window.gameScene, x, y, 0, new THREE.Vector2(20, 20), direction, 1, GameSocket, ballId);
            } else if (isOnlineGame === false) {
                ball = new Ball2(window.gameScene, x, y, 0, new THREE.Vector2(20, 20), direction,1);
            }
            BALLS.push(ball);
            ballsUpdate[ballId] = ball;
            ballC += 1;
        }, 500);
    }
}

let closestBall1 = 0;
let closestBall2 = 0;
let closestBall3 = 0;

let score = [10, 10];
let scoreTeam = [20, 20]
if (gameSettings.gameRules == "time") {
    scoreTeam = [0, 0];

    score = [0, 0, 0, 0];
    let score1String = document.getElementById("player0score").innerText;
    let score2String = document.getElementById("player1score").innerText
    score[0] = parseInt(document.getElementById("player0score").innerText);
    score[1] = parseInt(document.getElementById("player1score").innerText);
    
} else {
    let scorebase = 10;
    if (gameSettings.gameScoreLimit) {
        scorebase = parseInt(gameSettings.gameScoreLimit);
    }
    let scorebaseteam = scorebase * 2;
    score = [scorebase, scorebase, scorebase, scorebase];
    scoreTeam = [scorebaseteam, scorebaseteam];
    
}

let isPaused = false;

function bestOfFour(score) {
    let best = 0;
    let min = score[0];
    for (let i = 0; i < score.length; i++) {
        if (score[i] < min) {
            best = i;
            min = score[i];
        }
    }
    return best;
}

export function gameover(p1 = -1, p2 = -1, isLeft = false, abandon = false) {
    if (p1 !== -1 && p2 !== -1) {
        score[0] = p1;
        score[1] = p2;
        scoreP1.innerHTML = p1;
        scoreP2.innerHTML = p2;
    }

    if (gameSettings.gameType === "local-game")
    {
        endgameLocal(abandon);
    }
    
    if(gameSettings.gameRules == "time") {
        gameEnded = true;
        populateMatchDetails();
        if(gameSettings.gameMode == "1v1") {
            if (isLeft === true){
                showModal("You Win!", "Congratulations");
            } else if (posit == "p1" || gameSettings.gameType === "local-game" || gameSettings.gameType === "single-game") {
                if (score[0]  < score[1]) {
                    showModal("You Win!", "Congratulations, Player 1!");
                } else if (score[0] == score[1]) {
                    showModal("You DRAW!", "You suck! Go suck dick!");
                } else {
                    showModal("You lose!", "You suck! Go kill yourself!");
                }
            } else if (posit == "p2"){
                if (score[1] < score[0]) {
                    showModal("You Win!", "Congratulations, Player 2!");
                } else if (score[0] == score[1]){
                    showModal("You DRAW!", "You suck! Go suck dick!");
                } else{
                    showModal("You lose!", "You suck! Go kill yourself!");
                }
            }
        } else if (gameSettings.gameMode == "2v2") {
            if (scoreTeam[0] < scoreTeam[1]) {
                populateMatchDetails();
                showModal("You Win!", "Congratulations, Team 1!");
            } else {
                showModal("Game Over", "The game has ended.");
            }
        } else if (gameSettings.gameMode == "4dm") {
            if (bestOfFour(score) === 0) {
                populateMatchDetails();
                showModal("You Win!", "Congratulations, Team 1!");
            } else {
                showModal("Game Over", "The game has ended.");
            }
        }
    } else {

        var counter = 0;
        for (let i = 0; i < walls.length; i++) {
            if (walls[i] === true)
                counter++;
        }
        
        if (counter === 2 && document.getElementById("gamemode").textContent !== "1v1") { 
            populateMatchDetails();
            if (isLeft === true){
                showModal("You Win!", "Congratulations");
            } else if (score[0] > 0 && walls[0] === false) {
                showModal("You Win!", "Congratulations, Player 1!");
            } else {
                showModal("You lose!", "You suck! Go kill yourself!");
            }
        }
        else if (counter === 2 && document.getElementById("gamemode").textContent === "1v1") {
            gameEnded = true;
            populateMatchDetails();
            if (posit == "p1" || gameSettings.gameType === "local-game" || gameSettings.gameType === "single-game") {
                
                if (isLeft === true){
                    showModal("You Win!", "Congratulations");
                } else if (score[0] > 0 && score[0] > score[1]) {
                    showModal("You Win!", "Congratulations, Player 1!");
                }else if (score[0] == score[1]){
                    showModal("You DRAW!", "You suck! Go suck dick!");
                } else {
                    showModal("You lose!", "You suck! Go kill yourself!");
                }
            } else if (posit == "p2") {
                if (isLeft === true){
                    showModal("You Win!", "Congratulations");
                } else if (score[1] > 0 && score[1] > score[0]){
                    showModal("You Win!", "Congratulations, Player 1!");
                }else if (score[0] == score[1]){
                    showModal("You DRAW!", "You suck! Go suck dick!");
                } else {
                    showModal("You lose!", "You suck! Go kill yourself!");
                }
            }
            walls[0] = true;
            walls[1] = true;
        }

        if(score[0] <= 0 && walls [0] == false){
            paddle1.destroy();
            model3D.removeUfo(window.gameScene, ufo, 0);
            walls[0] = true;
        }
        else if(score[1] <= 0 && walls [1] == false){
            bot3.destroy();
            model3D.removeUfo(window.gameScene, ufo, 3);
            walls[1] = true;
        }
        else if(score[2] <= 0 && walls [2] == false){
            bot.destroy();
            model3D.removeUfo(window.gameScene, ufo, 1);
            walls[2] = true;
        }
        else if(score[3] <= 0 && walls [3] == false){
            bot2.destroy();
            model3D.removeUfo(window.gameScene, ufo, 2);
            walls[3] = true;
        }
    }
}

function showModal(title, message) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;
    document.getElementById("gameover-modal").style.display = "block";
}

function closeModal() {
    document.getElementById("gameover-modal").style.display = "none";
}
window.closeModal = closeModal;
function populateMatchDetails() {
    document.getElementById("detail-game-name").textContent = document.querySelector("#dashbase .small strong").textContent;
    document.getElementById("detail-game-type").textContent = document.getElementById("gametype").textContent;
    document.getElementById("detail-game-mode").textContent = document.getElementById("gamemode").textContent;
    document.getElementById("detail-game-rules").textContent = document.getElementById("gamerules").textContent;

    const rules = document.getElementById("gamerules").textContent;
    if (rules === "time") {
        document.getElementById("detail-time-limit").style.display = "block";
        document.getElementById("detail-game-timelimit").textContent = document.getElementById("gametime").textContent;
    } else {
        document.getElementById("detail-score-limit").style.display = "block";
        document.getElementById("detail-game-scorelimit").textContent = document.getElementById("gamescore").textContent;
    }

    document.getElementById("detail-game-balls").textContent = document.getElementById("gameballs").textContent;
    document.getElementById("detail-game-boost").textContent = document.getElementById("gameboost").textContent;

    populateFinalScores();

    document.getElementById("match-details").style.display = "block";
}

function populateFinalScores() {
    const scoreList = document.getElementById("score-list");
    scoreList.innerHTML = ""; 

    if(document.getElementById("detail-game-mode").textContent === "1v1") {

        var limit = 2;
    } else {
        var limit = 4;
    }
    
    for (let i = 0; i < 2; i++) {
        const playerElement = document.getElementById(`player${i}`);
        const playerName = playerElement?.querySelector("h5").textContent;
        const playerScore = score[i];

        const listItem = document.createElement("li");
        listItem.textContent = `${playerName}: ${playerScore} points`;
        scoreList.appendChild(listItem);
    }

    document.getElementById("final-scores").style.display = "block"; // Mostra la sezione dei punteggi finali
}

let oneTime = true
export let scoreP1 = document.getElementById("player0score");
export let scoreP2 = document.getElementById("player1score");
export let scoreP3 = document.getElementById("player2score");
export let scoreP4 = document.getElementById("player3score");
export let scoreTeam1 = document.getElementById("team1score");
export let scoreTeam2 = document.getElementById("team2score");

console.log("lo score e'", scoreP1, scoreP2);

function checkScore(ball){

    let usernameP1 = document.getElementById("player0");
    let usernameP2 = document.getElementById("player1");
    let usernameP3 = document.getElementById("player2");
    let usernameP4 = document.getElementById("player3");

    if(scoreP1 === null && scoreP2 === null && scoreP3 === null && scoreP4 === null && scoreTeam1 === null && scoreTeam2 === null){
        return(0);
    }
    if (scoreP1 === null && scoreP2 === null && scoreP3 === null && scoreP4 === null ) // se é a team
    {
        scoreTeam1.innerHTML = scoreTeam[0];
        scoreTeam2.innerHTML = scoreTeam[1];
    } else {
        scoreP1.innerHTML = score[0];
        scoreP2.innerHTML = score[1];
        if (scoreP3 !== null && scoreP4 !== null) // se é 4v4
        {
            scoreP3.innerHTML = score[2];
            scoreP4.innerHTML = score[3];
        } 
    }
    if(ball.mesh.position.y > 21){
        maxBalls++;
        if (gameSettings.gameRules == "time") {
            score[1]++;
            scoreTeam[0]++;
        } else {
            score[1]--;
            scoreTeam[0]--;
        }
        if (scoreP2 !== null)
        {
            scoreP2.innerHTML = score[1];
        }
        else
        {
            scoreTeam1.innerHTML = scoreTeam[0];
        }
        ball.destroy();
        if(score[1] == 0 && gameSettings.gameRules == "score")
            gameover();
        return(1);     
    }
    else if(ball.mesh.position.y < -21){
        maxBalls++;
        if (gameSettings.gameRules == "time") {
            score[0]++;
            scoreTeam[0]++;
        } else {
            score[0]--;
            scoreTeam[0]--;
        }
        if (scoreP1 !== null)
        {
            scoreP1.innerHTML = score[0];
        }
        else
        {
            scoreTeam1.innerHTML = scoreTeam[0];
        }
        ball.destroy();
        if(score[0] == 0 && gameSettings.gameRules == "score")
            gameover();
        return(1);
    }
    else if(ball.mesh.position.x > 21 && ((scoreP3 && scoreP4) || scoreTeam2)){
        maxBalls++;
        if (gameSettings.gameRules == "time") {
            score[2]++;
            scoreTeam[1]++;
        } else {
            score[2]--;
            scoreTeam[1]--;
        }
        if (scoreP3 !== null)
        {
            scoreP3.innerHTML = score[2];
        }
        else if(scoreTeam2 !== null)
        {
            scoreTeam2.innerHTML = scoreTeam[1];
        }
        ball.destroy();
        if(score[2] == 0 && gameSettings.gameRules == "score")
            gameover();
        return(1);
    }
    else if(ball.mesh.position.x < -21 && ((scoreP3 && scoreP4) || scoreTeam2)){
        maxBalls++;
        if (gameSettings.gameRules == "time") {
            score[3]++;
            scoreTeam[1]++;
        } else {
            score[3]--;
            scoreTeam[1]--;
        }
        if (scoreP4 !== null)
        {
            scoreP4.innerHTML = score[3];
        }
        else
        {
            scoreTeam2.innerHTML = scoreTeam[1];
        }
        ball.destroy();
        if(score[3] == 0 && gameSettings.gameRules == "score")
            gameover();
        return(1);
    }    

}




function checkScoreHost(ball){
    if (gameEnded === true) {
        return 0;
    }
    console.log("aasdasd");
    if (gamePaused == true)
    {
        return;
    }
    
    let scoreTeam1 = document.getElementById("team1score");
    let scoreTeam2 = document.getElementById("team2score");
    if(scoreP1 === null && scoreP2 === null && scoreP3 === null && scoreP4 === null && scoreTeam1 === null && scoreTeam2 === null){
        return(0);
    }
    if (scoreP1 === null && scoreP2 === null && scoreP3 === null && scoreP4 === null ) // se é a team
    {
        scoreTeam1.innerHTML = scoreTeam[0];
        scoreTeam2.innerHTML = scoreTeam[1];
    } else {
        scoreP1.innerHTML = score[0];
        scoreP2.innerHTML = score[1];
        if (scoreP3 !== null && scoreP4 !== null) // se é 4v4
        {
            scoreP3.innerHTML = score[2];
            scoreP4.innerHTML = score[3];
        } 
    }

    if(ball.mesh.position.y > 21 && ballToRemoveHost.get(ball.ballId) != true){
        maxBalls++;
        ballToRemoveHost.set(ball.ballId, true);
        if (gameSettings.gameRules == "time") {
            console.log("quiquiqui ", gamePaused);
            score[1] = score[1] + 1;
            scoreTeam[0]++;
        } else {
            score[1] = score[1] - 1;
            scoreTeam[0]--;
        }

        if(score[1] == 0 && gameSettings.gameRules == "score" || goldenGoal === true)
            GameSocket.send(JSON.stringify({ action: 'game_over', p1: score[0], p2: score[1] }));
        return(1);     
    }
    else if(ball.mesh.position.y < -21 && ballToRemoveHost.get(ball.ballId) != true){
        maxBalls++;
        ballToRemoveHost.set(ball.ballId, true)
        if (gameSettings.gameRules == "time") {
            console.log("quiquiqui ", gamePaused);
            score[0] = score[0] + 1;
            scoreTeam[0]++;
        } else {
            score[0] = score[0] - 1;
            scoreTeam[0]--;
        }
   
        if(score[0] == 0 && gameSettings.gameRules == "score" || goldenGoal === true)
            GameSocket.send(JSON.stringify({ action: 'game_over', p1: score[0], p2: score[1] }));
        return(1);
    }
    else if(ball.mesh.position.x > 21 && ((scoreP3 && scoreP4) || scoreTeam2)){
        maxBalls++;
        if (gameSettings.gameRules == "time") {
            score[2]++;
            scoreTeam[1]++;
        } else {
            score[2]--;
            scoreTeam[1]--;
        }
        if(score[2] == 0 && gameSettings.gameRules == "score" || goldenGoal === true)
            GameSocket.send(JSON.stringify({ action: 'game_over', p1: score[0], p2: score[1] }));
        return(1);
    }
    else if(ball.mesh.position.x < -21 && ((scoreP3 && scoreP4) || scoreTeam2)){
        maxBalls++;
        if (gameSettings.gameRules == "time") {
            score[3]++;
            scoreTeam[1]++;
        } else {
            score[3]--;
            scoreTeam[1]--;
        }
        if(score[3] == 0 && gameSettings.gameRules == "score" || goldenGoal === true)
            GameSocket.send(JSON.stringify({ action: 'game_over', p1: score[0], p2: score[1] }));
        return(1);
    }
}


function pauseGame(){
    if(!isPaused) {
        isPaused = true;
    }
    else {
        isPaused = false;
        animate();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'p') {
        pauseGame();
    }
});

var ball_is_ready = false;
export var ballCounter = 0;
export var collision_is_ready = false;
export let collisionMap = {};
export let ballsUpdate = {};
var move_is_ready = false;
var ballId;
var OnlineDeltaTime = 0;
let ballPosition = 0;
let ballToRemove = new Map();
let ballToRemoveHost = new Map();

let gameEnded = false;



const MATERIALBALL = new THREE.MeshStandardMaterial({
    color: 0x999999,
    metalness: 0.75,
    roughness: 0.2
});
export class Ball2 {
    
    constructor(scene, x, y, z, boundaries, velocity, r, GameSocket = null, ballId = null) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.z = z;
        this.boundaries = boundaries;
        this.r = r;
        this.speed = 10;
        this.mesh = new Mesh(new SphereGeometry(this.r), MATERIALBALL);
        this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.velocity = velocity;
        this.mesh.velocity.multiplyScalar(this.speed);
        this.mesh.isAttached = false;
        this.scene.add(this.mesh);
        this.GameSocket = GameSocket;
        this.ballId = ballId;
        this.debounceTimer = 0;
        this.coeffs = this.getCoefficients(posit);
    }

    getCoefficients(posit) {
        let coefficients = { x: 1, y: 1, z: 1 };

        switch (posit) {
            case "p2": 
                coefficients = { x: -1, y: -1, z: 1 };
                break;
            case "p3": 
                coefficients = { x: -1, y: 1, z: 1 };  
                break;
            case "p4": 
                coefficients = { x: 1, y: -1, z: 1 };  
                break;
        }

        return coefficients;
    }


    destroy(){
        this.scene.remove(this.mesh);
    }
    
    updateOnline(dt, walls, isHost = false, isOnlineGame = false)
    {
        let ballsUpdate = getBallsUpdate();
        
        
        if (isHost === true || isOnlineGame === false) 
        {
                const s = this.mesh.velocity.clone().multiplyScalar(dt);
                const tPos = this.mesh.position.clone().add(s);
                this.mesh.position.copy(tPos);                
    
                if(walls[0] && this.mesh.position.y < -this.boundaries.y)
                {
                    this.mesh.position.y = -this.boundaries.y;
                    this.mesh.velocity.y *= -1;
                }
                else if(walls[1] && this.mesh.position.x < -this.boundaries.x){
                    this.mesh.position.x = -this.boundaries.x;
                    this.mesh.velocity.x *= -1;
                }
                else if(walls[2] && this.mesh.position.y > this.boundaries.y){
                    this.mesh.position.y = this.boundaries.y;
                    this.mesh.velocity.y *= -1;            
                }
                else if(walls[3] && this.mesh.position.x > this.boundaries.x){
                    this.mesh.position.x = this.boundaries.x;
                    this.mesh.velocity.x *= -1;
                }
                if (isHost == true)
                {
                    this.debounceTimer += dt;
                    if (this.debounceTimer < 0.03) return;
                    this.debounceTimer = 0;
                    GameSocket.send(JSON.stringify({ action: "ball_update", ballId: this.ballId, position: this.mesh.position, velocity: this.mesh.velocity }));
                }
        }
        else if(isHost === false && isOnlineGame === true)
        {
            try {
                if(ballsUpdate[this.ballId] !== undefined && ballsUpdate[this.ballId] !== null && ballsUpdate[this.ballId].position !== undefined && ballsUpdate[this.ballId].velocity !== undefined)
                {
                    this.mesh.position.set(
                        ballsUpdate[this.ballId].position.x * this.coeffs.x,
                        ballsUpdate[this.ballId].position.y * this.coeffs.y,
                        ballsUpdate[this.ballId].position.z * this.coeffs.z
                    );
            
                    this.mesh.velocity.set(
                        ballsUpdate[this.ballId].velocity.x * this.coeffs.x,
                        ballsUpdate[this.ballId].velocity.y * this.coeffs.y,
                        ballsUpdate[this.ballId].velocity.z * this.coeffs.z
                    );
                }
                else
                {
                    const s = this.mesh.velocity.clone().multiplyScalar(dt);
                    const tPos = this.mesh.position.clone().add(s);
                    this.mesh.position.copy(tPos);                
        
                    if(walls[0] && this.mesh.position.y < -this.boundaries.y)
                    {
                        this.mesh.position.y = -this.boundaries.y;
                        this.mesh.velocity.y *= -1;
                    }
                    else if(walls[1] && this.mesh.position.x < -this.boundaries.x){
                        this.mesh.position.x = -this.boundaries.x;
                        this.mesh.velocity.x *= -1;
                    }
                    else if(walls[2] && this.mesh.position.y > this.boundaries.y){
                        this.mesh.position.y = this.boundaries.y;
                        this.mesh.velocity.y *= -1;            
                    }
                    else if(walls[3] && this.mesh.position.x > this.boundaries.x){
                        this.mesh.position.x = this.boundaries.x;
                        this.mesh.velocity.x *= -1;
                    }
                }
            }
            catch (e) {
                console.log(e);
            }

           
        }

    }

    update(dt, walls)
    {
        const s = this.mesh.velocity.clone().multiplyScalar(dt);
        const tPos = this.mesh.position.clone().add(s);
        this.mesh.position.copy(tPos);                
        if(walls[0] && this.mesh.position.y < -this.boundaries.y)
        {
            this.mesh.position.y = -this.boundaries.y;
            this.mesh.velocity.y *= -1;
        }
        else if(walls[1] && this.mesh.position.x < -this.boundaries.x){
            this.mesh.position.x = -this.boundaries.x;
            this.mesh.velocity.x *= -1;
        }
        else if(walls[2] && this.mesh.position.y > this.boundaries.y){
            this.mesh.position.y = this.boundaries.y;
            this.mesh.velocity.y *= -1;            
        }
        else if(walls[3]  && this.mesh.position.x > this.boundaries.x){
            this.mesh.position.x = this.boundaries.x;
            this.mesh.velocity.x *= -1;
        }
    }
}

export function getBallsUpdate() {
    return ballsUpdate;
}
export function updateBall(ballId, position, velocity) {
    if(!ballsUpdate[ballId]) {
        ballsUpdate[ballId] = { };
    }
    
    ballsUpdate[ballId] = { ballId: ballId, position: position, velocity: velocity };
}

export function addCollisionCorrection(ballId, ballId2 = -1, type, correction) {
    // Se l'oggetto ballId non esiste ancora, crealo
    if (!collisionMap[ballId]) {
        collisionMap[ballId] = {};
    }
    
    // Aggiungi o aggiorna la correzione per il tipo specifico
    collisionMap[ballId][type] = correction;
    if (ballId2 !== null && ballId2 !== -1) {
        collisionMap[ballId]["ballId2"] = ballId2;
    }
}

export function removeCollisionCorrection(ballId, type) {
    // Controlla se il ballId esiste nella mappa
    if (collisionMap[ballId]) {
        // Controlla se esiste una correzione per il tipo specificato
        if (collisionMap[ballId][type]) {
            // Rimuovi la correzione per quel tipo
            delete collisionMap[ballId][type];

            // Se non ci sono più correzioni per questo ballId, rimuovi anche il ballId
            if (Object.keys(collisionMap[ballId]).length === 0) {
                delete collisionMap[ballId];
            }
        }
    }
}

export function getBallPosition() {
    return ballPosition;
}

export function setBallPosition(newPosition) {
    ballPosition = newPosition;
}

export function getBallId() {
    return ballId;
}

export function setBallId(newId) {
    ballId = newId;
}

export function setBallIsReady() {
    ball_is_ready = true;
}

export function setDataReady() {
    data_is_ready = true;
}

export function setMoveReady() {
    move_is_ready = true;
}

export function setOnlineDeltaTime(newDeltaTime) {
    OnlineDeltaTime = newDeltaTime;
}

export function setBallToRemove(ballId) {
    ballToRemove.set(ballId, true);
}

export function getBallToRemove() {
    return ballToRemove;
}

export function removeBallToRemove(ballId) {
    ballToRemove.delete(ballId);
    return true;
}

export function setCollisionReady(ready) {
    collision_is_ready = ready;
}


// ti metti in attesa che tutto (modelli e altro) sia caricato e a vista, parte un count down di 3 secondi e poi o start timer o start score sistem//
let flagTimer = true;


let gametype = document.getElementById('gametype').innerText;

if(gametype == 'remote-game' || gametype == 'tournament')
{
    window.handleKeyDownOnline = function(event) {
        if(isInKeyPlayer(event.code) && !keyboardState[event.code])
        {   
            keyboardState[event.code] = true;
            const key = getPlayerControl(event.code);
            GameSocket.send(JSON.stringify({ action: "move", game_id_game: game_id_game, username: username_game, key: key, state: "down" }));
        }
    }
    window.addEventListener('keydown', window.handleKeyDownOnline);   

    window.handleKeyUpOnline = function(event) {
        if(isInKeyPlayer(event.code))
        {
            keyboardState[event.code] = false;
            const key = getPlayerControl(event.code);
            GameSocket.send(JSON.stringify({ action: "move", game_id_game: game_id_game, username: username_game, key: key, state: "up" }));
        }
    }
    window.addEventListener('keyup', window.handleKeyUpOnline);

    GameSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        if (data.action === "move") {
            if (data.state === 'down') {
                keyboardState[data.key] = true;
            } else if (data.state === 'up') {
                keyboardState[data.key] = false;
            }
        }
        else if (data.action === "ball_launch") {
            if (gameEnded !== true) {
                setBallPosition(data.position);
                setBallId(data.ballId);
                setBallIsReady(true);
            }
        } else if (data.action === "ball_update") {
            updateBall(data.ballId, data.position, data.velocity);
        } else if (data.action === "ball_destroy") {
            setBallToRemove(data.ballId);
        } else if (data.action === "time_update") {
            const timerElement = document.getElementById('game-timer');
            const countdownElement = document.getElementById('countdown');
            const timer = data.time;
            if (timer < 0)
            {
                connectionOk = true;
            }
            countdownElement.innerText = timer;
        } else if (data.action === "game_over") {
            if (isHost === true) {
                endgameOnline();
            }
            gameEnded = true;
            gameover(data.p1, data.p2);
        } else if (data.action === "score_update") {
            score[0] = parseInt( data.score.p1, 10);
            score[1] = parseInt( data.score.p2, 10);
            scoreP1.innerText = data.score.p1;
            scoreP2.innerText = data.score.p2;
            if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
                scoreP3.innerText = data.p3;
                scoreP4.innerText = data.p4;
                scoreTeam1.innerText = data.team1;
                scoreTeam2.innerText = data.team2;
            }
        }
        else if (data.action === 'leave')
        {
            gameEnded = true;
            if (isHost === true) {
                endgameOnline(true);
            } else {
                endgameOnline(true, true);
            }
            gameover(-1, -1, true);
        }
        else if (data.action === 'player_leave')
        {
            gamePaused = true;
            gameIsStarting = true;
            BALLS.forEach(ball => { ball.destroy(); ball = null; });
            BALLS =  [];
            ballToRemove.clear();
            ballToRemoveHost.clear();
            maxBalls = gameSettings.gameBalls;
            paddle1.mesh.spawn = new THREE.Vector2(0, -20);
            paddle1.mesh.position.set(paddle1.mesh.spawn.x, paddle1.mesh.spawn.y);
            paddle2.mesh.spawn = new THREE.Vector2(0, 20);
            paddle2.mesh.position.set(paddle2.mesh.spawn.x, paddle2.mesh.spawn.y);
            ballCounter = 0;
            ball_is_ready = false;
            collision_is_ready = false;
            collisionMap = {};
            ballsUpdate = {};
            if (gameEnded !== true) {
                document.getElementById('leavegame').disabled = true;
                startConnectionCountdown();
            }
            document.getElementById("wait-modal").style.display = "block";
        }
        else if (data.action === 'player_rejoin')
        {
            /* gamePaused = false;
            gameIsStarting = true;
            firstTimer = true; */
            //document.getElementById("wait-modal").style.display = "none";
        }
        else if (data.action === 'join')
        {
            if (isHost === true && data.username !== username_game)
            {
                if (gamePaused === true) {
                    gamePaused = false;
                    firstTimer = true;
                }
            }

            if (isHost === false && data.username !== username_game)
            {
                launchReadyInterval();
                connectionOk = true;
                GameSocket.send(JSON.stringify({ action: "join", game_id_game: game_id_game, username: username_game }));
            }
        }
        else if (data.action === 'start_game')
        {
            gamePaused = false;
            gameIsStarting = false;
            document.getElementById("wait-modal").style.display = "none";
            document.getElementById('leavegame').disabled = false;
            if (connectionOk === false) {
                connectionOk = true;
            }
        }
    }
} else {
    window.handleKeyDown = function(event) {
        if (!keyboardState[event.code]) {
            keyboardState[event.code] = true;
        }
    }
    window.removeEventListener('keydown', window.handleKeyDown);
    window.addEventListener('keydown', window.handleKeyDown);
    
    window.handleKeyUp = function (event) {
        keyboardState[event.code] = false;
    }
    window.removeEventListener('keyup', window.handleKeyUp);
    window.addEventListener('keyup', window.handleKeyUp);
}

function startCountdown() {
    let countdown = -10;
    let countdownElement = document.getElementById('countdown');
    window.timer = document.getElementById('countdown').textContent;
    let intervalCountdown = setInterval(() => {
        countdownElement.innerText = countdown;
        countdown++;
        GameSocket.send(JSON.stringify({ action: "time_update", time: countdown }));
        if (countdown == 0) {
            clearInterval(intervalCountdown);
            GameSocket.send(JSON.stringify({ action: "start_game" }));
            
            
            if (gameSettings.gameRules == "time") {
                gameIsStarting = false;
                document.getElementById('countdown').textContent = window.timer;
                window.timer = null;
            }
        }
    }, 1000);
}

function launchReadyInterval() {
    let interval = setInterval(() => {
        GameSocket.send(JSON.stringify({ action: "join", game_id_game: game_id_game, username: username_game }));
        if (gamePaused === false) {
            clearInterval(interval);
        }
    }, 1000);
}

let firstTimer = true;
let gameIsStarting = true;
let firstTimerBanner = true;

let connectionOk = false;

function startConnectionCountdown() {
    let countdown = 60;
    connectionOk = false;
    let countdownElement = document.getElementById('countdown-conn');
    countdownElement.style.display = "block";
    let startConnectionCountdown = setInterval(() => {
        countdownElement.innerText = countdown;
        countdown--;
        if (connectionOk === true) {
            clearInterval(startConnectionCountdown);
            countdownElement.style.display = "none";
        } else if (countdown == 0) {
            clearInterval(startConnectionCountdown);
            document.getElementById("leavegame").disabled = false;
            countdownElement.style.display = "none";
            if (isHost === true) {
                endgameOnline(true);
            } else {
                endgameOnline(true, true);
            }
            gameover(-1, -1, true);
        }
    }, 1000);
}

function animateonline(){

    if (firstTimerBanner === true) {
        document.getElementById("wait-modal").style.display = "block";
        firstTimerBanner = false;
        startConnectionCountdown();
    }
    
    if (gameEnded === true) {
        return 0;
    }
    
    if (gamePaused === true) {
        
        if (isHost === false && firstTimer === true) {
            launchReadyInterval();
            firstTimer = false;
        } 
        requestAnimationFrame(animateonline);
        return;
    }

    if (gameIsStarting === true) {
        connectionOk = true;
        if (isHost === true && firstTimer === true) {
            startCountdown();
        }
        document.getElementById('countdown').display = "block";
        if (firstTimer === true) {
            firstTimer = false;
        }
        requestAnimationFrame(animateonline);
        return;
    } 
    if(gameSettings.gameRules == "time" && flagTimer == true && isHost == true){ 
        flagTimer = false;
        setTimeout(() => {            
            startTimerOnline();
        } , 1000);        
    }
    const deltaTime = clock.getDelta();
    timer += deltaTime;
    timer2 += deltaTime;
    if (ball_is_ready && gameEnded === false) {
        launchBall(ballPosition, ballId);
        ball_is_ready = false;
    } else if (isHost && !ball_is_ready && timer >= interval && 0 < maxBalls && gameEnded === false) {
        setTimeout(() => {
            GameSocket.send(JSON.stringify({ action: "ball_launch", position: Math.floor(Math.random() * 4), ballId: "ball_" + ballCounter }));          
        }, 500);
        ballCounter++;
        timer = 0; // Reseta il timer
    }

    if (paddle1 && walls[0] == false) {
        paddle1.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts === "True"){
            paddle1.shoot(BALLS);
            paddle1.turbo();
        }
        model3D.moveUfo0(paddle1, ufo);
    }

    if (paddle2 && walls[2] == false) {
        paddle2.update(deltaTime, BALLS);

        if(gameSettings.gameBoosts === "True"){
            paddle2.shoot(BALLS);
            paddle2.turbo();
        }
        model3D.moveUfo1(paddle2, ufo);
    }

    if (paddle3 && walls[1] == false) {
        paddle3.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts == "true"){
            paddle3.shoot(BALLS);
            paddle3.turbo();
        }
        model3D.moveUfo2(paddle3, ufo);
    }

    if (paddle4 && walls[3] == false) {
        paddle4.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts == "true"){
            paddle4.shoot(BALLS);
            paddle4.turbo();
        }
        model3D.moveUfo3(paddle4, ufo);
    }

    
    for (let i = 0; i < BALLS.length; i++) {
        if (BALLS[i]) {
            let toRemove = BALLS[i].ballId;
            if (ballToRemove.has(toRemove)) {
                if (isHost == false) {
                    maxBalls++;
                }
                ballsUpdate[toRemove] = null;
                delete ballsUpdate[toRemove];
                BALLS[i].destroy();
                removeBallToRemove(toRemove);
                BALLS.splice(i, 1);
            }else{
                if(isHost == true) {
                    BALLS[i].updateOnline(deltaTime, walls, isHost, true);
                } else {
                    BALLS[i].updateOnline(deltaTime, walls, false, true);
                }
            } 
        }
    }
    
    if (isHost === true) {

        for (let i = 0; i < BALLS.length; i++) {
            if (BALLS[i] && gamePaused === false) {
               
                if (checkScoreHost(BALLS[i]) == 1) {

                    GameSocket.send(JSON.stringify({ action: "score_update", score: { p1: score[0], p2: score[1], p3: score[2], p4: score[3], team1: scoreTeam[0], team2: scoreTeam[1] } }));
                    GameSocket.send(JSON.stringify({ action: "ball_destroy", ballId: BALLS[i].ballId }));
                }
            }
        }
    
        for(let i = 0; i < BALLS.length; i++){ // collisione balls pad
            if(ballCollision(BALLS[i], paddle1) && walls[0] == false) {
                penetrationDepthCorner2(BALLS[i], paddle1, isOnlineGame, isHost);
                ballPadCollisionResponse(BALLS[i], paddle1, isOnlineGame, isHost);            
            }
    
            if (ballCollision(BALLS[i], paddle2) && walls[2] == false) {
                penetrationDepthCorner2(BALLS[i], paddle2, isOnlineGame, isHost);
                ballPadCollisionResponse(BALLS[i], paddle2, isOnlineGame, isHost);
            }

            if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
                if (ballCollision(BALLS[i], paddle3) && walls[3] == false) {
                    penetrationDepthCorner2(BALLS[i], paddle3, isOnlineGame, isHost);
                    ballPadCollisionResponse(BALLS[i], paddle3, isOnlineGame, isHost);
                }
                if (ballCollision(BALLS[i], paddle4) && walls[1] == false) {
                    penetrationDepthCorner2(BALLS[i], paddle4, isOnlineGame, isHost);
                    ballPadCollisionResponse(BALLS[i], paddle4, isOnlineGame, isHost);
                }
            }
        }
        
        for (let i = 0; i < BALLS.length; i++) { // collisione balls
            for (let j = 0; j < BALLS.length; j++) {
                if (ballCollision(BALLS[i], BALLS[j])) {
                    penetrationDepth(BALLS[i], BALLS[j], isOnlineGame, isHost);
                    collisionResponse(BALLS[i], BALLS[j], isOnlineGame, isHost);
                }
            }
        }
    
        for (let i = 0; i < corners.length; i++) { // collisione corner
            for (let j = 0; j < BALLS.length; j++) {
                if (cornerCollision(BALLS[j], corners[i])) {
                    penetrationDepthCorner2(BALLS[j], corners[i], isOnlineGame, isHost);
                    ballPadCollisionResponse(BALLS[j], corners[i], isOnlineGame, isHost);
                }
            }
        }
    }

    renderer.render(window.gameScene, camera);
    window.animationFrameId = requestAnimationFrame(animateonline);
}

if (gameSettings.gameType === "local-game") {
    document.getElementById('leavegame').disabled = false;
}

function animate() {
    if (window.gameScene === undefined || window.gameScene === null || gameEnded === true) {
        return;
    }
    if(gameSettings.gameRules == "time" && flagTimer == true && gameEnded === false) {
        flagTimer = false;
        setTimeout(() => {            
            startTimer();
        } , 7000);        
    }

    if (isPaused) {
        requestAnimationFrame(animate); // Se è in pausa, richiama se stesso e attende la ripresa
        return;
    }
    const deltaTime = clock.getDelta();
    timer += deltaTime;
    timer2 += deltaTime;
    if (timer >= interval && 0 < maxBalls) { // BALLS.length con 0
        launchBall();
        timer = 0; // Reseta il timerw
    } 

    if (bot && timer2 >= interval) {
        if(walls[2] == false)
            bot.AI(BALLS, closestBall1, gameSettings.gameBoosts);
        if(walls[3] == false)
            bot2.AI(BALLS, closestBall2, gameSettings.gameBoosts);
        if(walls[1] == false)
            bot3.AI(BALLS, closestBall3, gameSettings.gameBoosts);
        timer2 = 0;
    }

    if (paddle1 && walls[0] == false) {
        paddle1.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts == "true"){
            paddle1.shoot(BALLS);
            paddle1.turbo();
        }
        model3D.moveUfo0(paddle1, ufo);
    }

    if (paddle2 && walls[2] == false) {
        paddle2.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts == "true"){
            paddle2.shoot(BALLS);
            paddle2.turbo();
        }
        model3D.moveUfo1(paddle2, ufo);
    }

    if (paddle3 && walls[1] == false) {
        paddle3.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts == "true"){
            paddle3.shoot(BALLS);
            paddle3.turbo();
        }
        model3D.moveUfo2(paddle3, ufo);
    }

    if (paddle4 && walls[3] == false) {
        paddle4.update(deltaTime, BALLS);
        if(gameSettings.gameBoosts == "true"){
            paddle4.shoot(BALLS);
            paddle4.turbo();
        }
        model3D.moveUfo3(paddle4, ufo);
    }
 
    for (let i = 0; i < BALLS.length; i++) {
        if (BALLS[i]) {
            BALLS[i].update(deltaTime, walls);
            if (checkScore(BALLS[i])) {
                BALLS.splice(i, 1);
            }
        }
    }

    for(let i = 0; i < BALLS.length; i++){ // collisione balls pad
        if(ballCollision(BALLS[i], paddle1) && walls[0] == false) {
            penetrationDepthCorner2(BALLS[i], paddle1);
            ballPadCollisionResponse(BALLS[i], paddle1);            
        }

        if (gameSettings.gameType == "single-game") {
            if (ballCollision(BALLS[i], bot) && walls[2] == false) {
                penetrationDepthCorner2(BALLS[i], bot);
                ballPadCollisionResponse(BALLS[i], bot);
            }
        } else {
            if (ballCollision(BALLS[i], paddle2) && walls[2] == false) {
                penetrationDepthCorner2(BALLS[i], paddle2);
                ballPadCollisionResponse(BALLS[i], paddle2);
            }
        }
        if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
            if (gameSettings.gameType == "single-game") {
                if (ballCollision(BALLS[i], bot2) && walls[3] == false) {
                    penetrationDepthCorner2(BALLS[i], bot2);
                    ballPadCollisionResponse(BALLS[i], bot2);
                }
                if (ballCollision(BALLS[i], bot3) && walls[1] == false) {
                    penetrationDepthCorner2(BALLS[i], bot3);
                    ballPadCollisionResponse(BALLS[i], bot3);
                }
            } else {
                if (ballCollision(BALLS[i], paddle3) && walls[3] == false) {
                    penetrationDepthCorner2(BALLS[i], paddle3);
                    ballPadCollisionResponse(BALLS[i], paddle3);
                }
                if (ballCollision(BALLS[i], paddle4) && walls[1] == false) {
                    penetrationDepthCorner2(BALLS[i], paddle4);
                    ballPadCollisionResponse(BALLS[i], paddle4);
                }
                
            }
        }
    }
    
    for (let i = 0; i < BALLS.length; i++) { // collisione balls
        for (let j = 0; j < BALLS.length; j++) {
            if (ballCollision(BALLS[i], BALLS[j])) {
                penetrationDepth(BALLS[i], BALLS[j]);
                collisionResponse(BALLS[i], BALLS[j]);
            }
        }
    }

    for (let i = 0; i < corners.length; i++) { // collisione corner
        for (let j = 0; j < BALLS.length; j++) {
            if (cornerCollision(BALLS[j], corners[i])) {
                penetrationDepthCorner2(BALLS[j], corners[i]);
                ballPadCollisionResponse(BALLS[j], corners[i]);
            }
        }
    }
    
    if (bot && bot.mesh != null) {
        bot.update(deltaTime, BALLS, closestBall1);
        model3D.moveUfo1(bot, ufo);
        
    }
    if (bot2 && bot2.mesh != null) {
        bot2.update(deltaTime, BALLS, closestBall2);
        model3D.moveUfo2(bot2, ufo);
    }
    if (bot3 && bot3.mesh != null) {
        bot3.update(deltaTime, BALLS, closestBall3);
        model3D.moveUfo3(bot3, ufo);
    }    

    if (keyboardState['Keyb']) {
        for (let i = 0; i < BALLS.length; i++) {
            window.gameScene.remove(BALLS[i].mesh);
        }
        BALLS = [];
    }
    window.renderer.render(window.gameScene, camera);
    window.animationFrameId = requestAnimationFrame(animate);
}
//animate();
function start() {
    Promise.all([
        model3D.loadModel1v1(window.gameScene, ufo),
        model3D.loadModel2v2(window.gameScene, ufo, gameSettings.gameMode)
        
    ]).then(() => {
        if (isOnlineGame === true) {

            animateonline();
        } else {
            animate();
        }
    }).catch((error) => {
        console.error('Errore durante il caricamento dei modelli:', error);
    });
}
start();
