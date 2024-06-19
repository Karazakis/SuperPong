import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Ball from './src/Ball.js';
import Paddle from './src/Paddle.js';
import Corner from './src/Corner.js';
import Ball2 from './src/Ball2.js';
import Bot from './src/Bot.js';
import Bot2 from './src/Bot2.js';
import { OBJLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import srcFont from 'three/examples/fonts/helvetiker_regular.typeface.json?url';
import { log } from 'three/examples/jsm/nodes/Nodes.js';
import { loadModel } from './src/Model3D.js';



const keyboardState = {};
// Aggiungi un gestore degli eventi per la pressione dei tasti
window.addEventListener('keydown', (event) => {
    // Salva lo stato del tasto premuto
    keyboardState[event.key] = true;
});

window.addEventListener('keyup', (event) => {
    // Rimuovi lo stato del tasto rilasciato
    keyboardState[event.key] = false;
});
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer(/*{ canvas: canvas}*/);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
//let bot1v1  = true;
// if(bot1v1 == true) {
    const bot = new Bot(scene, new THREE.Vector3(0, 20, 0), new THREE.Vector2(20, 20));
// }
const bot2 = new Bot2(scene, new THREE.Vector3(20, 0, 0), new THREE.Vector2(20, 20));
const bot3 = new Bot2(scene, new THREE.Vector3(-20, 0, 0), new THREE.Vector2(20, 20));

// let ufo1;
// let ufo2;
// let ufo3;
// let ufo4;

const loader = new GLTFLoader();
loader.load( '/asset/ufo/scene.gltf', function ( gltf ) {
	gltf.scene.position.set(0, -21, 1);
    gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
    gltf.scene.rotateX(Math.PI / 2);
    gltf.scene.rotateY(Math.PI);
    //gltf.scene.rotateZ(Math.PI);
    scene.add( gltf.scene );
    ufo1 = gltf.scene; // creo variabile per spostare modello
}, undefined, function ( error ) {
	console.error( error );
} );

let asteroidModel;
const loaderAsteroid = new OBJLoader();
const textureLoader = new THREE.TextureLoader();
loaderAsteroid.load( '/asset/Asteroid/10464_Asteroid_v1_Iterations-2.obj', function (obj) {
    const texture = textureLoader.load('/asset/Asteroid/10464_Asteroid_v1_diffuse.jpg', function () {
        // Aggiorna il materiale del modello con la texture
        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
            }
        });
    });
    obj.position.set(0, 0, -1.5);
    obj.scale.set(0.032, 0.03, 0);
    scene.add(obj);
    asteroidModel = obj;
}, undefined, function ( error ) {
	console.error( error );
} );
    
const boundaries = new THREE.Vector2(20, 20); // limiti gioco
const planeGeometry = new THREE.PlaneGeometry(boundaries.x * 2, boundaries.y * 2);//, boundaries.x * 2, boundaries.y * 2); // creazione griglia
const planeMaterial = new THREE.MeshNormalMaterial({transparent: true, opacity: 0});// { wireframe: true });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);

const paddle1 = new Paddle(scene, boundaries, 0, -20, 'a', 'd');
//const paddle2 = new Paddle(scene, boundaries, 0, 20, 'j', 'l');

const cornerBotLeft = new Corner(scene, -21, -21, 0, 5);
const cornerBotRight = new Corner(scene, 21, -21, 0, 5);
const cornerTopRight = new Corner(scene, 21, 21, 0, 5);
const cornerTotLeft = new Corner(scene, -21, 21, 0, 5);

camera.position.z = 50;
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
let interval = 1;
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
    setTimeout(() => {
        const ball = new Ball2(scene, x, y, 0, new THREE.Vector2(20, 20), direction, 1);
        BALLS.push(ball);
        
    }, 2000);
    console.log("palla lanciata");
    console.log("numero di palle: " + 	BALLS.length);
} 
let closestBall = 0;
// let player1Score = 10;
// let bot1Score = 10;
// let bot2Score = 10;
// let bot3Score = 10;
let score = [ 10, 10, 10, 10];
let isPaused = false;
let maxBalls = 2;
let walls = [false, false, false, false]; // per attivare i muri

function gameover(){
    if(score[0] == 0 && walls [0] == false){
        console.log("game over PLAYER1");
        scene.remove(ufo1);
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
    
    if(ball.mesh.position.y > 21){
        score[2]--;
        console.log("punteggio bot2: " + score[2]);
        scene.remove(ball.mesh);
        if(score[2] == 0)
            gameover();
        return(1);     
    }
    else if(ball.mesh.position.y < -21){
        score[0]--;
        console.log("punteggio player1: " + score[0]);
        scene.remove(ball.mesh);
        if(score[0] == 0)
            gameover();
        return(1);
    }
    else if(ball.mesh.position.x > 21){
        score[3]--;
        console.log("punteggio bot3: " + score[3]);
        scene.remove(ball.mesh);
        if(score[3] == 0)
            gameover();
        return(1);
    }
    else if(ball.mesh.position.x < -21){
        score[1]--;
        console.log("punteggio bot1: " + score[1]);
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
//----PARTICELLE
const particlesGeometry = new THREE.BufferGeometry();
const counts = 3000;
const positionsStars = new Float32Array(counts * 3);

for(let i = 0; i < counts * 3; i++) {
    positionsStars[i] = (Math.random() * 160) - 80;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positionsStars, 3));
const particlesMaterial = new THREE.PointsMaterial();

particlesMaterial.size = 0.2;
particlesMaterial.sizeAttenuation = true;

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
particles.position.set(0, 0, -80);
scene.add(particles);

const skyGeometry = new THREE.PlaneGeometry(boundaries.x * 2, boundaries.y * 2); // creazione griglia
const skyMaterial = new THREE.MeshNormalMaterial();
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
//scene.add(sky);
const count = skyGeometry.attributes.position.count;

//-------SCORE-------------
//let textMesh  = new THREE.Mesh();
//let textMesh = [];
let loadedFont;
let message = "Score: 10 - 10 - 10 - 10";
const textMaterial = new THREE.MeshNormalMaterial();

let textMesh;
const fontLoader = new FontLoader();
fontLoader.load(srcFont, function (font) {
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
let ufo = [];
loadModel(scene, ufo);

function animate() {    
    console.log("NUOVO CICLO");
    if (isPaused) {
        requestAnimationFrame(animate); // Se è in pausa, richiama se stesso per attendere la ripresa
        return;
    }
    const deltaTime = clock.getDelta();
    timer += deltaTime;
    if (timer >= interval && BALLS.length < maxBalls) {
        launchBall();
        timer = 0; // Reseta il timer
        // console.log("sto per lanciare la palla");
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
            BALLS[i].update(deltaTime, paddle1, walls);
            if(checkScore(BALLS[i])){
                BALLS.splice(i, 1);
                printScore(score);                
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
    
    //if(BOT == true){
    bot.update(deltaTime, BALLS, closestBall);
    bot2.update(deltaTime, BALLS, closestBall);
    bot3.update(deltaTime, BALLS, closestBall);
    //}
    if(ufo[0]) { // muovo ufo
        ufo[0].position.x = paddle1.mesh.position.x;
    }
    if (ufo[1]) {
        ufo[1].position.x = bot.mesh.position.x;
    }
    if (ufo[2]) {
        ufo[2].position.y = bot2.mesh.position.y;
    }
    if (ufo[3]) {
        ufo[3].position.y = bot3.mesh.position.y;
    }
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

