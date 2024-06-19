
import * as THREE from "/static/js/game/module/three.min.js";
import {Mesh, MeshNormalMaterial, MeshBasicMaterial, SphereGeometry, CapsuleGeometry, Vector2} from "/static/js/game/module/three.module.js";

const MATERIAL = new MeshNormalMaterial({ color: 0xff0000ff });
const RED_MATERIAL = new MeshBasicMaterial({ color: 0xffff0000 });

export class Bot2 {

    constructor(scene, position, boundaries) {

        this.scene = scene;
        this.geometry = new CapsuleGeometry(0.5, 5, 20, 20);
        this.material = new MeshNormalMaterial();
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.position.set(position.x, position.y, position.z);
        this.boundaries = new Vector2(boundaries.x, boundaries.y);
        this.mesh.speed = 20;
        this.mesh.balls = [];
        this.mesh.closestBall = null;

        this.mesh.countdownTurbo = 0;
        this.scene.add(this.mesh);
    }

    destroy() {
        this.scene.remove(this.mesh);
    }

    update(dt, balls, closestBall) {
        this.mesh.balls = balls;
        this.mesh.closestBall = closestBall;

        if (this.mesh.position.y > this.boundaries.y - 6.8) { // controllo sui bordi
            this.mesh.position.y = this.boundaries.y - 6.8;
        } else if (this.mesh.position.y < -this.boundaries.y + 6.8) {
            this.mesh.position.y = -this.boundaries.y + 6.8;
        }
        
        for(let i = 0; i < this.mesh.balls.length; i++){ 
            if(this.mesh.balls[i].mesh.position.x <= this.mesh.position.x + 0.5 &&
                this.mesh.balls[i].mesh.position.x >= this.mesh.position.x - 0.5 &&
                this.mesh.balls[i].mesh.position.y>= this.mesh.position.y - 5 &&
                this.mesh.balls[i].mesh.position.y<= this.mesh.position.y + 5)
            {   
                // console.log("collisione");
                if(this.mesh.balls[i].mesh.position.y >= this.mesh.position.y - 5 &&
                    this.mesh.balls[i].mesh.position.y <= this.mesh.position.y + 5 &&
                    this.mesh.balls[i].mesh.position.x >= this.mesh.position.x - 0.5 &&
                    this.mesh.balls[i].mesh.position.x <= this.mesh.position.x + 0.5)
                {
                    this.mesh.balls[i].mesh.velocity.x *= -1;
                }
                // else if(this.mesh.balls[i].mesh.position.y < this.mesh.position.y + 0.5 && 
                //     this.mesh.balls[i].mesh.position.y > this.mesh.position.y - 0.5)
                // {
                //     this.mesh.balls[i].mesh.velocity.x *= -1;
                // }
            }    
        }    
                
        //console.log("this.balls len " + this.mesh.balls.length);
        if(this.mesh.balls.length == 0) {
            return;
        }
        // for(let i = 0; i < this.mesh.balls.length; i++) {
        //     this.mesh.balls[i].mesh.material = MATERIAL;
        // }
        let newClosestBall = closestBall; // controllo la palla piú vicina
        let oldClosestBall;
        for (let i = 0; i < balls.length; i++) { 
            if(this.mesh.balls[i] && balls.length > 1) { // esistono almeno 2 palle
                if (this.mesh.position.distanceTo(balls[i].mesh.position) < this.mesh.position.distanceTo(balls[this.mesh.closestBall].mesh.position)) {
                    oldClosestBall = newClosestBall;
                    newClosestBall = i;
                    balls[this.mesh.closestBall].mesh.material = MATERIAL;
                    this.mesh.closestBall = i;
                }
            }            
        }

        if(balls[newClosestBall] != null) { // seguo la palla più vicina
            if(balls[newClosestBall].mesh.position.y > this.mesh.position.y) {
                this.mesh.position.y += dt * this.mesh.speed;
                balls[newClosestBall].mesh.material = RED_MATERIAL;                
            }
            else if(balls[newClosestBall].mesh.position.y < this.mesh.position.y) {
                this.mesh.position.y -= dt * this.mesh.speed;
               balls[newClosestBall].mesh.material = RED_MATERIAL;
            }
            if(balls[oldClosestBall] != null)
                balls[oldClosestBall].mesh.material = MATERIAL;
        }
        closestBall = newClosestBall;
        newClosestBall = null;
        //console.log("NewclosestBall: " + newClosestBall);
    }
}