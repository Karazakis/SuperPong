
import {Mesh, MeshNormalMaterial, MeshBasicMaterial, CapsuleGeometry, Vector2} from "/static/js/game/module/three.module.js";

const keyboardState = {};
// Aggiungi un gestore degli eventi per la pressione dei tasti
window.addEventListener('keydown', (event) => {
    // Salva lo stato del tasto premuto
    keyboardState[event.code] = true;
});

window.addEventListener('keyup', (event) => {
    // Rimuovi lo stato del tasto rilasciato
    keyboardState[event.code] = false;
});

const GEOMETRY = new CapsuleGeometry(0.5, 5, 20, 20);
GEOMETRY.rotateZ(Math.PI / 2);

const MATERIAL = new MeshNormalMaterial({ color: 0xff0000ff , transparent: true, opacity: 0.3});
const TURBO_MATERIAL = new MeshBasicMaterial({ color: 0x00ff0000 });

export class Paddle {
    constructor(scene, boundaries, spawnX, spawnY ,left, right, shoot, turbo) {
        this.scene = scene;
        this.geometry = GEOMETRY;
        this.material = MATERIAL;
        this.turboMaterial = TURBO_MATERIAL;
        this.mesh = new Mesh(GEOMETRY, MATERIAL);
        this.mesh.spawn = new Vector2(spawnX, spawnY);
        this.boundaries = new Vector2(boundaries.x, boundaries.y);
        this.mesh.position.set(this.mesh.spawn.x, this.mesh.spawn.y);
        
        this.mesh.speed = 20;
        this.mesh.right = right;
        this.mesh.left = left;
        this.mesh.shoot = shoot;
        this.mesh.turbo = turbo;
        this.mesh.countdownTurbo = 0;
        this.scene.add(this.mesh);
    }

    destroy(){
        this.scene.remove(this.mesh);        
    }

    update(dt) {            
        if(this.mesh.position.x > this.boundaries.x - 6.8) { // controllo sui bordi
            this.mesh.position.x = this.boundaries.x - 6.8;
        }
        else if(this.mesh.position.x < -this.boundaries.x + 6.8) {
            this.mesh.position.x = -this.boundaries.x + 6.8;
        }
        // tasti
        if(keyboardState[this.mesh.right]) { 
            this.mesh.position.x += dt * this.mesh.speed;
        }
        else if(keyboardState[this.mesh.left]) {
            this.mesh.position.x -= dt * this.mesh.speed;
        }  
    }

    turbo(){
        if(this.mesh.countdownTurbo == 0 && keyboardState[this.mesh.turbo]){
            console.log("turbo");
            this.mesh.speed = 60;
            this.mesh.countdownTurbo = 1;
            this.mesh.material = this.turboMaterial;
            setTimeout(() => { 
                this.mesh.countdownTurbo = 0;
            }, 5000);
            setTimeout(() => {
                this.mesh.speed = 20;
                this.mesh.material = this.material;
            }, 3000);
        }
    }
    
}