export default class Apple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.collected = false;
    }
    
    checkCollision(entityX, entityY, entityRadius) {
        if (this.collected) return false;
        const dx = entityX - this.x;
        const dy = entityY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + entityRadius;
    }
}

