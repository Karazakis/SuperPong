import {Mesh} from "/static/js/game/module/three.module.js";

const keyboardState = {};
window.addEventListener('keydown', (event) => {
    keyboardState[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keyboardState[event.code] = false;
});

let count = 0;
const GEOMETRY = new THREE.SphereGeometry(3, 5, 20, 20);
GEOMETRY.rotateZ(Math.PI / 2);

const MATERIAL = new THREE.MeshNormalMaterial({transparent: true, opacity: 0.3});
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
    }

    destroy(){
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;      
    }

    

    update(dt, balls, closestBall) {        
        this.mesh.balls = balls;
        this.mesh.closestBall = closestBall;
                
        if(this.mesh.position.x > this.boundaries.x - 6.8) {
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
        let newClosestBall = closestBall;
        let oldClosestBall;
        for (let i = 0; i < balls.length; i++) { 
            if(this.mesh.balls[i] && balls.length > 1) {
                if(balls[i] != null && balls[this.mesh.closestBall] != null ) {
                    if (this.mesh.position.distanceTo(balls[i].mesh.position) < this.mesh.position.distanceTo(balls[this.mesh.closestBall].mesh.position)) {
                        oldClosestBall = newClosestBall;
                        newClosestBall = i;
                        this.mesh.closestBall = i;
                    }
                }
            }            
        }
        if (balls[newClosestBall] != null) {
            const ball = balls[newClosestBall];
            const paddleY = this.mesh.position.y;
            const ballPosition = ball.mesh.position;
            const ballVelocity = ball.mesh.velocity;
            const timeToIntersect = (paddleY - ballPosition.y) / ballVelocity.y;
            const intersectX = ballPosition.x + ballVelocity.x * timeToIntersect;
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
    
    turbo(){
        const thresholdDistance = 10;
        const distanceToIntersection = Math.abs(this.destinationX - this.mesh.position.x);
        if (distanceToIntersection > thresholdDistance && this.mesh.countdownTurbo == 0) {
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