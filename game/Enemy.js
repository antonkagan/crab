export default class Enemy {
    constructor(x, y, behavior = 'attack') {
        this.x = x;
        this.y = y;
        this.radius = 15 + Math.random() * 10;
        this.health = 20 + Math.random() * 30;
        this.maxHealth = this.health;
        this.speed = 50 + Math.random() * 50;
        this.attack = 5 + Math.random() * 5;
        this.points = Math.floor(this.maxHealth / 10);
        this.behavior = behavior; // 'attack' or 'flee'
        
        // Different colors based on behavior
        if (behavior === 'attack') {
            // Aggressive crabs are red/orange
            const attackColors = ['#ff6b6b', '#ff8c42', '#ff4757', '#ff6348'];
            this.color = attackColors[Math.floor(Math.random() * attackColors.length)];
        } else {
            // Fleeing crabs are blue/cyan
            const fleeColors = ['#4ecdc4', '#95e1d3', '#74b9ff', '#a29bfe'];
            this.color = fleeColors[Math.floor(Math.random() * fleeColors.length)];
        }
        
        // Attack cooldown
        this.attackCooldown = 1000; // milliseconds between attacks
        this.lastAttackTime = 0;
    }
    
    canAttack(currentTime) {
        return currentTime - this.lastAttackTime >= this.attackCooldown;
    }
    
    recordAttack(currentTime) {
        this.lastAttackTime = currentTime;
    }
    
    update(player, deltaTime, speedModifier = 1.0, worldWidth = null, worldHeight = null, trees = []) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveSpeed = this.speed * speedModifier * (deltaTime / 1000);
            
            // Calculate base movement direction
            let moveX, moveY;
            if (this.behavior === 'attack') {
                moveX = dx / distance;
                moveY = dy / distance;
            } else {
                moveX = -dx / distance;
                moveY = -dy / distance;
            }
            
            // Obstacle avoidance - steer away from nearby trees
            const avoidRadius = 60; // Detection range for obstacles
            let avoidX = 0;
            let avoidY = 0;
            
            for (const tree of trees) {
                const treeDx = this.x - tree.x;
                const treeDy = this.y - tree.y;
                const treeDist = Math.sqrt(treeDx * treeDx + treeDy * treeDy);
                
                if (treeDist < avoidRadius && treeDist > 0) {
                    // Push away from tree, stronger when closer
                    const strength = (avoidRadius - treeDist) / avoidRadius;
                    avoidX += (treeDx / treeDist) * strength;
                    avoidY += (treeDy / treeDist) * strength;
                }
            }
            
            // Combine movement with avoidance
            moveX += avoidX * 1.5;
            moveY += avoidY * 1.5;
            
            // Normalize
            const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
            if (moveDist > 0) {
                this.x += (moveX / moveDist) * moveSpeed;
                this.y += (moveY / moveDist) * moveSpeed;
            }
            
            // Keep fleeing crabs within world bounds
            if (this.behavior === 'flee' && worldWidth !== null && worldHeight !== null) {
                this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));
            }
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
}

