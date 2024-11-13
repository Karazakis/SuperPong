/* //import * as THREE from "/static/js/game/module/three.module.js";
import {Mesh} from "/static/js/game/module/three.module.js";
import {keyboardState} from "/static/js/game.js";
const module = await import(`/static/js/game.js?v=${Date.now()}`); // Import con un timestamp per la cache
const keyboardState = module.keyboardState;
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
let bot = true;


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
        this.mesh.position.set(0, -30, 0);
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;       
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

    // update(dt) {               
    //     if(keyboardState[this.mesh.right]) { // movimento pad
    //         if(this.mesh.position.x < this.boundaries.x - 7) 
    //             this.mesh.position.x += dt * this.mesh.speed;
    //     }
    //     if(keyboardState[this.mesh.left]) {
    //         if(this.mesh.position.x > -this.boundaries.x + 7)
    //             this.mesh.position.x -= dt * this.mesh.speed;
    //     } 
    //     for (let j = 0; j < this.mesh.attachedBalls.length; j++) {
    //         if (this.mesh.attachedBalls[j]) {
    //             this.mesh.attachedBalls[j].mesh.position.x = this.mesh.position.x + this.ballSlots[j].x;
    //             this.mesh.attachedBalls[j].mesh.position.y = this.mesh.position.y + this.ballSlots[j].y;
    //         }
    //     }
    // }

    collision(ball, paddle){
        return (ball.r + paddle.r >= paddle.mesh.position.distanceTo(ball.mesh.position));
    }

    shoot(balls) {
        //console.log("lo stato di m e' " + this.mesh.previousMState);
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
} */