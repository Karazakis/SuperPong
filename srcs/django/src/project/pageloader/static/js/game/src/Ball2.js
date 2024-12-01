/* 
import { Mesh, SphereGeometry } from "/static/js/game/module/three.module.js";
import { getBallsUpdate,ballsUpdate, posit } from "/static/js/game.js";


const MATERIAL = new THREE.MeshStandardMaterial({
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
        this.mesh = new Mesh(new SphereGeometry(this.r), MATERIAL);
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
        export function getBallsUpdate() {
        
        this.debounceTimer += dt;
        console.log("debounceTimer", this.debounceTimer, ballsUpdate);
        if (this.debounceTimer < 0.01) return;
        this.debounceTimer = 0;
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
            console.log("ball id nel update ball", this.ballId);
            console.log("ballsUpdate nel ball", ballsUpdate);

            try {
                if(ballsUpdate[this.ballId] !== undefined)
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
            }
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
} */