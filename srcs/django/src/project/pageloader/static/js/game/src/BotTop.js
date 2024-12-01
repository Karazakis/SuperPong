//import * as THREE from "/static/js/game/module/three.module.js";
import {Mesh} from "/static/js/game/module/three.module.js";

const keyboardState = {}; // per test
window.addEventListener('keydown', (event) => {
    keyboardState[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keyboardState[event.code] = false;
});

let count = 0;
const GEOMETRY = new THREE.SphereGeometry(3, 5, 20, 20);
GEOMETRY.rotateZ(Math.PI / 2);

const MATERIAL = new THREE.MeshNormalMaterial({transparent: true, opacity: 0.0}); // , transparent: true, opacity: 0.3});
const RED_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xffff0000 });

export class BotTop { 

    constructor(scene, spawn, boundaries, left, right) {
        this.scene = scene;
        this.geometry = GEOMETRY;
        this.material = MATERIAL;
        this.turboMaterial = RED_MATERIAL;
        this.mesh = new Mesh(GEOMETRY, MATERIAL);
        this.mesh.spawn = new THREE.Vector2(spawn.x, spawn.y);
        this.boundaries = new THREE.Vector2(boundaries.x, boundaries.y);
        this.mesh.position.set(this.mesh.spawn.x, this.mesh.spawn.y);
        
        this.mesh.speed = 20;
        this.mesh.right = right;
        this.mesh.left = left;
        this.r = 3;
        this.mesh.hasBall = [false, false, false];
        this.mesh.previousMState = false;
        this.ballSlots = [
            new THREE.Vector2(-3, 2.5),
            new THREE.Vector2(0, 3.5),
            new THREE.Vector2(3, 2.5),
        ];
        this.mesh.attachedBalls = [null, null, null];
        this.destinationX = this.mesh.position.x;
        this.mesh.countdownTurbo = 0;
        this.turboCD = 2000;
        this.turboDuration = 250;
        this.turboSpeed = 45;
        this.scene.add(this.mesh);
        //console.log("bottop creato");
    }

    destroy(){
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;      
    }

    // update1(dt, balls, closestBall) {
    //     //console.log("bottop aggiornato");       
    //     this.mesh.balls = balls;
    //     this.mesh.closestBall = closestBall;
                
    //     // if(this.mesh.position.x < this.boundaries.x - 6.8) { // controllo sui bordi
    //     //     this.mesh.position.x = this.boundaries.x - 6.8;
    //     // }
    //     // else if(this.mesh.position.x > -this.boundaries.x + 6.8) {
    //     //     this.mesh.position.x = -this.boundaries.x + 6.8;
    //     // }   
        
    //     // for (let j = 0; j < this.mesh.attachedBalls.length; j++) { // attacca le palline durante lo shoot
    //     //     if (this.mesh.attachedBalls[j]) {
    //     //         this.mesh.attachedBalls[j].mesh.position.x = this.mesh.position.x + this.ballSlots[j].x;
    //     //         this.mesh.attachedBalls[j].mesh.position.y = this.mesh.position.y + this.ballSlots[j].y;
    //     //     }
    //     // }

    //     if(this.mesh.balls.length == 0) {
    //         return;
    //     }
    //     const deltaX = this.destinationX - this.mesh.position.x;
    //     const moveStep = this.mesh.speed * dt;

    //     if (Math.abs(deltaX) > moveStep) {
    //         this.mesh.position.x += Math.sign(deltaX) * moveStep;
    //     } else {
    //         this.mesh.position.x = this.destinationX;
    //     }
    //     this.turbo();
    // }

    // AI1(balls, closestBall) {
    //     count++;
    //     //console.log("AI lanciata" + count);
    //     let newClosestBall = closestBall; // controllo la palla piú vicina
    //     let oldClosestBall;
    //     for (let i = 0; i < balls.length; i++) { 
    //         if(this.mesh.balls[i] && balls.length > 1) { // esistono almeno 2 palle
    //             if(balls[i] != null && balls[this.mesh.closestBall] != null ) { // non sono una palla vuota
    //             if (this.mesh.position.distanceTo(balls[i].mesh.position) < this.mesh.position.distanceTo(balls[this.mesh.closestBall].mesh.position)) {
    //                 oldClosestBall = newClosestBall;
    //                 newClosestBall = i;
    //                 //balls[this.mesh.closestBall].mesh.material = MATERIAL;
    //                 this.mesh.closestBall = i;
    //             }
    //             }
    //         }            
    //     }
    //     if (balls[newClosestBall] != null) {
    //         // Calcolo della destinazione come il punto di intersezione della pallina col paddle
    //         const ball = balls[newClosestBall];
    //         const paddleY = this.mesh.position.y; // La y del paddle (presumibilmente costante)
    //         const ballPosition = ball.mesh.position;
    //         const ballVelocity = ball.mesh.velocity;

    //         // Calcolo del tempo di arrivo alla posizione y del paddle
    //         const timeToIntersect = (paddleY - ballPosition.y) / ballVelocity.y;

    //         // Calcolo della posizione x dell'intersezione
    //         const intersectX = ballPosition.x + ballVelocity.x * timeToIntersect;

    //         // Imposta la destinazione come l'intersezione calcolata
    //         if(intersectX < this.boundaries.x - 7 && intersectX > -this.boundaries.x + 7) {
    //             this.destinationX = intersectX;
    //             console.log("ho la destinazione e vado");
    //         }
    //         else {
    //             console.log("mi accentro perché non ho la dest");
    //             this.destinationX = 0;
    //         }

    //         // balls[newClosestBall].mesh.material = RED_MATERIAL;
    //         // if (balls[oldClosestBall] != null)
    //         //     balls[oldClosestBall].mesh.material = MATERIAL;
    //     }
    //     closestBall = newClosestBall;
    //     newClosestBall = null;
    // }

    update(dt, balls, closestBall) {        
        this.mesh.balls = balls;
        this.mesh.closestBall = closestBall;
                
        if(this.mesh.position.x > this.boundaries.x - 6.8) { // controllo sui bordi
            this.mesh.position.x = this.boundaries.x - 6.8;
        }
        else if(this.mesh.position.x < -this.boundaries.x + 6.8) {
            this.mesh.position.x = -this.boundaries.x + 6.8;
        }   
        if(this.mesh.balls.length == 0) {
            return;
        }
        if(this.destinationX == null) {
            this.destinationX = 10;
        }

        const deltaX = this.destinationX - this.mesh.position.x;
        const moveStep = this.mesh.speed * dt;

        if (Math.abs(deltaX) > moveStep) {
            this.mesh.position.x += Math.sign(deltaX) * moveStep;
        } else {
            this.mesh.position.x = this.destinationX;
        }        
    }

    AI(balls, closestBall, gameBoosts) {
        count++;
        console.log("AI lanciata" + count);
        let newClosestBall = closestBall; // controllo la palla piú vicina
        let oldClosestBall;
        for (let i = 0; i < balls.length; i++) { 
            if(this.mesh.balls[i] && balls.length > 1) { // esistono almeno 2 palle
                if(balls[i] != null && balls[this.mesh.closestBall] != null ) { // non sono una palla vuota
                    if (this.mesh.position.distanceTo(balls[i].mesh.position) < this.mesh.position.distanceTo(balls[this.mesh.closestBall].mesh.position)) {
                        oldClosestBall = newClosestBall;
                        newClosestBall = i;
                        //balls[this.mesh.closestBall].mesh.material = MATERIAL;
                        this.mesh.closestBall = i;
                    }
                }
            }            
        }
        if (balls[newClosestBall] != null) {
            // Calcolo della destinazione come il punto di intersezione della pallina col paddle
            const ball = balls[newClosestBall];
            const paddleY = this.mesh.position.y; // La y del paddle (presumibilmente costante)
            const ballPosition = ball.mesh.position;
            const ballVelocity = ball.mesh.velocity;
            // Calcolo del tempo di arrivo alla posizione y del paddle
            const timeToIntersect = (paddleY - ballPosition.y) / ballVelocity.y;
            // Calcolo della posizione x dell'intersezione
            const intersectX = ballPosition.x + ballVelocity.x * timeToIntersect;
            // Imposta la destinazione come l'intersezione calcolata
            this.destinationX = intersectX;
            if(this.destinationX == null) {
                this.destinationX = 0;
            }
            if(timeToIntersect == Infinity) {
                this.destinationX = 0;
            }            
        }
        closestBall = newClosestBall;
        newClosestBall = null;
        if(gameBoosts == "true")
            this.turbo();
    }
    collision(ball, paddle){
        return (ball.r + paddle.r >= paddle.mesh.position.distanceTo(ball.mesh.position));
    }

    shoot(balls) {
        balls.forEach((ball, i) => {
            if (!ball.mesh.id) {
                ball.mesh.id = THREE.MathUtils.generateUUID();
            }
        });

        for (let i = 0; i < balls.length; i++) {
            if (this.collision(balls[i], this)) {
                if (keyboardState['m']) { // Il tasto 'm' è premuto
                    console.log("hasBall = " + this.mesh.hasBall, "stato m = " + this.mesh.previousMState);
                    if (!this.mesh.previousMState && balls[i].mesh.isAttached == false ) {
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
                            balls[i].mesh.position.x = this.mesh.position.x + this.ballSlots[closestSlot].x;
                            balls[i].mesh.position.y = this.mesh.position.y + this.ballSlots[closestSlot].y;
                            this.mesh.hasBall[closestSlot] = true;
                            this.mesh.attachedBalls[closestSlot] = balls[i];
                            balls[i].mesh.isAttached = true;
                            console.log(`Attacco la palla ${balls[i].mesh.id} allo slot ${closestSlot}`);
                            balls[i].mesh.velocity.set(0, 0, 0);
                        }
                    }
                    else if (this.mesh.previousMState && balls[i].mesh.isAttached == false ) {
                        //console.log("attacco un altra pallina " + balls[i].mesh.id);
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
                } else {
                    if (this.mesh.previousMState) {
                        console.log("il tasto 'm' è rilasciato e le balls sono: " + this.mesh.hasBall.length);
                        for (let j = 0; j < this.mesh.attachedBalls.length; j++) {
                            if (this.mesh.attachedBalls[j] != null) {
                                if(this.mesh.hasBall[0] == true) {
                                    this.mesh.attachedBalls[j].mesh.velocity.set(-25, 50, 0);
                                }
                                else if (this.mesh.hasBall[1] == true) {
                                    this.mesh.attachedBalls[j].mesh.velocity.set(0, 50, 0);
                                }
                                else if (this.mesh.hasBall[2] == true) {
                                    this.mesh.attachedBalls[j].mesh.velocity.set(25, 50, 0);
                                }
                                this.mesh.hasBall[j] = false;
                                console.log(`Rilasciata la palla ${this.mesh.attachedBalls[j].mesh.id} dallo slot ${j}`);
                                this.mesh.attachedBalls[j] = null;
                                balls[i].mesh.isAttached = false;
                            }
                        }
                    }
                }
                this.mesh.previousMState = keyboardState['m'];
            }
        }
    }
    turbo(){
        const thresholdDistance = 10; // Soglia di distanza per attivare il turbo
        const distanceToIntersection = Math.abs(this.destinationX - this.mesh.position.x);
        if (distanceToIntersection > thresholdDistance && this.mesh.countdownTurbo == 0) {
            console.log("turbo BOT");
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