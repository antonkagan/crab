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
        
        // Super Evolution System
        this.evolutionProgress = {
            gorilla: 0, crab: 0, bee: 0, elephant: 0, bird: 0, fox: 0
        };
        
        this.superEvolutions = {
            gorilla: false, crab: false, bee: false, elephant: false, bird: false, fox: false
        };
        
        // Ability cooldowns (milliseconds, 0 = ready)
        this.abilityCooldowns = {
            gorilla: 0, crab: 0, bee: 0, elephant: 0, bird: 0, fox: 0
        };
        
        // Ability max cooldowns
        this.abilityMaxCooldowns = {
            gorilla: 6000,   // Ground Pound
            crab: 10000,     // Iron Shell
            bee: 15000,      // Swarm
            elephant: 7000,  // Stampede
            bird: 8000,      // Flight
            fox: 10000       // Vanish
        };
        
        // Active ability states
        this.activeAbilities = {
            ironShell: false,
            ironShellTimer: 0,
            flight: false,
            flightTimer: 0,
            flightSpeedBoost: 3.0,
            vanish: false,
            vanishTimer: 0,
            vanishDamageBoost: false,
            vanishDamageMultiplier: 3.0,
            stampede: false,
            stampedeTimer: 0,
            stampedeDirection: { x: 0, y: 0 },
            stampedeDamage: 0
        };
        
        // Bee swarm minions
        this.beeSwarm = [];
        
        // Current creature form (when super evolved)
        this.currentCreatureForm = null;
        
        // Regeneration (HP per second)
        this.regeneration = 0;
        
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
        
        // Apply regeneration (stacks with level)
        if (mutation.regeneration) {
            this.regeneration += mutation.regeneration * levelMultiplier;
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
        
        // Update evolution progress for super evolutions (+10% per mutation)
        if (mutation.creatureTypes) {
            for (const creature of mutation.creatureTypes) {
                if (this.evolutionProgress[creature] !== undefined) {
                    this.evolutionProgress[creature] += 10;
                    // Cap at 100%
                    if (this.evolutionProgress[creature] > 100) {
                        this.evolutionProgress[creature] = 100;
                    }
                }
            }
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
    
    // Check which creatures are ready for super evolution (100% but not yet evolved)
    getReadySuperEvolutions() {
        const ready = [];
        for (const creature in this.evolutionProgress) {
            if (this.evolutionProgress[creature] >= 100 && !this.superEvolutions[creature]) {
                ready.push(creature);
            }
        }
        return ready;
    }
    
    // Activate a super evolution
    activateSuperEvolution(creature) {
        if (this.evolutionProgress[creature] >= 100 && !this.superEvolutions[creature]) {
            this.superEvolutions[creature] = true;
            // Transform into the creature
            this.currentCreatureForm = creature;
            return true;
        }
        return false;
    }
    
    // Check if all super evolutions are unlocked (carcinization)
    hasAllSuperEvolutions() {
        return Object.values(this.superEvolutions).every(v => v);
    }
    
    // Check if ability can be used
    canUseAbility(creature) {
        return this.superEvolutions[creature] && this.abilityCooldowns[creature] <= 0;
    }
    
    // Use an ability (start cooldown)
    useAbility(creature) {
        if (!this.canUseAbility(creature)) {
            return false;
        }
        this.abilityCooldowns[creature] = this.abilityMaxCooldowns[creature];
        return true;
    }
    
    // Update ability cooldowns
    updateAbilityCooldowns(deltaTime) {
        for (const creature in this.abilityCooldowns) {
            if (this.abilityCooldowns[creature] > 0) {
                this.abilityCooldowns[creature] -= deltaTime;
                if (this.abilityCooldowns[creature] < 0) {
                    this.abilityCooldowns[creature] = 0;
                }
            }
        }
        
        // Update active ability timers
        if (this.activeAbilities.ironShell) {
            this.activeAbilities.ironShellTimer -= deltaTime;
            if (this.activeAbilities.ironShellTimer <= 0) {
                this.activeAbilities.ironShell = false;
            }
        }
        
        if (this.activeAbilities.flight) {
            this.activeAbilities.flightTimer -= deltaTime;
            if (this.activeAbilities.flightTimer <= 0) {
                this.activeAbilities.flight = false;
            }
        }
        
        if (this.activeAbilities.vanish) {
            this.activeAbilities.vanishTimer -= deltaTime;
            if (this.activeAbilities.vanishTimer <= 0) {
                this.activeAbilities.vanish = false;
                // Keep damage boost until next attack
            }
        }
        
        if (this.activeAbilities.stampede) {
            this.activeAbilities.stampedeTimer -= deltaTime;
            if (this.activeAbilities.stampedeTimer <= 0) {
                this.activeAbilities.stampede = false;
            }
        }
        
        // Update bee swarm
        for (let i = this.beeSwarm.length - 1; i >= 0; i--) {
            this.beeSwarm[i].timer -= deltaTime;
            if (this.beeSwarm[i].timer <= 0) {
                this.beeSwarm.splice(i, 1);
            }
        }
    }
    
    getVisualFeatures() {
        const features = {
            hasClaws: false,
            hasShell: false,
            hasTentacles: false,
            hasSpikes: false,
            hasArms: false,
            hasLegs: false,
            hasTail: false,
            hasWings: false,
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
            if (mutation.name.toLowerCase().includes('tail')) {
                features.hasTail = true;
            }
            if (mutation.name.toLowerCase().includes('wing')) {
                features.hasWings = true;
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

