import { Vector3 } from "/static/js/game/module/three.module.js";
import { Mesh, MeshNormalMaterial, SphereGeometry } from "/static/js/game/module/three.module.js";

let bot = true;
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
export class Ball2 {
    
    constructor(scene, x, y, z, boundaries, velocity, r) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.z = z;
        this.boundaries = boundaries;
        this.r = r;
        this.speed = 10;
        this.mesh = new Mesh(
            new SphereGeometry(this.r),
            new MeshNormalMaterial());
            this.mesh.position.set(this.x, this.y, this.z);
        this.mesh.velocity = velocity;
        this.mesh.velocity.multiplyScalar(this.speed);
        this.scene.add(this.mesh);
    }

    destroy(){
        this.scene.remove(this.mesh);        
    }
     
    update(dt, paddle1, walls, gameSettings) {
               
        const s = this.mesh.velocity.clone().multiplyScalar(dt);
        const tPos = this.mesh.position.clone().add(s);
        this.mesh.position.copy(tPos);
        
        
        this.paddle1X = paddle1.mesh.position.x;
        this.paddle1Y = paddle1.mesh.position.y;
        // this.paddle2X = paddle2.mesh.position.x;
        // this.paddle2Y = paddle2.mesh.position.y;

        this.paddle1TurboCD = paddle1.countdownTurbo; 
        // if(bot == true){ // script bot
        //     if (this.mesh.position.x > this.paddle2X) {
        //        paddle2.mesh.position.x = this.mesh.position.x; 
        //     } else if (this.mesh.position.x < this.paddle2X) {
        //        paddle2.mesh.position.x = this.mesh.position.x;
        //     }            
        // }
        // controllo muri
        // if(this.mesh.position.x > this.boundaries.x)
        // {
        //     this.mesh.position.x = this.boundaries.x;
        //     this.mesh.velocity.x *= -1;            
        // }
        // else if(this.mesh.position.x < -this.boundaries.x)
        // {
        //     this.mesh.position.x = -this.boundaries.x;
        //     this.mesh.velocity.x *= -1;
        // }
        // if(this.mesh.position.y > this.boundaries.y)
        // {
        //     this.mesh.position.y = this.boundaries.y;
        //     this.mesh.velocity.y *= -1;
        // }
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
            if (keyboardState[this.mesh.shoot]) {
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
                    this.mesh.velocity.set(5, 50, 0); // Imposta la velocità della palla per farla muovere verso l'alto
                    this.mesh.hasBall = false;
                }
            }            
            this.mesh.previousMState = keyboardState[this.mesh.shoot];
        }
        if(this.mesh.hasBall == true){ // tiene la palla attaccata alla
            this.mesh.position.x = this.paddle1X;
            this.mesh.position.y = this.paddle1Y + 0.5;
        }       
        //collisioni paddle 2 ***DA FINIRE****
        // if(this.mesh.position.y <= this.paddle2Y + 0.5 &&
        //     this.mesh.position.y >= this.paddle2Y - 0.5 &&
        //     this.mesh.position.x >= this.paddle2X - 5 &&
        //     this.mesh.position.x <= this.paddle2X + 5)
        // {               
        //     this.mesh.velocity.y *= -1;          
        // }
    }
}