//import * as THREE from "/static/js/game/module/three.module.js"
import { GLTFLoader } from "/static/js/game/module/GLTFLoader.js";
import { OBJLoader } from "/static/js/game/module/OBJLoader.js";
//import { KHRMaterialsPbrSpecularGlossiness } from "/static/js/game/module/KHRMaterialsPbrSpecularGlossiness.js";

export class Model3D {      
    
    loadAsteroid(scene) {
        return new Promise((resolve, reject) => {
            const loaderAsteroid = new OBJLoader();
            const textureLoader = new THREE.TextureLoader();
            loaderAsteroid.load('/static/js/game/asset/Asteroid/10464_Asteroid_v1_Iterations-2.obj', function (obj) {
                textureLoader.load('/static/js/game/asset/Asteroid/10464_Asteroid_v1_diffuse.jpg', function (texture) {
                    obj.traverse(function (child) {
                        if (child instanceof THREE.Mesh) {
                            child.material.map = texture;
                        }
                    });
                    obj.position.set(-2, 5, -15);
                    obj.scale.set(0.032, 0.03, 0.01);
                    scene.add(obj);
                    resolve(); // Risolvi la promessa quando il modello è caricato
                });
            }, undefined, function (error) {
                reject(error); // Rifiuta la promessa in caso di errore
            });
        });
    }

    /*loadModel1v1(scene, ufo) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
    
            const loadUfo0 = new Promise((resolve, reject) => {
                loader.load('/static/js/game/asset/ufo/scene.gltf', (gltf) => {
                    gltf.scene.position.set(0, -20, 1);
                    gltf.scene.scale.set(0.01, 0.01, 0.01);
                    gltf.scene.rotateX(Math.PI / 2);
                    gltf.scene.rotateY(Math.PI);
                    scene.add(gltf.scene);
                    ufo[0] = gltf.scene;
                    resolve();
                }, undefined, (error) => {
                    reject(error);
                });
            });
    
            const loadUfo1 = new Promise((resolve, reject) => {
                loader.load('/static/js/game/asset/ufo/scene.gltf', (gltf) => {
                    gltf.scene.position.set(0, 20, 1);
                    gltf.scene.scale.set(0.01, 0.01, 0.01);
                    gltf.scene.rotateX(Math.PI / 2);
                    scene.add(gltf.scene);
                    ufo[1] = gltf.scene;
                    resolve();
                }, undefined, (error) => {
                    reject(error);
                });
            });
    
            Promise.all([loadUfo0, loadUfo1]).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    }

    loadModel2v2(scene, ufo) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
    
            const loadUfo2 = new Promise((resolve, reject) => {
                loader.load('/static/js/game/asset/ufo/scene.gltf', (gltf) => {
                    gltf.scene.position.set(20, 0, 1);
                    gltf.scene.scale.set(0.01, 0.01, 0.01);
                    gltf.scene.rotateX(Math.PI / 2);
                    gltf.scene.rotateY(Math.PI);
                    scene.add(gltf.scene);
                    ufo[2] = gltf.scene;
                    resolve();
                }, undefined, (error) => {
                    reject(error);
                });
            });
    
            const loadUfo3 = new Promise((resolve, reject) => {
                loader.load('/static/js/game/asset/ufo/scene.gltf', (gltf) => {
                    gltf.scene.position.set(-20, 0, 1);
                    gltf.scene.scale.set(0.01, 0.01, 0.01);
                    gltf.scene.rotateX(Math.PI / 2);
                    scene.add(gltf.scene);
                    ufo[3] = gltf.scene;
                    resolve();
                }, undefined, (error) => {
                    reject(error);
                });
            });
    
            Promise.all([loadUfo2, loadUfo3]).then(() => {
                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
    }*/

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

    // loadStation0(scene, station, x, y) {
    //     const station0 = new GLTFLoader();
    //     station0.load( '/static/js/game/asset/space_station/scene.gltf', function ( gltf ) { // o scene-v1.glb, no estensione ma piú lento
    //         gltf.scene.position.set(x, y, 1);
    //         gltf.scene.scale.set(2.5, 2.5, 2.5);   
    //         gltf.scene.rotateX(Math.PI / 2);
    //         scene.add( gltf.scene );
    //         station[0] = gltf.scene; // creo variabile per spostare modello
    //     }, undefined, function ( error ) {
    //         console.error( error );
    //     } );
    // }
    loadStation0(scene, station, x, y) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/static/js/game/asset/space_station/scene.gltf', (gltf) => {
                gltf.scene.position.set(x, y, 1);
                gltf.scene.scale.set(2.5, 2.5, 2.5);
                gltf.scene.rotateX(Math.PI / 2);
                scene.add(gltf.scene);
                station[0] = gltf.scene; // creo variabile per spostare modello
                resolve(); // Risolvi la promessa quando il modello è caricato
            }, undefined, (error) => {
                console.error(error);
                reject(error); // Rifiuta la promessa in caso di errore
            });
        });
    }
    loadStation1(scene, station, x, y) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/static/js/game/asset/space_station/scene.gltf', (gltf) => {
                gltf.scene.position.set(x, y, 1);
                gltf.scene.scale.set(2.5, 2.5, 2.5);
                gltf.scene.rotateX(Math.PI / 2);
                scene.add(gltf.scene);
                station[1] = gltf.scene; // creo variabile per spostare modello
                resolve(); // Risolvi la promessa quando il modello è caricato
            }, undefined, (error) => {
                console.error(error);
                reject(error); // Rifiuta la promessa in caso di errore
            });
        });
    }

    loadStation2(scene, station, x, y) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/static/js/game/asset/colonization_ship_-_uei_opportunity/scene.gltf', (gltf) => {
                gltf.scene.position.set(x, y, 1);
                gltf.scene.scale.set(5, 5, 5);
                //gltf.scene.rotateX(Math.PI / 2);
                scene.add(gltf.scene);
                station[2] = gltf.scene; // creo variabile per spostare modello
                resolve(); // Risolvi la promessa quando il modello è caricato
            }, undefined, (error) => {
                console.error(error);
                reject(error); // Rifiuta la promessa in caso di errore
            });
        });
    }

    loadStation3(scene, station, x, y) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();
            loader.load('/static/js/game/asset/colonization_ship_-_uei_opportunity/scene.gltf', (gltf) => {
                gltf.scene.position.set(x, y, 1);
                gltf.scene.scale.set(5, 5, 5);
                gltf.scene.rotateX(Math.PI);
                scene.add(gltf.scene);
                station[3] = gltf.scene; // creo variabile per spostare modello
                resolve(); // Risolvi la promessa quando il modello è caricato
            }, undefined, (error) => {
                console.error(error);
                reject(error); // Rifiuta la promessa in caso di errore
            });
        });
    } 
    

    moveStation(station){
        if(station[0])
            station[0].rotateY(0.003);
        if(station[1])
            station[1].rotateY(-0.003);
        if(station[2])
            station[2].rotateZ(0.005);
        if(station[3])
            station[3].rotateZ(-0.005);        
    }       
};
