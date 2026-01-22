export default class Enemy {
    constructor(x, y, behavior = 'attack') {
        this.x = x;
        this.y = y;
        this.behavior = behavior; // 'attack' or 'flee'
        
        // Assign crab type based on behavior
        if (behavior === 'flee') {
            // Fleeing crabs are Hermit Crabs (small, with shell)
            this.crabType = 'hermit';
            this.radius = 12 + Math.random() * 5;
            this.health = 15 + Math.random() * 15;
            this.speed = 70 + Math.random() * 40; // Faster (fleeing)
            this.attack = 3 + Math.random() * 3;
            // Blue/cyan shell colors
            const hermitColors = ['#4ecdc4', '#95e1d3', '#74b9ff', '#81ecec'];
            this.color = hermitColors[Math.floor(Math.random() * hermitColors.length)];
            this.shellColor = '#8B7355'; // Brown shell
        } else {
            // Attacking crabs are either Fiddler or King Crabs
            if (Math.random() < 0.7) {
                // 70% chance: Fiddler Crab (one big claw)
                this.crabType = 'fiddler';
                this.radius = 15 + Math.random() * 8;
                this.health = 25 + Math.random() * 25;
                this.speed = 55 + Math.random() * 35;
                this.attack = 8 + Math.random() * 7;
                // Red/orange colors
                const fiddlerColors = ['#ff6b6b', '#ff8c42', '#e74c3c', '#ff6348'];
                this.color = fiddlerColors[Math.floor(Math.random() * fiddlerColors.length)];
                this.bigClawSide = Math.random() < 0.5 ? 'left' : 'right';
            } else {
                // 30% chance: King Crab (large, spiky)
                this.crabType = 'king';
                this.radius = 20 + Math.random() * 10;
                this.health = 40 + Math.random() * 40;
                this.speed = 40 + Math.random() * 30; // Slower but tankier
                this.attack = 12 + Math.random() * 8;
                // Dark red/crimson colors
                const kingColors = ['#c0392b', '#922B21', '#7B241C', '#943126'];
                this.color = kingColors[Math.floor(Math.random() * kingColors.length)];
            }
        }
        
        this.maxHealth = this.health;
        this.points = Math.floor(this.maxHealth / 10);
        
        // Attack cooldown
        this.attackCooldown = 1000; // milliseconds between attacks
        this.lastAttackTime = 0;
        
        // Animation phase (for leg movement)
        this.animPhase = Math.random() * Math.PI * 2;
    }
    
    canAttack(currentTime) {
        return currentTime - this.lastAttackTime >= this.attackCooldown;
    }
    
    recordAttack(currentTime) {
        this.lastAttackTime = currentTime;
    }
    
    update(player, deltaTime, speedModifier = 1.0, worldWidth = null, worldHeight = null, trees = []) {
        // Update animation phase
        this.animPhase += deltaTime * 0.01;
        
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

