export default class Boss {
    constructor(x, y, bossNumber) {
        this.x = x;
        this.y = y;
        this.bossNumber = bossNumber; // 1, 2, or 3
        
        // Scale stats based on boss number
        this.radius = 60 + bossNumber * 20; // 80, 100, 120
        this.maxHealth = 1500 + bossNumber * 750; // 2250, 3000, 3750
        this.health = this.maxHealth;
        this.speed = 70 + bossNumber * 20; // 90, 110, 130 - extremely fast
        this.attack = bossNumber * 100; // 100, 200, 300
        this.points = 150 * bossNumber; // Bonus points on kill
        
        // Boss colors - gold, purple, crimson
        const bossColors = ['#ffd700', '#9b59b6', '#dc143c'];
        this.color = bossColors[bossNumber - 1];
        
        // Glow colors
        const glowColors = ['#ffec8b', '#d8bfd8', '#ff6961'];
        this.glowColor = glowColors[bossNumber - 1];
        
        // Boss names
        const bossNames = ['Golden Crusher', 'Void Emperor', 'Crimson Overlord'];
        this.name = bossNames[bossNumber - 1];
        
        // Attack cooldown (faster for more pressure)
        this.attackCooldown = 800;
        this.lastAttackTime = 0;
        
        // Animation
        this.pulsePhase = 0;
        
        // Boss-specific abilities
        if (bossNumber === 1) {
            // Golden Crusher: Spikes + Dash (both are activatable abilities)
            
            // Spikes ability - activates periodically
            this.hasSpikesAbility = true;
            this.spikeDamage = 15;
            this.spikesCooldown = 5000; // 5 seconds between activations
            this.lastSpikesTime = 0;
            this.spikesActive = false;
            this.spikesDuration = 2000; // Spikes last 2 seconds
            this.spikesTimer = 0;
            
            // Dash ability
            this.canDash = true;
            this.dashCooldown = 6000; // 6 seconds between dashes
            this.lastDashTime = -3000; // Start with dash available soon
            this.isDashing = false;
            this.dashSpeed = 500;
            this.dashDuration = 500;
            this.dashTimer = 0;
            this.dashTargetX = 0;
            this.dashTargetY = 0;
        } else if (bossNumber === 2) {
            // Void Emperor: Enemy Buff + Hurricanes
            this.hasSpikesAbility = false;
            this.spikesActive = false;
            this.canDash = false;
            
            // Enemy Buff ability - makes all enemies stronger
            this.canBuffEnemies = true;
            this.buffCooldown = 8000; // 8 seconds between buffs
            this.lastBuffTime = 0;
            this.buffActive = false;
            this.buffDuration = 4000; // Buff lasts 4 seconds
            this.buffTimer = 0;
            this.buffMultiplier = 2.0; // Enemies do 2x damage and move 1.5x faster
            
            // Hurricane ability - spawns 5 hurricanes
            this.canSummonHurricanes = true;
            this.hurricaneCooldown = 10000; // 10 seconds between hurricane spawns
            this.lastHurricaneTime = -5000; // Start with hurricanes coming soon
            this.hurricanes = [];
            this.hurricaneDuration = 5000; // Hurricanes last 5 seconds
            this.hurricaneDamage = 10; // Damage per second when inside
            this.hurricanePullStrength = 150; // Pull force
            this.hurricaneRadius = 80; // Size of each hurricane
        } else if (bossNumber === 3) {
            // Crimson Overlord: Curse (damage over time when you attack)
            this.hasSpikesAbility = false;
            this.spikesActive = false;
            this.canDash = false;
            this.canBuffEnemies = false;
            this.canSummonHurricanes = false;
            this.hurricanes = [];
            
            // Curse ability - attacking this boss curses you
            this.hasCurse = true;
            this.curseDamage = 2; // Damage dealt by curse
            this.curseInterval = 1000; // 2 HP per second
        } else {
            this.hasSpikesAbility = false;
            this.spikesActive = false;
            this.canDash = false;
            this.canBuffEnemies = false;
            this.canSummonHurricanes = false;
            this.hurricanes = [];
            this.hasCurse = false;
        }
    }
    
    canAttack(currentTime) {
        return currentTime - this.lastAttackTime >= this.attackCooldown;
    }
    
    recordAttack(currentTime) {
        this.lastAttackTime = currentTime;
    }
    
    update(player, deltaTime, speedModifier = 1.0) {
        // Update pulse animation
        this.pulsePhase += deltaTime * 0.003;
        
        const currentTime = performance.now();
        
        // Handle spikes ability (Golden Crusher)
        if (this.hasSpikesAbility) {
            if (this.spikesActive) {
                // Spikes are active - count down
                this.spikesTimer -= deltaTime;
                if (this.spikesTimer <= 0) {
                    this.spikesActive = false;
                }
            } else if (currentTime - this.lastSpikesTime >= this.spikesCooldown) {
                // Activate spikes
                this.spikesActive = true;
                this.lastSpikesTime = currentTime;
                this.spikesTimer = this.spikesDuration;
            }
        }
        
        // Handle enemy buff ability (Void Emperor)
        if (this.canBuffEnemies) {
            if (this.buffActive) {
                this.buffTimer -= deltaTime;
                if (this.buffTimer <= 0) {
                    this.buffActive = false;
                }
            } else if (currentTime - this.lastBuffTime >= this.buffCooldown) {
                this.buffActive = true;
                this.lastBuffTime = currentTime;
                this.buffTimer = this.buffDuration;
            }
        }
        
        // Handle hurricane ability (Void Emperor)
        if (this.canSummonHurricanes) {
            // Update existing hurricanes
            for (let i = this.hurricanes.length - 1; i >= 0; i--) {
                this.hurricanes[i].timer -= deltaTime;
                this.hurricanes[i].rotation += deltaTime * 0.01; // Spin animation
                if (this.hurricanes[i].timer <= 0) {
                    this.hurricanes.splice(i, 1);
                }
            }
            
            // Spawn new hurricanes
            if (currentTime - this.lastHurricaneTime >= this.hurricaneCooldown && this.hurricanes.length === 0) {
                this.lastHurricaneTime = currentTime;
                // Spawn 5 hurricanes around the player area
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
                    const dist = 150 + Math.random() * 200;
                    this.hurricanes.push({
                        x: player.x + Math.cos(angle) * dist,
                        y: player.y + Math.sin(angle) * dist,
                        radius: this.hurricaneRadius,
                        timer: this.hurricaneDuration,
                        rotation: Math.random() * Math.PI * 2
                    });
                }
            }
        }
        
        // Handle dash ability (Golden Crusher)
        if (this.canDash) {
            if (this.isDashing) {
                // Currently dashing - move fast toward target
                this.dashTimer -= deltaTime;
                
                const dx = this.dashTargetX - this.x;
                const dy = this.dashTargetY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 10 && this.dashTimer > 0) {
                    const moveSpeed = this.dashSpeed * (deltaTime / 1000);
                    this.x += (dx / distance) * moveSpeed;
                    this.y += (dy / distance) * moveSpeed;
                } else {
                    // Dash ended
                    this.isDashing = false;
                }
                return; // Don't do normal movement while dashing
            } else if (currentTime - this.lastDashTime >= this.dashCooldown) {
                // Start a new dash toward player
                this.isDashing = true;
                this.lastDashTime = currentTime;
                this.dashTimer = this.dashDuration;
                // Target slightly past player position
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    this.dashTargetX = player.x + (dx / distance) * 100;
                    this.dashTargetY = player.y + (dy / distance) * 100;
                }
            }
        }
        
        // Normal chase player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveSpeed = this.speed * speedModifier * (deltaTime / 1000);
            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
}
