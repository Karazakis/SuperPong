import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadModel(scene, ufo){
    const ufo0 = new GLTFLoader();
    ufo0.load( '/asset/ufo/scene.gltf', function ( gltf ) {
        gltf.scene.position.set(0, -21, 1);
        gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
        gltf.scene.rotateX(Math.PI / 2);
        gltf.scene.rotateY(Math.PI);
        //gltf.scene.rotateZ(Math.PI);
        scene.add( gltf.scene );
        ufo[0] = gltf.scene; // creo variabile per spostare modello
    }, undefined, function ( error ) {
        console.error( error );
    } );

    const ufo1 = new GLTFLoader();
    ufo1.load( '/asset/ufo/scene.gltf', function ( gltf ) {
        gltf.scene.position.set(0, 21, 1);
        gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
        gltf.scene.rotateX(Math.PI / 2);
        //gltf.scene.rotateY(Math.PI / 4);
        //gltf.scene.rotateZ(Math.PI);
        scene.add( gltf.scene );
        ufo[1] = gltf.scene; // creo variabile per spostare modello
    }, undefined, function ( error ) {
        console.error( error );
    } );

    const ufo2 = new GLTFLoader();
    ufo2.load( '/asset/ufo/scene.gltf', function ( gltf ) {
        gltf.scene.position.set(21, 0, 1);
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
    ufo3.load( '/asset/ufo/scene.gltf', function ( gltf ) {
        gltf.scene.position.set(-21, 0, 1);
        gltf.scene.scale.set(0.01 ,0.01 ,0.01);   
        gltf.scene.rotateX(Math.PI / 2);
        gltf.scene.rotateY(Math.PI / 2);
        //gltf.scene.rotateZ(Math.PI);
        scene.add( gltf.scene );
        ufo[3] = gltf.scene; // creo variabile per spostare modello
    }, undefined, function ( error ) {
        console.error( error );
    } );

    return ufo;
}