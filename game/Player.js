export default class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 150;
        this.attack = 10;
        this.attackRange = 40; // Range of attack in front of player
        
        this.mutations = [];
        this.mutationLevels = {}; // Track level of each mutation by name
        this.crabRisk = 0;
        this.isCrab = false;
        
        // Guns (Arms level 2+)
        this.hasGuns = false;
        this.gunsLevel = 0;
        this.gunsRange = 0;
        
        this.color = '#4ecdc4';
        
        // Facing direction (default: right)
        this.facingX = 1;
        this.facingY = 0;
        
        // Attack cooldown
        this.attackCooldown = 500; // milliseconds between attacks
        this.lastAttackTime = 0;
    }
    
    canAttack(currentTime) {
        return currentTime - this.lastAttackTime >= this.attackCooldown;
    }
    
    recordAttack(currentTime) {
        this.lastAttackTime = currentTime;
    }
    
    update(moveX, moveY, deltaTime, width, height, speedModifier = 1.0) {
        const moveSpeed = this.speed * speedModifier * (deltaTime / 1000);
        
        this.x += moveX * moveSpeed;
        this.y += moveY * moveSpeed;
        
        // Update facing direction based on movement
        if (moveX !== 0 || moveY !== 0) {
            const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            this.facingX = moveX / magnitude;
            this.facingY = moveY / magnitude;
        }
        
        // Keep player in bounds
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.health = Math.max(0, this.health);
    }
    
    applyMutation(mutation) {
        // Track mutation level
        const baseName = mutation.name;
        if (!this.mutationLevels[baseName]) {
            this.mutationLevels[baseName] = 0;
        }
        this.mutationLevels[baseName]++;
        const level = this.mutationLevels[baseName];
        
        // Store mutation with level info
        this.mutations.push({ ...mutation, level });
        
        // Calculate level multiplier (level 1 = 1x, level 2 = 1.5x, level 3 = 2x, etc.)
        const levelMultiplier = 1 + (level - 1) * 0.5;
        
        // Apply stat changes with level scaling
        if (mutation.health) {
            const healthIncrease = Math.floor(mutation.health * levelMultiplier);
            this.maxHealth += healthIncrease;
            this.health += healthIncrease;
        }
        
        if (mutation.speed) {
            this.speed += Math.floor(mutation.speed * levelMultiplier);
        }
        
        if (mutation.attack) {
            this.attack += Math.floor(mutation.attack * levelMultiplier);
        }
        
        // Increase crab risk
        if (mutation.crabRisk) {
            this.crabRisk += mutation.crabRisk;
        }
        
        // Special: Arms level 2+ becomes Guns
        if (baseName === 'Arms' && level >= 2) {
            this.hasGuns = true;
            this.gunsLevel = level - 1; // Guns level starts at 1 when Arms hits level 2
            this.gunsRange = 150 + (this.gunsLevel - 1) * 50; // 150px at guns lv1, +50 per level
        }
        
        // Check if player becomes crab
        if (this.crabRisk >= 100 || mutation.name.toLowerCase().includes('crab')) {
            this.isCrab = true;
            this.color = '#ff6b6b';
            this.radius = 25;
        }
    }
    
    getMutationLevel(mutationName) {
        return this.mutationLevels[mutationName] || 0;
    }
    
    getVisualFeatures() {
        const features = {
            hasClaws: false,
            hasShell: false,
            hasTentacles: false,
            hasSpikes: false,
            hasArms: false,
            hasLegs: false,
            color: this.color
        };
        
        this.mutations.forEach(mutation => {
            if (mutation.name.toLowerCase().includes('claw')) {
                features.hasClaws = true;
            }
            if (mutation.name.toLowerCase().includes('shell')) {
                features.hasShell = true;
            }
            if (mutation.name.toLowerCase().includes('tentacle')) {
                features.hasTentacles = true;
            }
            if (mutation.name.toLowerCase().includes('spike')) {
                features.hasSpikes = true;
            }
            if (mutation.name.toLowerCase().includes('arm')) {
                features.hasArms = true;
            }
            if (mutation.name.toLowerCase().includes('leg')) {
                features.hasLegs = true;
            }
        });
        
        if (this.isCrab) {
            features.hasClaws = true;
            features.hasShell = true;
            features.color = '#ff6b6b';
        }
        
        return features;
    }
}

