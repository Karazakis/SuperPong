// import * as THREE from "/static/js/game/modules/three.min.js";
import * as THREE from "/static/js/game/module/three.module.js";
import { OrbitControls } from "/static/js/game/module/OrbitControls.js";
import { GLTFLoader } from "/static/js/game/module/GLTFLoader.js";
import { OBJLoader } from "/static/js/game/module/OBJLoader.js";
import { TextGeometry } from "/static/js/game/module/TextGeometry.js";
import { FontLoader } from "/static/js/game/module/FontLoader.js";
//import srcFont from "/static/js/game/module/helvetiker_regular.typeface.json?url";

import { Bot } from "/static/js/game/src/Bot.js";
import { Bot2 } from "/static/js/game/src/Bot2.js";
import { Paddle } from "/static/js/game/src/Paddle.js";
import { Corner } from "/static/js/game/src/Corner.js";
import { Ball2 } from "/static/js/game/src/Ball2.js";
import {init} from "/static/js/game/src/Init.js";

console.log("game.js loaded");
const gameSettings = init();
console.log(gameSettings);
let bot = null;
let bot2 = null;
let bot3 = null;
let walls = [false, false, false, false]; // per attivare i muri
const boundaries = new THREE.Vector2(20, 20); // limiti gioco

const keyboardState = {};
window.addEventListener('keydown', (event) => {
    keyboardState[event.code] = true;
});

window.addEventListener('keyup', (event) => {
    keyboardState[event.code] = false;
});
console.log("game type : " + gameSettings.gameType);
if(gameSettings.gameType == "single-game"){
    console.log("la gamemode : " + gameSettings.gameMode);
    bot = new Bot(scene, new THREE.Vector3(0, 20, 0), new THREE.Vector2(20, 20));
    walls = [false, true, false, true]; // attiva i muri laterali
    if(gameSettings.gameMode == "2v2" || gameSettings.gameMode == "4dm"){
        console.log ("2v2 o DM loaded");
        bot2 = new Bot2(scene, new THREE.Vector3(20, 0, 0), new THREE.Vector2(20, 20));
        bot3 = new Bot2(scene, new THREE.Vector3(-20, 0, 0), new THREE.Vector2(20, 20));
    }
}

// const planeGeometry = new THREE.PlaneGeometry(boundaries.x * 2, boundaries.y * 2);//, boundaries.x * 2, boundaries.y * 2); // creazione griglia
// const planeMaterial = new THREE.MeshNormalMaterial({ color: 0xff0000ff , transparent: true, opacity: 0});// { wireframe: true });
// const plane = new THREE.Mesh(planeGeometry, planeMaterial);
// scene.add(plane);

let p1Elem, p1Left, p1Right, p1Shoot, p1Turbo;

if(p1Elem = document.getElementById("player0")){
    p1Left = p1Elem.getAttribute("data-left");
    p1Right = p1Elem.getAttribute("data-right");
    p1Shoot = p1Elem.getAttribute("data-shoot");
    p1Turbo = p1Elem.getAttribute("data-boost");
}
console.log("tasto left : " + p1Left);
console.log("tasto turbo : " + p1Turbo);
const paddle1 = new Paddle(scene, boundaries, 0, -20, p1Left, p1Right, p1Shoot, p1Turbo);

//const paddle2 = new Paddle(scene, boundaries, 0, 20, 'j', 'l');

const cornerBotLeft = new Corner(scene, -21, -21, 0, 5);
const cornerBotRight = new Corner(scene, 21, -21, 0, 5);
const cornerTopRight = new Corner(scene, 21, 21, 0, 5);
const cornerTotLeft = new Corner(scene, -21, 21, 0, 5);

camera.position.z = 100;
const controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
directionalLight.position.set(20, -20, 20);
scene.add(directionalLight);

// const helperLight = new THREE.DirectionalLightHelper(directionalLight, 5);
// scene.add(helperLight);

const clock = new THREE.Clock();

function cornerCollision(ball2, ball3){
    if(ball2.r + ball3.r >= ball3.mesh.position.distanceTo(ball2.mesh.position)) {
        return true;
    }
    else {
        return false;
    }
}

// function penetrationDepthCorner(ball2, ball3){
//     let dist = ball2.mesh.position.clone().sub(ball3.mesh.position);
//     let pen_d = ball2.r + ball3.r - dist.manhattanLength();
//     let pen_res = dist.clone().normalize().multiplyScalar(pen_d);
//     ball2.mesh.position.add(pen_res);
//     ball3.mesh.position.add(pen_res.multiplyScalar(0));
// }

function penetrationDepthCorner2(ball, corner){
    let dist = ball.mesh.position.clone().sub(corner.mesh.position);
    let penetrationDepth = ball.r + corner.r - dist.length();
    
    if (penetrationDepth > 0) {
        let correction = dist.normalize().multiplyScalar(penetrationDepth);
        ball.mesh.position.add(correction);
        corner.mesh.position.add(correction.multiplyScalar(0));
    }
}

function collisionResponseCorner(ball2, corner) {
    let normal = ball2.mesh.position.clone().sub(corner.mesh.position).normalize();
    let relVel = ball2.mesh.velocity.clone();//.sub(corner.mesh.velocity);
    let sepVel = relVel.dot(normal);
    let new_sepVel = -sepVel * 1.2;
    let sepVelVec = normal.multiplyScalar(new_sepVel);
    
    ball2.mesh.velocity.copy(sepVelVec);
}

//       ******    BALL    ******
function ballCollision(ball2, ball3){
    if(ball2.r + ball3.r >= ball3.mesh.position.distanceTo(ball2.mesh.position)) {
        return true;
    }
    else {
        return false;
    }
}

function penetrationDepth(ball2, ball3){
    let dist = ball2.mesh.position.clone().sub(ball3.mesh.position);
    let pen_d = ball2.r + ball3.r - dist.manhattanLength();
    let pen_res = dist.clone().normalize().multiplyScalar(pen_d);
    ball2.mesh.position.add(pen_res);
    ball3.mesh.position.add(pen_res.multiplyScalar(-1));
}

function collisionResponse(ball2, ball3) {
    let normal = ball2.mesh.position.clone().sub(ball3.mesh.position).normalize();
    let relVel = ball2.mesh.velocity.clone().sub(ball3.mesh.velocity);
    let sepVel = relVel.dot(normal);
    let new_sepVel = -sepVel;
    let sepVelVec = normal.multiplyScalar(new_sepVel);

    ball2.mesh.velocity.add(sepVelVec);
    ball3.mesh.velocity.add(sepVelVec.multiplyScalar(-1));
}

let BALLS = [];
let corners = [cornerBotLeft, cornerBotRight, cornerTopRight, cornerTotLeft];
let interval = 3;
let timer = 0;

function arrow (position, angle) {
    const geometry = new THREE.ConeGeometry(0.5, 5, 20, 20);
    const material = new THREE.MeshNormalMaterial();
    const arrow = new THREE.Mesh(geometry, material);
    arrow.position.set(position.x, position.y, position.z);
    arrow.rotateZ(Math.PI / angle);
    scene.add(arrow);
    setTimeout(() => {
        scene.remove(arrow);
    } , 2000);
}
const maxBalls = 2; //gameSettings.gameBalls;
console.log("le maxballs sono : " + maxBalls);
function launchBall() {
    let direction;
    let n = Math.floor(Math.random() * 2);
    let n2 = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
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
    if (BALLS.length <= maxBalls) {
        setTimeout(() => {
            const ball = new Ball2(scene, x, y, 0, new THREE.Vector2(20, 20), direction, 1);
            BALLS.push(ball);            
        }, 2000);
    }
    //console.log("palla lanciata");
    //console.log("numero di palle: " + 	BALLS.length);
} 
let closestBall = 0;
// let player1Score = 10;
// let bot1Score = 10;
// let bot2Score = 10;
// let bot3Score = 10;
let score = [ 10, 10, 10, 10];
let scoreTeam = [20, 20]
let isPaused = false;
	


function gameover(){
    if(score[0] == 0 && walls [0] == false){
        console.log("game over PLAYER1");
        // scene.remove(ufo1); rimuove modello 3d
        paddle1.destroy();
        walls[0] = true;
    }
    else if(score[1] == 0 && walls [1] == false){
        console.log("game over BOT1");
        bot3.destroy();
        walls[1] = true;
    }
    else if(score[2] == 0 && walls [2] == false){
        console.log("game over BOT2");
        bot.destroy();
        walls[2] = true;
    }
    else if(score[3] == 0   && walls [3] == false){
        console.log("game over BOT3");
        bot2.destroy();
        walls[3] = true;
    }
}

function checkScore(ball){
    let scoreP1 = document.getElementById("player0score");
    let scoreP2 = document.getElementById("player1score");
    let scoreP3 = document.getElementById("player2score");
    let scoreP4 = document.getElementById("player3score");

    let scoreTeam1 = document.getElementById("team1score");
    let scoreTeam2 = document.getElementById("team2score");
    if (scoreP1 === null && scoreP2 === null && scoreP3 === null && scoreP4 === null) // se é a team
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
        score[2]--;
        scoreTeam[0]--;
        if (scoreP2 !== null)
        {
            scoreP2.innerHTML = score[2];
        }
        else
        {
            scoreTeam1.innerHTML = scoreTeam[0];
        }
        //console.log("punteggio bot2: " + score[2]);
        scene.remove(ball.mesh);
        if(score[2] == 0)
            gameover();
        return(1);     
    }
    else if(ball.mesh.position.y < -21){
        score[0]--;
        scoreTeam[0]--;
        if (scoreP1 !== null)
        {
            scoreP1.innerHTML = score[0];
        }
        else
        {
            scoreTeam1.innerHTML = scoreTeam[0];
        }
        //console.log("punteggio player1: " + score[0]);
        scene.remove(ball.mesh);
        if(score[0] == 0)
            gameover();
        return(1);
    }
    else if(ball.mesh.position.x > 21 && ((scoreP3 && scoreP4) || scoreTeam2)){
        score[3]--;
        scoreTeam[1]--;
        if (scoreP3 !== null)
        {
            scoreP3.innerHTML = score[3];
        }
        else if(scoreTeam2 !== null)
        {
            scoreTeam2.innerHTML = scoreTeam[1];
        }
        //console.log("punteggio bot3: " + score[3]);
        scene.remove(ball.mesh);
        if(score[3] == 0)
            gameover();
        return(1);
    }
    else if(ball.mesh.position.x < -21 && ((scoreP3 && scoreP4) || scoreTeam2)){
        score[1]--;
        scoreTeam[1]--;
        if (scoreP4 !== null)
        {
            scoreP4.innerHTML = score[1];
        }
        else
        {
            scoreTeam2.innerHTML = scoreTeam[1];
        }
        scene.remove(ball.mesh);
        if(score[1] == 0)
            gameover();
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
    if (event.key === 'v') {
        pauseGame();
    }
});

const skyGeometry = new THREE.PlaneGeometry(boundaries.x * 2, boundaries.y * 2); // creazione griglia
const skyMaterial = new THREE.MeshNormalMaterial();
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
//scene.add(sky);
const count = skyGeometry.attributes.position.count;

//-------SCORE-------------
let loadedFont;
let message = "Score: 10 - 10 - 10 - 10";
const textMaterial = new THREE.MeshNormalMaterial();

let textMesh;
const fontLoader = new FontLoader();
fontLoader.parse("./game/module/helvetiker_regular.typeface.json", function (font) {
    const geometry = new TextGeometry(message, {
        font: font,
        loadedFont: font,
        size: 5,
        height: 0.5,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5
    })
    //let textMesh = new THREE.Mesh(geometry, textMaterial);
    // textMesh.position.set(0, 0, 0);
    //scene.add(textMesh);
    textMesh = new THREE.Mesh(geometry, textMaterial);
    textMesh.position.set(-30, 40, 0);
    textMesh.rotateX(70 * Math.PI / 180);
    scene.add(textMesh);
    console.log("punteggio START GAME " + score[0] + " - " + score[1] + " - " + score[2] + " - " + score[3]);
})

function printScore(score){
    console.log("punteggio aggiornato START");
    if(textMesh)
        scene.remove(textMesh);
    const message = "Score: " + score[0] + " - " + score[1] + " - " + score[2] + " - " + score[3]; 
    const fontLoader = new FontLoader();
    fontLoader.load(srcFont, function (loadedFont) {
        const geometry = new TextGeometry(message, {
            font: loadedFont,
            size: 5,
            height: 0.5,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelOffset: 0,
            bevelSegments: 5,
    })
    if (textMesh) {
        textMesh.geometry.dispose(); // Disposing old geometry
        textMesh.material.dispose(); // Disposing old material
    }

    textMesh.geometry = geometry; // Update geometry
    textMesh.material = textMaterial; // Update material
    textMesh.geometry.getAttribute('position').needsUpdate = true;
    scene.add(textMesh);

    // textMesh = new THREE.Mesh(geometry, textMaterial);
    // textMesh.position.set(0, 0, 0);
    // scene.add(textMesh);
    // message = "Score: " + score[0] + " - " + score[1] + " - " + score[2] + " - " + score[3];
        
    // textMesh.geometry = new TextGeometry(message, {
    //     font: loadedFont,
    //     size: 5,
    //     height: 0.5,
    //     curveSegments: 12,
    //     bevelEnabled: true,
    //     bevelThickness: 0.03,
    //     bevelSize: 0.02,
    //     bevelOffset: 0,
    //     bevelSegments: 5
    // })
    // //textMesh.position.set(0, 10, 0);
    //textMesh.geometry.getAttribute('position').needsUpdate = true;
    // textMesh = new THREE.Mesh(textMesh.geometry, textMaterial);
    // scene.add(textMesh);
    console.log("punteggio aggiornato " + score[0] + " - " + score[1] + " - " + score[2] + " - " + score[3]);
    })
}
//let ufo = [];
//loadModel(scene, ufo);

function animate() {    
    //console.log("NUOVO CICLO");
    if (isPaused) {
        requestAnimationFrame(animate); // Se è in pausa, richiama se stesso per attendere la ripresa
        return;
    }
    const deltaTime = clock.getDelta();
    timer += deltaTime;
    if (timer >= interval && BALLS.length < maxBalls) {
        launchBall();
        timer = 0; // Reseta il timer
    }
    const time = clock.getElapsedTime();
    const elapsedTime = clock.getElapsedTime();
    particles.position.y = -elapsedTime * 0.2;
    particles.position.x = -elapsedTime * 0.1;
    // for (let i = 0; i < count; i++) { -----------------tieni commentato
    //     const x = skyGeometry.attributes.position.getX(i);
    //     const y = skyGeometry.attributes.position.getY(i);
    //     skyGeometry.attributes.position.setZ(i, -y * time);// * 0.3);
    //     skyGeometry.computeVertexNormals();
    //     skyGeometry.attributes.position.needsUpdate = true;
    // }
    
    //paddle2.update(deltaTime);
    if(walls[0] == false)
        paddle1.update(deltaTime);
    for(let i = 0; i < BALLS.length; i++){
        if(BALLS[i]){
            BALLS[i].update(deltaTime, paddle1, walls, gameSettings);
            if(checkScore(BALLS[i])){
                BALLS.splice(i, 1);
                //printScore(score); da sistemare                
            }
        }
    }    
    paddle1.turbo();
    

    for(let i = 0; i < BALLS.length; i++){ // collisione balls
        for(let j = 0; j < BALLS.length; j++){
            //if (!BALLS[j]) continue;
            if(ballCollision(BALLS[i], BALLS[j])){
                //console.log("collisione P");
                penetrationDepth(BALLS[i], BALLS[j]);
                collisionResponse(BALLS[i], BALLS[j]);
            }
        }
    }

    for(let i = 0; i < corners.length; i++){ // collisione corner
        for(let j = 0; j < BALLS.length; j++){
            //if (!BALLS[j]) continue;
            if(cornerCollision(BALLS[j], corners[i])){
                //console.log("collisione C");
                penetrationDepthCorner2(BALLS[j], corners[i]);
                collisionResponseCorner(BALLS[j], corners[i]);
            }
        }
    }
    //console.log("numero di BALLS: " + 	BALLS.length);
    
    
    if(bot){
        bot.update(deltaTime, BALLS, closestBall);
    }
    if(bot2){
        bot2.update(deltaTime, BALLS, closestBall);
    }
    if(bot3){
        bot3.update(deltaTime, BALLS, closestBall);
    }
    
    //}
    // if(ufo[0]) { // muovo ufo
    //     ufo[0].position.x = paddle1.mesh.position.x;
    // }
    // if (ufo[1]) {
    //     ufo[1].position.x = bot.mesh.position.x;
    // }
    // if (ufo[2]) {
    //     ufo[2].position.y = bot2.mesh.position.y;
    // }
    // if (ufo[3]) {
    //     ufo[3].position.y = bot3.mesh.position.y;
    // }
    if(keyboardState['b']) {
        for (let i = 0; i < BALLS.length; i++) {
            scene.remove(BALLS[i].mesh);
        }
        BALLS = [];
    }    
   
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

