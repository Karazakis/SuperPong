
export function cornerCollision(ball2, ball3){
    if(ball2.r + ball3.r >= ball3.mesh.position.distanceTo(ball2.mesh.position)) {
        return true;
    }
    else {
        return false;
    }
}

export function penetrationDepthCorner2(ball, corner, isOnlineGame = false, isHost = false){

        let dist = ball.mesh.position.clone().sub(corner.mesh.position);
        let penetrationDepth = ball.r + corner.r - dist.length();
        
        if (penetrationDepth > 0) {
            let correction = dist.normalize().multiplyScalar(penetrationDepth);
            ball.mesh.position.add(correction);
        }
}


export function ballCollision(ball2, ball3){
    if(!ball2 || !ball3 || !ball2.mesh || !ball3.mesh || ball2 === ball3)
        return false;
    if(ball2.r + ball3.r >= ball3.mesh.position.distanceTo(ball2.mesh.position)) {
        return true;
    }
    else {
        return false;
    }
}

export function penetrationDepth(ball2, ball3, isOnlineGame = false, isHost = false){
        let dist = ball2.mesh.position.clone().sub(ball3.mesh.position);
        let pen_d = ball2.r + ball3.r - dist.manhattanLength();
        let pen_res = dist.clone().normalize().multiplyScalar(pen_d);
        ball2.mesh.position.add(pen_res);
        ball3.mesh.position.add(pen_res.multiplyScalar(-1));
}

export function collisionResponse(ball2, ball3, isOnlineGame = false, isHost = false) {
        let normal = ball2.mesh.position.clone().sub(ball3.mesh.position).normalize();
        let relVel = ball2.mesh.velocity.clone().sub(ball3.mesh.velocity);
        let sepVel = relVel.dot(normal);
        let new_sepVel = -sepVel;
        let sepVelVec = normal.multiplyScalar(new_sepVel);
        ball2.mesh.velocity.add(sepVelVec);
        ball3.mesh.velocity.add(sepVelVec.multiplyScalar(-1));
}

export function ballPadCollisionResponse(ball, pad, isOnlineGame = false, isHost = false) {
        let normal = ball.mesh.position.clone().sub(pad.mesh.position).normalize();
        let velocityAlongNormal = ball.mesh.velocity.clone().dot(normal);
        let velocityAlongNormalVec = normal.multiplyScalar(velocityAlongNormal);
        let velocityTangentialVec = ball.mesh.velocity.clone().sub(velocityAlongNormalVec);
        let newVelocityAlongNormalVec = velocityAlongNormalVec.multiplyScalar(-1);
        ball.mesh.velocity = velocityTangentialVec.add(newVelocityAlongNormalVec);
        if(pad.id == 1) {
            pad.hit += 1;
        }
        else if(pad.id == 2) {
            pad.hit += 1;
        }
        else if(pad.id == 3) {
            pad.hit += 1;
        }
        else if(pad.id == 4) {
            pad.hit += 1;
        }
        
}