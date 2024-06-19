


import {Mesh, MeshNormalMaterial, SphereGeometry, Vector3} from "/static/js/game/module/three.module.js";


const MATERIAL = new MeshNormalMaterial({ color: 0xff0000ff });

export class Corner{
    
    constructor(scene, x, y, z, r) {
        this.scene = scene;
        this.mesh = new Mesh(new SphereGeometry(r), MATERIAL);
        this.mesh.position.set(x, y, z);
        this.r = r;
        this.mesh.velocity = new Vector3(0, 0, 0);
        //this.speed = 10;
        //this.mesh.velocity.multiplyScalar(this.speed);
        
        
        this.scene.add(this.mesh);
    }

    
};