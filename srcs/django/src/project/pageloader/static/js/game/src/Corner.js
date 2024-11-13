
import {Mesh, MeshNormalMaterial, SphereGeometry} from "/static/js/game/module/three.module.js";

//const MATERIAL = new MeshNormalMaterial();

const MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x999999,
    metalness: 0.6,//0.75,
    roughness: 0.5,//0.2
});

export class Corner{
    
    constructor(scene, x, y, z, r) {
        this.scene = scene;
        this.mesh = new Mesh(new SphereGeometry(r), MATERIAL);
        this.mesh.position.set(x, y, z);
        this.r = r;
        this.mesh.renderOrder = 9999;
        this.scene.add(this.mesh);
    }

    destroy(){
        this.scene.remove(this.mesh);    
    }
};