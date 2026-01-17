export default class Tree {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15; // Collision radius
        this.trunkHeight = 30;
        this.foliageRadius = 25;
    }
    
    checkCollision(entityX, entityY, entityRadius) {
        const dx = entityX - this.x;
        const dy = entityY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + entityRadius;
    }
}

