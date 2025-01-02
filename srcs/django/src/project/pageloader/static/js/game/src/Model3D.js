import { GLTFLoader } from "/static/js/game/module/GLTFLoader.js";
import { OBJLoader } from "/static/js/game/module/OBJLoader.js";

export class Model3D {      

    loadModel1v1(scene, ufo){
        const ufo0 = new GLTFLoader();
        ufo0.load( '/static/js/game/asset/ufo/scene.gltf', function ( gltf ) {
            gltf.scene.position.set(0, -20, 1);
            gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
            gltf.scene.rotateX(Math.PI / 2);
            gltf.scene.rotateY(Math.PI);
            scene.add( gltf.scene );
            ufo[0] = gltf.scene; // creo variabile per spostare modello
        }, undefined, function ( error ) {
            console.error( error );
        } );
    
        const ufo1 = new GLTFLoader();
        ufo1.load( '/static/js/game/asset/ufo/scene.gltf', function ( gltf ) {
            gltf.scene.position.set(0, 20, 1);
            gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
            gltf.scene.rotateX(Math.PI / 2);
            //gltf.scene.rotateY(Math.PI / 4);
            //gltf.scene.rotateZ(Math.PI);
            scene.add( gltf.scene );
            ufo[1] = gltf.scene; // creo variabile per spostare modello
        }, undefined, function ( error ) {
            console.error( error );
        } );
    }   

    loadModel2v2(scene, ufo, gameMode){
        if(gameMode == '1v1'){
            return;
        }
        const ufo2 = new GLTFLoader();
        ufo2.load( '/static/js/game/asset/ufo/scene.gltf', function ( gltf ) {
            gltf.scene.position.set(20, 0, 1);
            gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
            gltf.scene.rotateX(Math.PI / 2);
            gltf.scene.rotateY(-Math.PI / 2);
            //gltf.scene.rotateZ(Math.PI);
            scene.add( gltf.scene );
            ufo[2] = gltf.scene; // creo variabile per spostare modello
        }, undefined, function ( error ) {
            console.error( error );
        } );
    
        const ufo3 = new GLTFLoader();
        ufo3.load( '/static/js/game/asset/ufo/scene.gltf', function ( gltf ) {
            gltf.scene.position.set(-20, 0, 1);
            gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
            gltf.scene.rotateX(Math.PI / 2);
            gltf.scene.rotateY(Math.PI / 2);
            //gltf.scene.rotateZ(Math.PI);
            scene.add( gltf.scene );
            ufo[3] = gltf.scene; // creo variabile per spostare modello
        }, undefined, function ( error ) {
            console.error( error );
        } );
       //return ufo;
    };
    
    moveUfo0(paddle1, Ufo){ //ufo0 in basso, ufo 1 in alto, ufo 2 a destra, ufo 3 a sinistra
        let ufo = Ufo;
        if(ufo[0])
            ufo[0].position.x = paddle1.mesh.position.x;    
    }
    
    moveUfo1(bot, Ufo){
        let ufo = Ufo;    
        if (ufo[1])
            ufo[1].position.x = bot.mesh.position.x;
    }

    moveUfo2(bot, Ufo){
        let ufo = Ufo;    
        if (ufo[2])
            ufo[2].position.y = bot.mesh.position.y;
    }

    moveUfo3(bot, Ufo){
        let ufo = Ufo;    
        if (ufo[3])
            ufo[3].position.y = bot.mesh.position.y;
    }

    removeUfo(scene, ufo, index) {
        if (ufo[index]) {
            scene.remove(ufo[index]);
            ufo[index].traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            ufo[index] = null;
        }
    }
};
