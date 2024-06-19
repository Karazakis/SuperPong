
import * as THREE from "/static/js/game/module/three.min.js";
import {Mesh, MeshNormalMaterial, MeshBasicMaterial, SphereGeometry, CapsuleGeometry} from "/static/js/game/module/three.module.js";

let Bot = true;

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

const MATERIAL = new MeshNormalMaterial({ color: 0xff0000ff });
const TURBO_MATERIAL = new MeshBasicMaterial({ color: 0x00ff0000 })
let balls = [];

export class Ball{

    //speed = 10;
    //mesh.velocity = new THREE.Vector3(0.5, -1, 0);
    constructor(scene, x, y, z, boundaries, velocity, speed, r) {
        this.scene = scene;
        this.r = r; // raggio
        this.geometry = new SphereGeometry(this.r);
        this.material = new MeshNormalMaterial();
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.position.set(x, y, z);
        this.boundaries = new THREE.Vector2(boundaries.x, boundaries.y);
        this.mesh.previousMState = false;
        this.paddle1TurboCD = 0;
        this.mesh.hasBall = false;
        this.speed = speed;
        this.mesh.velocity = new THREE.Vector3(0, 0, 0);
        this.mesh.velocity = velocity;
        this.mesh.velocity.multiplyScalar(this.speed);
        
        //this.balls = balls;
        this.timer = 0;
        this.interval = 3;

        this.scene.add(this.mesh);
    }

    returnBalls() {
        return balls;
    }

    launchBall() {
        const ball = new Ball(this.scene, -5, -5, 0, new THREE.Vector2(20, 20), new THREE.Vector3(1, 2, 0), 5, 1);
        balls.push(ball);
        console.log("palla lanciata");
        console.log("numero di palle: " + 	balls.length);
    }    
    
    
    update(dt, paddle1, paddle2)
    {
        //this.timer += dt;
        // if (this.timer >= this.interval) {
        //     this.launchBall();
        //     this.timer = 0; // Reseta il timer
        //     console.log("sto per lanciare la palla");
        // }       
        
        const s = this.mesh.velocity.clone().multiplyScalar(dt);
        const tPos = this.mesh.position.clone().add(s);
        this.mesh.position.copy(tPos);
                
        this.paddle1X = paddle1.mesh.position.x;
        this.paddle1Y = paddle1.mesh.position.y;
        this.paddle2X = paddle2.mesh.position.x;
        this.paddle2Y = paddle2.mesh.position.y;

        this.paddle1TurboCD = paddle1.countdownTurbo;        
        //this.updateLaunch(dt);
        // if(Bot == true){ // script bot
        //     if (this.mesh.position.x > this.paddle2X) {
        //        paddle2.mesh.position.x = this.mesh.position.x; 
        //     } else if (this.mesh.position.x < this.paddle2X) {
        //        paddle2.mesh.position.x = this.mesh.position.x;
        //     }            
        // }
        //collisioni bordi
        if(this.mesh.position.x > this.boundaries.x)
        {
            this.mesh.position.x = this.boundaries.x;
            this.mesh.velocity.x *= -1;            
        }
        else if(this.mesh.position.x < -this.boundaries.x)
        {
            this.mesh.position.x = -this.boundaries.x;
            this.mesh.velocity.x *= -1;
        }
        if(this.mesh.position.y > this.boundaries.y)
        {
            this.mesh.position.y = this.boundaries.y;
            this.mesh.velocity.y *= -1;
        }
        else if(this.mesh.position.y < -this.boundaries.y)
        {
            this.mesh.position.y = -this.boundaries.y;
            this.mesh.velocity.y *= -1;
        }
        //collisioni paddle 1
        if(this.mesh.position.y <= this.paddle1Y + 0.5 &&
            this.mesh.position.y >= this.paddle1Y - 0.5 &&
            this.mesh.position.x + this.r>= this.paddle1X - 5 &&
            this.mesh.position.x + this.r<= this.paddle1X + 5)
        {   
            if(this.mesh.position.x + this.r >= this.paddle1X - 5 &&
                this.mesh.position.x + this.r <= this.paddle1X + 5)
            {
                this.mesh.velocity.y *= -1;
            }
            else if(this.mesh.position.y + this.r < this.paddle1Y + 0.5 && 
                this.mesh.position.y + this.r > this.paddle1Y - 0.5)
            {
                this.mesh.velocity.x *= -1;
            }
            
            if (keyboardState['m']) {
                // Il tasto 'm' è premuto
                if (!this.mesh.previousMState) {
                    this.mesh.position.x = this.paddle1X;
                    this.mesh.position.y = this.paddle1Y + 0.5;
                    this.mesh.hasBall = true;
                    // Il tasto 'm' era rilasciato nell'aggiornamento precedente, quindi ora lo stai tenendo premuto
                    this.mesh.velocity.set(0, 0, 0); // Imposta la velocità della palla a 0
                }
            }
            else {
                // Il tasto 'm' è rilasciato
                if (this.mesh.previousMState) {
                    // Il tasto 'm' era premuto nell'aggiornamento precedente, quindi ora lo hai rilasciato
                    this.mesh.velocity.set(5, 50, 0); // Imposta la velocità della palla per farla muovere verso l'alto, ad esempio
                    this.mesh.hasBall = false;
                }
            }            
            this.mesh.previousMState = keyboardState['m'];
        }
        if(this.mesh.hasBall == true){ // tiene la palla attaccata alla
            this.mesh.position.x = this.paddle1X;
            this.mesh.position.y = this.paddle1Y + 0.5;
        }       
        //collisioni paddle 2 ***DA FINIRE****
        if(this.mesh.position.y <= this.paddle2Y + 0.5 &&
            this.mesh.position.y >= this.paddle2Y - 0.5 &&
            this.mesh.position.x >= this.paddle2X - 5 &&
            this.mesh.position.x <= this.paddle2X + 5)
        {               
            this.mesh.velocity.y *= -1;          
        }        
    }
}