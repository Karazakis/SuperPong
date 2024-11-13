
import { Corner } from "/static/js/game/src/Corner.js";
//import { Ball2 } from "/static/js/game/src/Ball2.js";
import {init} from "/static/js/game/src/Init.js";
import { Model3D } from "/static/js/game/src/Model3D.js";
//import { Pad } from "/static/js/game/src/Pad.js";
import { BotTop } from "/static/js/game/src/BotTop.js";
import { BotSide } from "/static/js/game/src/BotSide.js";
import {Mesh} from "/static/js/game/module/three.module.js";

import { cornerCollision, penetrationDepthCorner2, ballCollision, penetrationDepth, collisionResponse, ballPadCollisionResponse } from "/static/js/game/src/Collision.js";

console.log("game.js puttana madonna loaded");

document.addEventListener('cleanupGameEvent', function() {
    cleanupGame();
    console.log('Cleaning up game...');
});

window.inGame = true;
function cleanupGame() {
    
    
    
    window.clearAllScene();
    if (window.animationFrameId !== null && window.animationFrameId !== undefined) {
        cancelAnimationFrame(window.animationFrameId);
        window.animationFrameId = null;
    }
    BALLS.forEach(ball => ball.destroy());
    BALLS = [];
    ufo = [];
    window.inGame = false;
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
    if (gameSettings.gameType === "remote-game" || gameSettings.gameType === "tournament-game") {
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
    }
    console.log("Game cleaned up");
}

console.log("game.js loaded");
export const gameSettings = init();
console.log(gameSettings);

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

    constructor(scene, boundaries, spawnX, spawnY ,left, right, shoot, turbo) {
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
        const currentTime = Date.now(); // da sistemare        
        if (currentTime - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        let moved = false;
        if (keyboardState[this.mesh.right]) { // movimento pad
            if (this.mesh.position.x < this.boundaries.x - 7) {
                this.mesh.position.x += dt * this.mesh.speed;
                moved = true;
            }
        } 
        if (keyboardState[this.mesh.left]) {
            if (this.mesh.position.x > -this.boundaries.x + 7) {
                this.mesh.position.x -= dt * this.mesh.speed;
                moved = true;
            }
        } 
        if (moved && this.mesh.position.x !== this.previousPositionX) {
            this.previousPositionX = this.mesh.position.x;
            this.lastUpdateTime = currentTime;
            for (let j = 0; j < this.mesh.attachedBalls.length; j++) {
                if (this.mesh.attachedBalls[j]) {
                    this.mesh.attachedBalls[j].mesh.position.x = this.mesh.position.x + this.ballSlots[j].x;
                    this.mesh.attachedBalls[j].mesh.position.y = this.mesh.position.y + this.ballSlots[j].y;
                }
            }
        }
    }

    collision(ball, paddle){
        return (ball.r + paddle.r >= paddle.mesh.position.distanceTo(ball.mesh.position));
    }

    shoot(balls) {
        const releaseBalls = () => {
            console.log("Rilascia le palline automaticamente");
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
                    console.log(`Rilasciata la palla ${this.mesh.attachedBalls[j].mesh.id} dallo slot ${j}`);
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
                    console.log("hasBall = " + this.mesh.hasBall, "stato m = " + this.mesh.previousMState);
                    if (!this.mesh.previousMState && !balls[i].mesh.isAttached) {
                        console.log("il tasto 'm' è premuto");
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
                            console.log(`Attacco la palla ${balls[i].mesh.id} allo slot ${closestSlot}`);
                            balls[i].mesh.velocity.set(0, 0, 0);
                        }
                    }
                    
                    else if (this.mesh.previousMState && balls[i].mesh.isAttached == false ) {
                        console.log("attacco un altra pallina " + balls[i].mesh.id);
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
                            console.log(`Attacco un altra palla ${balls[i].mesh.id} allo slot ${closestSlot}`);
                            balls[i].mesh.velocity.set(0, 0, 0);
                        }
                    }
                    
                    if (!this.releaseTimeout) {
                        this.releaseTimeout = setTimeout(releaseBalls, this.shootRelease);
                    }
                } else {
                    if (this.mesh.previousMState) {
                        console.log("il tasto 'm' è rilasciato e le balls sono: " + this.mesh.hasBall.length);
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
                                console.log(`Rilasciata la palla ${this.mesh.attachedBalls[j].mesh.id} dallo slot ${j}`);
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
            console.log("turbo");
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

export function endgameOnline() {
    const accessToken = localStorage.getItem("accessToken");
	const csrfToken = getCookie('csrftoken');
    let gameId = window.location.pathname.split("/");
    console.log("Il gioco è finito!", gameId);
    let url = "/api/game/" + gameId[2]  + "/";
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
            try {
                let scorePlayer1 = document.getElementById('player0score').textContent;
                let scorePlayer2 = document.getElementById('player1score').textContent;
                let data = {
                    scorePlayer1: scorePlayer1,
                    scorePlayer2: scorePlayer2,
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
        
                if (!response.ok) {
                    throw new Error('Errore durante il blocco dell\'utente');
                }
                console.log('game finito con successo');
            } catch (error) {
                console.error('Errore durante la richiesta:', error);
            }
		}
		checkTokenValidity(url);
}
function startTimer() {
    // Inizializza il timer del gioco
    console.log("Inizializzazione del timer del gioco...");
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

function startTimerOnline() {
    console.log("Inizializzazione del timer del gioco online...");
    const timerElement = document.getElementById('game-timer');
    const countdownElement = document.getElementById('countdown');
    const timerValue = parseInt(timerElement.getAttribute('data-timer'), 10);

    if (typeof GameSocket === 'undefined' || GameSocket === null) {
        console.error("GameSocket non è definito.");
        return;
    }

    if (!isNaN(timerValue) && timerValue > 0) {
        let timeRemaining = timerValue * 60;

        countdownElement.textContent = timeRemaining;
        GameSocket.send(JSON.stringify({ action: 'time_update', time: timeRemaining }));
        const countdownInterval = setInterval(function() {
            if (GameSocket === null) {
                console.warn("GameSocket è diventato null. Interruzione del timer.");
                clearInterval(countdownInterval);
                return;
            }
            timeRemaining--;
            GameSocket.send(JSON.stringify({ action: 'time_update', time: timeRemaining }));

            if (timeRemaining <= 0) {
                clearInterval(countdownInterval);
                if (isHost) {
                    GameSocket.send(JSON.stringify({ action: 'game_over' }));
                }
            }
        }, 1000);
    } else {
        console.error("Valore del timer non valido:", timerValue);
    }
}

console.log("sporcodeldioddieodoieodied", gameSettings.gameRules);

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
let paddle1 = new Pad(window.gameScene, boundaries, 0, -20, p1Controls.left, p1Controls.right, p1Controls.shoot, p1Controls.boost);
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

const isOnlineGame = gameSettings.gameType === "remote-game" || gameSettings.gameType === "tournament-game";
export const isHost = posit === "p1";

if (gameSettings.gameType == "single-game") {
    console.log("entro in single e la gamemode é: " + gameSettings.gameMode);
    bot = new BotTop(window.gameScene, new THREE.Vector3(0, 20, 0), new THREE.Vector2(20, 20));
    if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        console.log("2v2 o DM loaded");
        walls[1] = false; 
        walls[3] = false;
        bot2 = new BotSide(window.gameScene, new THREE.Vector3(20, 0, 0), new THREE.Vector2(20, 20));
        bot3 = new BotSide(window.gameScene, new THREE.Vector3(-20, 0, 0), new THREE.Vector2(20, 20));
    }
} else if (gameSettings.gameType == "local-game") {
    p2Controls = getPlayerControls("player1");
    console.log("p2Controls: ", p2Controls);
    paddle2 = new Pad(window.gameScene, boundaries, 0, 20, p2Controls.left, p2Controls.right, p2Controls.shoot, p2Controls.boost);
    if(gameSettings.gameMode == "1v1") {
        console.log("1v1 loaded");
    }
    else if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        console.log("2v2 o DM loaded");
        p3Controls = getPlayerControls("player2");
        p4Controls = getPlayerControls("player3");
        if (p3Controls) {
            paddle3 = new Pad(window.gameScene, boundaries, 20, 0, p3Controls.left, p3Controls.right, p3Controls.shoot, p3Controls.boost, "vertical");
        }
        if (p4Controls) {
            paddle4 = new Pad(window.gameScene, boundaries, -20, 0, p4Controls.left, p4Controls.right, p4Controls.shoot, p4Controls.boost, "vertical");
        }
        walls[1] = false; 
        walls[3] = false;
    }
} else if (gameSettings.gameType == "remote-game" || gameSettings.gameType == "tournament-game") {
    p2Controls = getPlayerControls("player1");
    console.log("p2Controls: ", p2Controls);
    console.log("p2c    ontrols: ", p2Controls);
    paddle2 = new Pad(window.gameScene, boundaries, 0, 20, p2Controls.right, p2Controls.left, p2Controls.shoot, p2Controls.boost);
    if(gameSettings.gameMode == "1v1") {
        console.log("1v1 loaded");
    }
    else if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
        console.log("2v2 o DM loaded");
        p3Controls = getPlayerControls("player2");
        p4Controls = getPlayerControls("player3");
        if (p3Controls) {
            paddle3 = new Pad(window.gameScene, boundaries, 20, 0, p3Controls.left, p3Controls.right, p3Controls.shoot, p3Controls.boost, "vertical");
        }
        if (p4Controls) {
            paddle4 = new Pad(window.gameScene, boundaries, -20, 0, p4Controls.left, p4Controls.right, p4Controls.shoot, p4Controls.boost, "vertical");
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
let interval = 4;
let timer = 0;
let timer2 = 0;

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

function launchBall(n2online = 0, ballId = null) {
    let direction;
    let n = 0;
    let n2 = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (gameSettings.gameType == "remote-game" || gameSettings.gameType == "tournament-game") {
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
            const ball = new Ball2(window.gameScene, x, y, 0, new THREE.Vector2(20, 20), direction, 1, GameSocket, ballId);
            BALLS.push(ball);
            ballsUpdate[ballId] = ball;
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

export function gameover(){

    if(gameSettings.gameRules == "time") {
        if(gameSettings.gameMode == "1v1") {

            if (score[0]  < score[1]) {
                populateMatchDetails();
                showModal("You Win!", "Congratulations, Player 1!");
            } else {
                showModal("Game Over", "The game has ended.");
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

        if (counter === 2 && document.getElementById("detail-game-mode").textContent !== "1v1") { 
            if (score[0] > 0 && walls[0] === false) {
                populateMatchDetails();
                showModal("You Win!", "Congratulations, Player 1!");
            } else {
                showModal("Game Over", "The game has ended.");
            }
        }
        else if (counter === 4 && document.getElementById("detail-game-mode").textContent === "1v1") {
            if (score[0] > 0 && walls[0] === false) {
                populateMatchDetails();
                showModal("You Win!", "Congratulations, Player 1!");
            } else {
                showModal("Game Over", "The game has ended.");
            }
        }

        if(score[0] <= 0 && walls [0] == false){
            console.log("game over PLAYER1");
            paddle1.destroy();
            model3D.removeUfo(window.gameScene, ufo, 0);
            walls[0] = true;
        }
        else if(score[1] <= 0 && walls [1] == false){
            console.log("game over BOT3");
            bot3.destroy();
            model3D.removeUfo(window.gameScene, ufo, 3);
            walls[1] = true;
        }
        else if(score[2] <= 0 && walls [2] == false){
            console.log("game over BOT");
            bot.destroy();
            model3D.removeUfo(window.gameScene, ufo, 1);
            walls[2] = true;
        }
        else if(score[3] <= 0 && walls [3] == false){
            console.log("game over BOT2");
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




function checkScore(ball){
    // if(oneTime == true)
    // {
    //     oneTime = false;
    //     let scoreP1 = document.getElementById("player0score");
    //     let scoreP2 = document.getElementById("player1score");
    //     let scoreP3 = document.getElementById("player2score");
    //     let scoreP4 = document.getElementById("player3score");
    // }
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
            score[1] = score[1] + 1;
            scoreTeam[0]++;
        } else {
            score[1] = score[1] - 1;
            scoreTeam[0]--;
        }

        if(score[1] == 0 && gameSettings.gameRules == "score")
            GameSocket.send(JSON.stringify({ action: 'game_over' }));
        return(1);     
    }
    else if(ball.mesh.position.y < -21 && ballToRemoveHost.get(ball.ballId) != true){
        maxBalls++;
        ballToRemoveHost.set(ball.ballId, true)
        if (gameSettings.gameRules == "time") {
            score[0] = score[0] + 1;
            scoreTeam[0]++;
        } else {
            score[0] = score[0] - 1;
            scoreTeam[0]--;
        }
   
        if(score[0] == 0 && gameSettings.gameRules == "score")
            GameSocket.send(JSON.stringify({ action: 'game_over' }));
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
        if(score[2] == 0 && gameSettings.gameRules == "score")
            GameSocket.send(JSON.stringify({ action: 'game_over' }));
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
        if(score[3] == 0 && gameSettings.gameRules == "score")
            GameSocket.send(JSON.stringify({ action: 'game_over' }));
        return(1);
    }
}


function pauseGame(){
    if(!isPaused) {
        isPaused = true;
        console.log("Gioco in pausa");
    }  
    else {
        isPaused = false;
        console.log("Gioco non in pausa");
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


import { SphereGeometry } from "/static/js/game/module/three.module.js";


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
                    if (this.debounceTimer < 0.05) return;
                    this.debounceTimer = 0;
                    GameSocket.send(JSON.stringify({ action: "ball_update", ballId: this.ballId, position: this.mesh.position, velocity: this.mesh.velocity }));
                }
        }
        else if(isHost === false && isOnlineGame === true)
        {
            function getCoefficients(posit) {
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
        
            const coeffs = getCoefficients(posit);

            try {
                if(ballsUpdate[this.ballId] !== undefined && ballsUpdate[this.ballId] !== null && ballsUpdate[this.ballId].position !== undefined && ballsUpdate[this.ballId].velocity !== undefined)
                {
                    this.mesh.position.set(
                        ballsUpdate[this.ballId].position.x * coeffs.x,
                        ballsUpdate[this.ballId].position.y * coeffs.y,
                        ballsUpdate[this.ballId].position.z * coeffs.z
                    );
            
                    this.mesh.velocity.set(
                        ballsUpdate[this.ballId].velocity.x * coeffs.x,
                        ballsUpdate[this.ballId].velocity.y * coeffs.y,
                        ballsUpdate[this.ballId].velocity.z * coeffs.z
                    );
                }
            }
            catch (e) {
                console.log(e);
            }

            /*for (let ball in ballsUpdate) {
                if (ballsUpdate[ball].ballId == this.ballId) {
                    console.log("nel log di ball", ballsUpdate[ball]);
        
                    this.mesh.position.set(
                        ballsUpdate[ball].position.x * coeffs.x,
                        ballsUpdate[ball].position.y * coeffs.y,
                        ballsUpdate[ball].position.z * coeffs.z
                    );
        
                    this.mesh.velocity.set(
                        ballsUpdate[ball].velocity.x * coeffs.x,
                        ballsUpdate[ball].velocity.y * coeffs.y,
                        ballsUpdate[ball].velocity.z * coeffs.z
                    );
                }
            }*/
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
console.log("vediamo gametype ",gametype);

if(gametype == 'remote-game')
{
    window.handleKeyDownOnline = function(event) {
        if(isInKeyPlayer(event.code) && !keyboardState[event.code])
        {   
            keyboardState[event.code] = true;
            const key = getPlayerControl(event.code);
            GameSocket.send(JSON.stringify({ action: "move", game_id_game: game_id_game, username: username_game, key: key, state: "down" }));
            console.log("down ",event.code);
        }
    }
    window.addEventListener('keydown', window.handleKeyDownOnline);   

    window.handleKeyUpOnline = function(event) {
        if(isInKeyPlayer(event.code))
        {
            keyboardState[event.code] = false;
            const key = getPlayerControl(event.code);
            GameSocket.send(JSON.stringify({ action: "move", game_id_game: game_id_game, username: username_game, key: key, state: "up" }));
            console.log("up ",event.code);
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
            setBallPosition(data.position);
            setBallId(data.ballId);
            setBallIsReady(true);
        } else if (data.action === "ball_update") {
            updateBall(data.ballId, data.position, data.velocity);
        } else if (data.action === "ball_destroy") {
            setBallToRemove(data.ballId);
        } else if (data.action === "time_update") {
            const timerElement = document.getElementById('game-timer');
            const countdownElement = document.getElementById('countdown');
            const timer = data.time;
            countdownElement.innerText = timer;
        } else if (data.action === "game_over") {
            if (isHost === true) {
                endgameOnline();
            }
            gameover();
        } else if (data.action === "score_update") {
            console.log("score update", data);
            console.log("scoreP1", scoreP1 , data.p1);
            scoreP1.innerText = data.score.p1;
            scoreP2.innerText = data.score.p2;
            if (gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm") {
                scoreP3.innerText = data.p3;
                scoreP4.innerText = data.p4;
                scoreTeam1.innerText = data.team1;
                scoreTeam2.innerText = data.team2;
            }
        }
    }
} else {
    window.handleKeyDown = function(event) {
        if (!keyboardState[event.code]) {
            keyboardState[event.code] = true;
            console.log(`Tasto premuto: ${event.code}`);
        }
    }
    window.removeEventListener('keydown', window.handleKeyDown);
    window.addEventListener('keydown', window.handleKeyDown);
    
    window.handleKeyUp = function (event) {
        keyboardState[event.code] = false;
        console.log(`Tasto rilasciato: ${event.code}`);
    }
    window.removeEventListener('keyup', window.handleKeyUp);
    window.addEventListener('keyup', window.handleKeyUp);
}

function animateonline(){
    if(gameSettings.gameRules == "time" && flagTimer == true && isHost == true){ 
        flagTimer = false;
        setTimeout(() => {            
            startTimerOnline();
        } , 1000);        
    }
    const deltaTime = clock.getDelta();
    timer += deltaTime;
    timer2 += deltaTime;
    if (ball_is_ready) {
        launchBall(ballPosition, ballId);
        ball_is_ready = false;
    } else if (isHost && !ball_is_ready && timer >= interval && 0 < maxBalls) {
        setTimeout(() => {
            GameSocket.send(JSON.stringify({ action: "ball_launch", position: Math.floor(Math.random() * 4), ballId: "ball_" + ballCounter }));          
        }, 500);
        ballCounter++;
        timer = 0; // Reseta il timer
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
                //console.log("ball destroyed", toRemove);
            }else{
                if(isHost == true) {
                    //console.log("---------------");
                    BALLS[i].updateOnline(deltaTime, walls, isHost, true);
                } else {
                    //console.log("+++++++");
                    BALLS[i].updateOnline(deltaTime, walls, false, true);
                }
            } 
        }
    }
    
    if (isHost === true) {

        for (let i = 0; i < BALLS.length; i++) {
            if (BALLS[i]) {
               
                if (checkScoreHost(BALLS[i]) == 1) {
                    //console.log("ball destroyed", BALLS[i].ballId);
                    console.log("score dopo checkscore host", score);
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


function animate() {
    if (window.gameScene === undefined || window.gameScene === null) {
        return;
    }
    if(gameSettings.gameRules == "time" && flagTimer == true) {
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
    console.log('Inizio caricamento modelli...');
    Promise.all([
        model3D.loadModel1v1(window.gameScene, ufo),
        model3D.loadModel2v2(window.gameScene, ufo, gameSettings.gameMode)
        
    ]).then(() => {
        console.log('Tutti i modelli sono stati caricati teoricamente');
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
