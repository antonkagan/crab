import Player from './Player.js';
import Enemy from './Enemy.js';
import Boss from './Boss.js';
import Mutation from './Mutation.js';
import Renderer from './Renderer.js';
import Combat from './Combat.js';
import Surface from './Surface.js';
import Tree from './Tree.js';
import Apple from './Apple.js';

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width = window.innerWidth;
        this.height = canvas.height = window.innerHeight;
        
        this.state = 'menu'; // menu, playing, mutation, gameOver
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.player = null;
        this.enemies = [];
        this.bosses = [];
        this.trees = [];
        this.apples = [];
        this.particles = [];
        this.mutation = new Mutation();
        
        this.evolutionPoints = 0;
        this.applesCollected = 0;
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000; // spawn every 2 seconds
        this.desertDamageTimer = 0;
        this.desertDamageInterval = 5000; // damage every 5 seconds
        
        // Boss system
        this.bossSpawnThresholds = [100, 200, 300];
        this.bossesSpawned = [false, false, false];
        this.bossesKilled = 0;
        
        // Crimson Overlord curse system
        this.isCursed = false;
        this.curseTimer = 0;
        this.curseDamage = 10;
        this.curseInterval = 20000;
        
        // Attack visual effect
        this.attackEffect = null;
        
        // World is 4x the viewport size
        this.worldWidth = this.width * 4;
        this.worldHeight = this.height * 4;
        
        // Camera follows player
        this.camera = { x: 0, y: 0 };
        
        this.keys = {};
        this.setupEventListeners();
        
        this.surface = new Surface(this.worldWidth, this.worldHeight);
        this.renderer = new Renderer(this.ctx, this.width, this.height, this.surface);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.worldWidth = this.width * 4;
            this.worldHeight = this.height * 4;
            this.surface.resize(this.worldWidth, this.worldHeight);
            this.renderer.resize(this.width, this.height);
        });
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Prevent arrow keys from scrolling the page
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
            
            // Super evolution ability keys (1-6)
            if (this.state === 'playing' && this.player) {
                const creatures = ['gorilla', 'crab', 'bee', 'elephant', 'bird', 'fox'];
                if (e.key >= '1' && e.key <= '6') {
                    const creature = creatures[parseInt(e.key) - 1];
                    this.activateAbility(creature);
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Reset all keys when window loses focus (prevents stuck keys)
        window.addEventListener('blur', () => {
            this.keys = {};
        });
        
        // Also reset keys when tab becomes hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.keys = {};
            }
        });
        
        // Mouse click to attack
        this.canvas.addEventListener('click', (e) => {
            if (this.state === 'playing' && this.player) {
                this.playerAttack();
            }
        });
    }
    
    playerAttack() {
        // Check cooldown
        const currentTime = performance.now();
        if (!this.player.canAttack(currentTime)) {
            return; // Still on cooldown
        }
        
        // Record attack time
        this.player.recordAttack(currentTime);
        
        // Determine attack type: Guns (line) or normal (cone)
        const hasGuns = this.player.hasGuns;
        const attackRange = hasGuns ? this.player.gunsRange : this.player.attackRange;
        const lineWidth = 30; // Width of gun line attack
        
        const attackX = this.player.x + this.player.facingX * (this.player.radius + attackRange / 2);
        const attackY = this.player.y + this.player.facingY * (this.player.radius + attackRange / 2);
        
        // Create attack visual effect
        this.createAttackEffect(attackX, attackY, hasGuns, attackRange);
        
        // Helper function to check if entity is hit
        const isEntityHit = (entity) => {
            const dx = entity.x - this.player.x;
            const dy = entity.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return false;
            
            if (hasGuns) {
                // Line attack: check if entity is within line
                // Project entity position onto facing direction
                const dotProduct = dx * this.player.facingX + dy * this.player.facingY;
                
                // Must be in front and within range
                if (dotProduct < 0 || dotProduct > attackRange + entity.radius) {
                    return false;
                }
                
                // Calculate perpendicular distance from line
                const projX = this.player.facingX * dotProduct;
                const projY = this.player.facingY * dotProduct;
                const perpDist = Math.sqrt(
                    Math.pow(dx - projX, 2) + Math.pow(dy - projY, 2)
                );
                
                // Hit if within line width
                return perpDist < lineWidth / 2 + entity.radius;
            } else {
                // Cone attack (original behavior)
                if (distance > this.player.radius + attackRange + entity.radius) {
                    return false;
                }
                const dirX = dx / distance;
                const dirY = dy / distance;
                const dotProduct = dirX * this.player.facingX + dirY * this.player.facingY;
                return dotProduct > 0;
            }
        };
        
        // Calculate damage (with Vanish boost if active)
        let attackDamage = this.player.attack;
        if (this.player.activeAbilities.vanishDamageBoost) {
            const multiplier = this.player.activeAbilities.vanishDamageMultiplier || 3.0;
            attackDamage *= multiplier;
            this.player.activeAbilities.vanishDamageBoost = false;
            this.player.activeAbilities.vanish = false; // End vanish on attack
            this.createParticles(this.player.x, this.player.y, '#FF8C00');
        }
        
        // Check for enemies in attack range
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (isEntityHit(enemy)) {
                // Deal damage to enemy
                enemy.takeDamage(attackDamage);
                
                if (enemy.health <= 0) {
                    this.evolutionPoints += enemy.points;
                    this.createParticles(enemy.x, enemy.y, enemy.color);
                    this.enemies.splice(i, 1);
                    
                    // Check for boss spawn
                    this.checkBossSpawn();
                    
                    // Check if mutation screen should appear
                    if (this.evolutionPoints >= 3 && this.evolutionPoints % 3 === 0) {
                        this.showMutationScreen();
                    }
                }
            }
        }
        
        // Check for bosses in attack range
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];
            
            if (isEntityHit(boss)) {
                boss.takeDamage(attackDamage);
                
                // Golden Crusher spike damage - only hurts player when spikes ability is active
                if (boss.spikesActive) {
                    this.player.takeDamage(boss.spikeDamage);
                    this.createParticles(this.player.x, this.player.y, '#ffd700');
                }
                
                // Crimson Overlord curse - attacking him curses you
                if (boss.hasCurse && !this.isCursed) {
                    this.isCursed = true;
                    this.curseTimer = 0;
                    this.curseDamage = boss.curseDamage;
                    this.curseInterval = boss.curseInterval;
                    this.createParticles(this.player.x, this.player.y, '#dc143c');
                }
                
                if (boss.health <= 0) {
                    this.evolutionPoints += boss.points;
                    this.bossesKilled++;
                    
                    // Lift curse if Crimson Overlord is killed
                    if (boss.hasCurse) {
                        this.isCursed = false;
                        this.curseTimer = 0;
                    }
                    
                    // Big particle explosion for boss death
                    for (let j = 0; j < 5; j++) {
                        this.createParticles(boss.x, boss.y, boss.color);
                    }
                    this.bosses.splice(i, 1);
                    
                    // Check for victory
                    if (this.bossesKilled >= 3) {
                        this.victory();
                        return;
                    }
                    
                    // Check for boss spawn (in case killing boss gives enough points)
                    this.checkBossSpawn();
                }
            }
        }
    }
    
    createAttackEffect(x, y, isGuns = false, range = null) {
        // Create slash arc or gun line effect
        this.attackEffect = {
            x: this.player.x,
            y: this.player.y,
            facingX: this.player.facingX,
            facingY: this.player.facingY,
            range: range || this.player.attackRange,
            life: isGuns ? 0.15 : 0.3, // Guns effect is faster
            isGuns: isGuns
        };
        
        if (isGuns) {
            // Bullet trail particles along the line
            const steps = 10;
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const px = this.player.x + this.player.facingX * (this.player.radius + range * t);
                const py = this.player.y + this.player.facingY * (this.player.radius + range * t);
                this.particles.push({
                    x: px,
                    y: py,
                    vx: (Math.random() - 0.5) * 50,
                    vy: (Math.random() - 0.5) * 50,
                    life: 0.5,
                    decay: 0.03,
                    color: '#ffaa00',
                    size: Math.random() * 4 + 2
                });
            }
        } else {
            // Create particles for melee attack visual
            for (let i = 0; i < 15; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: this.player.facingX * 150 + (Math.random() - 0.5) * 100,
                    vy: this.player.facingY * 150 + (Math.random() - 0.5) * 100,
                    life: 1.0,
                    decay: 0.02,
                    color: '#ffff00',
                    size: Math.random() * 3 + 2
                });
            }
        }
    }
    
    // Super Evolution Ability System
    activateAbility(creature) {
        if (!this.player || !this.player.canUseAbility(creature)) {
            return;
        }
        
        switch (creature) {
            case 'gorilla':
                this.activateGroundPound();
                break;
            case 'crab':
                this.activateIronShell();
                break;
            case 'bee':
                this.activateSwarm();
                break;
            case 'elephant':
                this.activateStampede();
                break;
            case 'bird':
                this.activateFlight();
                break;
            case 'fox':
                this.activateVanish();
                break;
        }
        
        this.player.useAbility(creature);
    }
    
    // Gorilla: Ground Pound - AOE slam dealing 5x damage
    activateGroundPound() {
        const radius = 250;
        const damage = this.player.attack * 5;
        
        this.createGroundPoundEffect();
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius + enemy.radius) {
                enemy.takeDamage(damage);
                this.createParticles(enemy.x, enemy.y, '#8B4513');
                
                if (enemy.health <= 0) {
                    this.evolutionPoints += enemy.points;
                    this.enemies.splice(i, 1);
                }
            }
        }
        
        for (const boss of this.bosses) {
            const dx = boss.x - this.player.x;
            const dy = boss.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius + boss.radius) {
                boss.takeDamage(damage);
                this.createParticles(boss.x, boss.y, '#8B4513');
            }
        }
    }
    
    createGroundPoundEffect() {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * 200,
                vy: Math.sin(angle) * 200,
                life: 1.0,
                decay: 0.025,
                color: '#8B4513',
                size: 8
            });
        }
    }
    
    // Crab: Iron Shell - Invincible for 4 seconds
    activateIronShell() {
        this.player.activeAbilities.ironShell = true;
        this.player.activeAbilities.ironShellTimer = 4000;
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push({
                x: this.player.x + Math.cos(angle) * 30,
                y: this.player.y + Math.sin(angle) * 30,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50,
                life: 1.5,
                decay: 0.02,
                color: '#ff6b6b',
                size: 5
            });
        }
    }
    
    // Bee: Swarm - Summon 10 mini-bees that attack enemies for 8s
    activateSwarm() {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            this.player.beeSwarm.push({
                x: this.player.x + Math.cos(angle) * 40,
                y: this.player.y + Math.sin(angle) * 40,
                timer: 8000,
                angle: angle,
                targetEnemy: null,
                damage: this.player.attack * 0.1
            });
        }
        
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 60,
                y: this.player.y + (Math.random() - 0.5) * 60,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 1.0,
                decay: 0.03,
                color: '#FFD700',
                size: 3
            });
        }
    }
    
    // Elephant: Stampede - Charge forward, knockback + damage
    activateStampede() {
        this.player.activeAbilities.stampede = true;
        this.player.activeAbilities.stampedeTimer = 2000;
        this.player.activeAbilities.stampedeDirection = {
            x: this.player.facingX,
            y: this.player.facingY
        };
        this.player.activeAbilities.stampedeDamage = this.player.attack * 4;
        
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x - this.player.facingX * 30,
                y: this.player.y - this.player.facingY * 30,
                vx: -this.player.facingX * 100 + (Math.random() - 0.5) * 80,
                vy: -this.player.facingY * 100 + (Math.random() - 0.5) * 80,
                life: 1.0,
                decay: 0.02,
                color: '#A0A0A0',
                size: 6
            });
        }
    }
    
    // Bird: Flight - Untargetable + 3x speed for 5s
    activateFlight() {
        this.player.activeAbilities.flight = true;
        this.player.activeAbilities.flightTimer = 5000;
        this.player.activeAbilities.flightSpeedBoost = 3.0;
        
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 40,
                y: this.player.y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 60,
                vy: Math.random() * 50 + 20,
                life: 1.5,
                decay: 0.015,
                color: '#FFFFFF',
                size: 4
            });
        }
    }
    
    // Fox: Vanish - Invisible for 6s, next attack deals 3x damage
    activateVanish() {
        this.player.activeAbilities.vanish = true;
        this.player.activeAbilities.vanishTimer = 6000;
        this.player.activeAbilities.vanishDamageBoost = true;
        this.player.activeAbilities.vanishDamageMultiplier = 3.0;
        
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 40,
                y: this.player.y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                life: 1.0,
                decay: 0.025,
                color: '#FF8C00',
                size: 5
            });
        }
    }
    
    handleStampedeDamage() {
        const damage = this.player.activeAbilities.stampedeDamage || (this.player.attack * 4);
        const knockbackForce = 350;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.radius + enemy.radius + 20) {
                enemy.takeDamage(damage);
                
                if (distance > 0) {
                    enemy.x += (dx / distance) * knockbackForce * (this.deltaTime / 1000);
                    enemy.y += (dy / distance) * knockbackForce * (this.deltaTime / 1000);
                }
                
                this.createParticles(enemy.x, enemy.y, '#A0A0A0');
                
                if (enemy.health <= 0) {
                    this.evolutionPoints += enemy.points;
                    this.enemies.splice(i, 1);
                }
            }
        }
        
        for (const boss of this.bosses) {
            const dx = boss.x - this.player.x;
            const dy = boss.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.radius + boss.radius + 20) {
                boss.takeDamage(damage);
                this.createParticles(boss.x, boss.y, '#A0A0A0');
            }
        }
    }
    
    updateBeeSwarm() {
        if (!this.player.beeSwarm || this.player.beeSwarm.length === 0) return;
        
        const beeSpeed = 400;
        
        for (const bee of this.player.beeSwarm) {
            let nearestEnemy = null;
            let nearestDist = Infinity;
            let isEnemy = false; // Track if target is regular enemy or boss
            
            for (const enemy of this.enemies) {
                const dx = enemy.x - bee.x;
                const dy = enemy.y - bee.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                    isEnemy = true;
                }
            }
            
            for (const boss of this.bosses) {
                const dx = boss.x - bee.x;
                const dy = boss.y - bee.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = boss;
                    isEnemy = false;
                }
            }
            
            if (nearestEnemy) {
                const dx = nearestEnemy.x - bee.x;
                const dy = nearestEnemy.y - bee.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    bee.x += (dx / dist) * beeSpeed * (this.deltaTime / 1000);
                    bee.y += (dy / dist) * beeSpeed * (this.deltaTime / 1000);
                }
                
                if (dist < 25) {
                    const beeDamage = bee.damage || (this.player.attack * 0.1);
                    nearestEnemy.takeDamage(beeDamage * (this.deltaTime / 1000));
                    
                    if (Math.random() < 0.15) {
                        this.createParticles(bee.x, bee.y, '#FFD700');
                    }
                    
                    // Check if enemy died
                    if (nearestEnemy.health <= 0) {
                        if (isEnemy) {
                            // Remove from enemies array
                            const enemyIndex = this.enemies.indexOf(nearestEnemy);
                            if (enemyIndex > -1) {
                                this.evolutionPoints += nearestEnemy.points;
                                this.createParticles(nearestEnemy.x, nearestEnemy.y, nearestEnemy.color);
                                this.enemies.splice(enemyIndex, 1);
                                this.checkBossSpawn();
                            }
                        } else {
                            // It's a boss
                            const bossIndex = this.bosses.indexOf(nearestEnemy);
                            if (bossIndex > -1) {
                                this.evolutionPoints += nearestEnemy.points;
                                this.bossesKilled++;
                                
                                // Lift curse if Crimson Overlord is killed
                                if (nearestEnemy.hasCurse) {
                                    this.isCursed = false;
                                    this.curseTimer = 0;
                                }
                                
                                for (let j = 0; j < 5; j++) {
                                    this.createParticles(nearestEnemy.x, nearestEnemy.y, nearestEnemy.color);
                                }
                                this.bosses.splice(bossIndex, 1);
                                
                                if (this.bossesKilled >= 3) {
                                    this.victory();
                                    return;
                                }
                            }
                        }
                    }
                }
            } else {
                bee.angle += this.deltaTime * 0.003;
                bee.x = this.player.x + Math.cos(bee.angle) * 50;
                bee.y = this.player.y + Math.sin(bee.angle) * 50;
            }
        }
    }
    
    start() {
        this.state = 'playing';
        // Ensure player spawns in center of world (grass zone)
        this.player = new Player(this.worldWidth / 2, this.worldHeight / 2);
        this.camera.x = this.player.x - this.width / 2;
        this.camera.y = this.player.y - this.height / 2;
        this.enemies = [];
        this.bosses = [];
        this.particles = [];
        this.evolutionPoints = 0;
        this.applesCollected = 0;
        this.enemySpawnTimer = 0;
        this.desertDamageTimer = 0;
        this.bossesSpawned = [false, false, false];
        this.bossesKilled = 0;
        this.isCursed = false;
        this.curseTimer = 0;
        this.surface = new Surface(this.worldWidth, this.worldHeight);
        this.renderer.setSurface(this.surface);
        this.spawnTrees();
        this.spawnApples();
        this.updateUI();
        this.gameLoop(0);
    }
    
    spawnTrees() {
        this.trees = [];
        const gridSize = this.surface.gridSize;
        const cols = Math.ceil(this.worldWidth / gridSize);
        const rows = Math.ceil(this.worldHeight / gridSize);
        
        // Spawn trees on grass tiles
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (this.surface.grid[row] && this.surface.grid[row][col] === 'grass') {
                    // Random chance to spawn a tree (15% chance per grass tile)
                    if (Math.random() < 0.15) {
                        // Spawn tree at random position within the grass tile
                        const tileX = col * gridSize;
                        const tileY = row * gridSize;
                        const treeX = tileX + Math.random() * gridSize;
                        const treeY = tileY + Math.random() * gridSize;
                        
                        // Don't spawn tree too close to world center (player spawn)
                        const centerX = this.worldWidth / 2;
                        const centerY = this.worldHeight / 2;
                        const distToCenter = Math.sqrt(
                            Math.pow(treeX - centerX, 2) + Math.pow(treeY - centerY, 2)
                        );
                        
                        // Spawn tree if it's not too close to spawn point
                        if (distToCenter > 100) {
                            this.trees.push(new Tree(treeX, treeY));
                        }
                    }
                }
            }
        }
    }
    
    spawnApples() {
        this.apples = [];
        const gridSize = this.surface.gridSize;
        const cols = Math.ceil(this.worldWidth / gridSize);
        const rows = Math.ceil(this.worldHeight / gridSize);
        
        // Spawn apples on grass tiles
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (this.surface.grid[row] && this.surface.grid[row][col] === 'grass') {
                    // Random chance to spawn an apple (5% chance per grass tile)
                    if (Math.random() < 0.05) {
                        // Spawn apple at random position within the grass tile
                        const tileX = col * this.surface.gridSize;
                        const tileY = row * this.surface.gridSize;
                        const appleX = tileX + Math.random() * gridSize;
                        const appleY = tileY + Math.random() * gridSize;
                        
                        // Don't spawn apple too close to world center (player spawn)
                        const centerX = this.worldWidth / 2;
                        const centerY = this.worldHeight / 2;
                        const distToCenter = Math.sqrt(
                            Math.pow(appleX - centerX, 2) + Math.pow(appleY - centerY, 2)
                        );
                        
                        // Spawn apple if it's not too close to spawn point
                        if (distToCenter > 100) {
                            this.apples.push(new Apple(appleX, appleY));
                        }
                    }
                }
            }
        }
    }
    
    checkBossSpawn() {
        for (let i = 0; i < this.bossSpawnThresholds.length; i++) {
            if (!this.bossesSpawned[i] && this.evolutionPoints >= this.bossSpawnThresholds[i]) {
                this.spawnBoss(i + 1);
                this.bossesSpawned[i] = true;
            }
        }
    }
    
    spawnBoss(bossNumber) {
        // Spawn boss at a random edge of the viewport
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        const viewportLeft = this.camera.x;
        const viewportRight = this.camera.x + this.width;
        const viewportTop = this.camera.y;
        const viewportBottom = this.camera.y + this.height;
        
        switch (side) {
            case 0: // top
                x = viewportLeft + Math.random() * this.width;
                y = viewportTop - 100;
                break;
            case 1: // right
                x = viewportRight + 100;
                y = viewportTop + Math.random() * this.height;
                break;
            case 2: // bottom
                x = viewportLeft + Math.random() * this.width;
                y = viewportBottom + 100;
                break;
            case 3: // left
                x = viewportLeft - 100;
                y = viewportTop + Math.random() * this.height;
                break;
        }
        
        // Clamp to world bounds
        x = Math.max(100, Math.min(this.worldWidth - 100, x));
        y = Math.max(100, Math.min(this.worldHeight - 100, y));
        
        const boss = new Boss(x, y, bossNumber);
        this.bosses.push(boss);
        
        // Create dramatic spawn particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                life: 1.5,
                decay: 0.015,
                color: boss.glowColor,
                size: Math.random() * 6 + 3
            });
        }
    }
    
    victory() {
        this.state = 'gameOver';
        document.getElementById('game-over-title').textContent = '🏆 Victory!';
        document.getElementById('game-over-message').textContent = 'You defeated all 3 bosses and conquered the crab world!';
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    }
    
    gameLoop(timestamp) {
        if (this.state === 'gameOver' || this.state === 'menu') {
            return;
        }
        
        this.deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (this.state === 'playing') {
            this.update();
            this.render();
        }
        
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    update() {
        // Get current surface for player
        const playerSurface = this.surface.getSurfaceAt(this.player.x, this.player.y);
        const speedModifier = this.surface.getSpeedModifier(playerSurface);
        
        // Update player ability cooldowns
        this.player.updateAbilityCooldowns(this.deltaTime);
        
        // Update player with surface speed modifier
        let moveX = (this.keys['a'] || this.keys['arrowleft'] ? -1 : 0) + 
                     (this.keys['d'] || this.keys['arrowright'] ? 1 : 0);
        let moveY = (this.keys['w'] || this.keys['arrowup'] ? -1 : 0) + 
                     (this.keys['s'] || this.keys['arrowdown'] ? 1 : 0);
        
        // Bird Flight: 3x speed
        let playerSpeedModifier = speedModifier;
        if (this.player.activeAbilities.flight) {
            playerSpeedModifier *= (this.player.activeAbilities.flightSpeedBoost || 3.0);
        }
        
        // Elephant Stampede: Override movement
        if (this.player.activeAbilities.stampede) {
            moveX = this.player.activeAbilities.stampedeDirection.x;
            moveY = this.player.activeAbilities.stampedeDirection.y;
            playerSpeedModifier *= 3;
            this.handleStampedeDamage();
        }
        
        // Store old position for collision checking
        const oldPlayerX = this.player.x;
        const oldPlayerY = this.player.y;
        
        this.player.update(moveX, moveY, this.deltaTime, this.worldWidth, this.worldHeight, playerSpeedModifier);
        
        // Update bee swarm
        this.updateBeeSwarm();
        
        // Check tree collision for player
        for (const tree of this.trees) {
            if (tree.checkCollision(this.player.x, this.player.y, this.player.radius)) {
                // Revert player position if colliding with tree
                this.player.x = oldPlayerX;
                this.player.y = oldPlayerY;
                break;
            }
        }
        
        // Check apple collection
        for (let i = this.apples.length - 1; i >= 0; i--) {
            const apple = this.apples[i];
            if (apple.checkCollision(this.player.x, this.player.y, this.player.radius)) {
                // Collect apple - restore health
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 10);
                apple.collected = true;
                this.createParticles(apple.x, apple.y, '#ff6b6b');
                this.apples.splice(i, 1);
                
                // Increment apple collection counter
                this.applesCollected++;
                
                // Check if 10 apples collected - trigger evolution
                if (this.applesCollected >= 10) {
                    this.applesCollected = 0; // Reset counter
                    this.showMutationScreen();
                }
            }
        }
        
        // Update camera to follow player
        this.camera.x = this.player.x - this.width / 2;
        this.camera.y = this.player.y - this.height / 2;
        
        // Clamp camera to world bounds
        this.camera.x = Math.max(0, Math.min(this.worldWidth - this.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.worldHeight - this.height, this.camera.y));
        
        // Apply desert damage
        if (playerSurface === 'desert') {
            this.desertDamageTimer += this.deltaTime;
            if (this.desertDamageTimer >= this.desertDamageInterval) {
                this.player.takeDamage(5);
                this.desertDamageTimer = 0;
                if (this.player.health <= 0) {
                    this.gameOver('You perished in the desert!');
                }
            }
        } else {
            this.desertDamageTimer = 0;
        }
        
        // Apply Crimson Overlord curse damage
        if (this.isCursed) {
            this.curseTimer += this.deltaTime;
            if (this.curseTimer >= this.curseInterval) {
                this.player.takeDamage(this.curseDamage);
                this.curseTimer = 0;
                this.createParticles(this.player.x, this.player.y, '#dc143c');
                if (this.player.health <= 0) {
                    this.gameOver('The Crimson curse consumed you!');
                }
            }
        }
        
        // Spawn enemies
        this.enemySpawnTimer += this.deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Check if Void Emperor's buff is active
        let enemyBuffActive = false;
        let enemyBuffMultiplier = 1.0;
        for (const boss of this.bosses) {
            if (boss.buffActive) {
                enemyBuffActive = true;
                enemyBuffMultiplier = boss.buffMultiplier;
                break;
            }
        }
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Remove enemies that are too far from player (outside viewport + buffer)
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > Math.max(this.width, this.height) * 1.5) {
                this.enemies.splice(i, 1);
                continue;
            }
            
            const enemySurface = this.surface.getSurfaceAt(enemy.x, enemy.y);
            let enemySpeedModifier = this.surface.getSpeedModifier(enemySurface);
            
            // Apply Void Emperor buff to enemy speed
            if (enemyBuffActive) {
                enemySpeedModifier *= 1.5;
            }
            
            // Store old position for collision checking
            const oldEnemyX = enemy.x;
            const oldEnemyY = enemy.y;
            
            enemy.update(this.player, this.deltaTime, enemySpeedModifier, this.worldWidth, this.worldHeight, this.trees);
            
            // Check tree collision for enemy - push them out instead of stopping
            for (const tree of this.trees) {
                if (tree.checkCollision(enemy.x, enemy.y, enemy.radius)) {
                    // Push enemy away from tree
                    const pushDx = enemy.x - tree.x;
                    const pushDy = enemy.y - tree.y;
                    const pushDist = Math.sqrt(pushDx * pushDx + pushDy * pushDy);
                    if (pushDist > 0) {
                        const overlap = tree.radius + enemy.radius - pushDist;
                        enemy.x += (pushDx / pushDist) * (overlap + 2);
                        enemy.y += (pushDy / pushDist) * (overlap + 2);
                    }
                }
            }
            
            // Combat: Player must click to attack. Enemies can still damage player on collision.
            if (enemy.behavior === 'attack') {
                // Attacking enemies damage player on collision (but player doesn't auto-attack back)
                if (Combat.checkCollision(this.player, enemy)) {
                    // Iron Shell: invincible, Flight: untargetable
                    if (this.player.activeAbilities.ironShell || this.player.activeAbilities.flight) {
                        continue; // Skip damage
                    }
                    
                    const currentTime = performance.now();
                    // Check enemy attack cooldown
                    if (enemy.canAttack(currentTime)) {
                        enemy.recordAttack(currentTime);
                        // Enemy attacks player (buffed by Void Emperor if active)
                        const damage = enemyBuffActive ? enemy.attack * enemyBuffMultiplier : enemy.attack;
                        this.player.takeDamage(damage);
                        if (this.player.health <= 0) {
                            this.gameOver('You were defeated!');
                        }
                    }
                }
            }
            // Fleeing crabs no longer auto-caught - must click to attack them too
        }
        
        // Update bosses
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const boss = this.bosses[i];
            
            const bossSurface = this.surface.getSurfaceAt(boss.x, boss.y);
            const bossSpeedModifier = this.surface.getSpeedModifier(bossSurface);
            
            // Store old position for collision checking
            const oldBossX = boss.x;
            const oldBossY = boss.y;
            
            boss.update(this.player, this.deltaTime, bossSpeedModifier);
            
            // Check tree collision for boss
            if (boss.isDashing && boss.canDash) {
                // Golden Crusher dash destroys trees!
                for (let t = this.trees.length - 1; t >= 0; t--) {
                    const tree = this.trees[t];
                    if (tree.checkCollision(boss.x, boss.y, boss.radius + 20)) {
                        // Destroy tree with particles
                        this.createParticles(tree.x, tree.y, '#8B4513');
                        this.createParticles(tree.x, tree.y, '#228B22');
                        this.trees.splice(t, 1);
                    }
                }
            } else {
                // Normal bosses are blocked by trees
                for (const tree of this.trees) {
                    if (tree.checkCollision(boss.x, boss.y, boss.radius)) {
                        boss.x = oldBossX;
                        boss.y = oldBossY;
                        break;
                    }
                }
            }
            
            // Boss combat - bosses always attack on collision
            if (Combat.checkCollision(this.player, boss)) {
                // Iron Shell: invincible, Flight: untargetable
                if (!this.player.activeAbilities.ironShell && !this.player.activeAbilities.flight) {
                    const currentTime = performance.now();
                    if (boss.canAttack(currentTime)) {
                        boss.recordAttack(currentTime);
                        this.player.takeDamage(boss.attack);
                        if (this.player.health <= 0) {
                            this.gameOver(`You were crushed by ${boss.name}!`);
                        }
                    }
                }
            }
            
            // Handle Void Emperor hurricanes
            if (boss.hurricanes && boss.hurricanes.length > 0) {
                for (const hurricane of boss.hurricanes) {
                    const dx = hurricane.x - this.player.x;
                    const dy = hurricane.y - this.player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Pull player toward hurricane center
                    if (distance < hurricane.radius * 2 && distance > 0) {
                        const pullStrength = boss.hurricanePullStrength * (1 - distance / (hurricane.radius * 2));
                        const pullX = (dx / distance) * pullStrength * (this.deltaTime / 1000);
                        const pullY = (dy / distance) * pullStrength * (this.deltaTime / 1000);
                        this.player.x += pullX;
                        this.player.y += pullY;
                    }
                    
                    // Damage player if inside hurricane
                    if (distance < hurricane.radius) {
                        const damage = boss.hurricaneDamage * (this.deltaTime / 1000);
                        this.player.takeDamage(damage);
                        // Create wind particles
                        if (Math.random() < 0.3) {
                            this.createParticles(this.player.x, this.player.y, '#9b59b6');
                        }
                        if (this.player.health <= 0) {
                            this.gameOver(`You were consumed by ${boss.name}'s hurricane!`);
                        }
                    }
                }
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx * (this.deltaTime / 1000);
            particle.y += particle.vy * (this.deltaTime / 1000);
            particle.life -= particle.decay;
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update attack effect
        if (this.attackEffect) {
            this.attackEffect.life -= this.deltaTime / 1000;
            if (this.attackEffect.life <= 0) {
                this.attackEffect = null;
            }
        }
        
        // Game only ends when player dies (health reaches 0)
        // Carcinization is allowed - you can continue playing as a crab!
        
        this.updateUI();
    }
    
    spawnEnemy() {
        // Spawn enemies at edges of viewport (in world coordinates)
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        const viewportLeft = this.camera.x;
        const viewportRight = this.camera.x + this.width;
        const viewportTop = this.camera.y;
        const viewportBottom = this.camera.y + this.height;
        
        switch (side) {
            case 0: // top
                x = viewportLeft + Math.random() * this.width;
                y = viewportTop - 50;
                break;
            case 1: // right
                x = viewportRight + 50;
                y = viewportTop + Math.random() * this.height;
                break;
            case 2: // bottom
                x = viewportLeft + Math.random() * this.width;
                y = viewportBottom + 50;
                break;
            case 3: // left
                x = viewportLeft - 50;
                y = viewportTop + Math.random() * this.height;
                break;
        }
        
        // Clamp to world bounds
        x = Math.max(0, Math.min(this.worldWidth, x));
        y = Math.max(0, Math.min(this.worldHeight, y));
        
        // Randomly assign behavior: 30% attack, 70% flee
        const behavior = Math.random() < 0.3 ? 'attack' : 'flee';
        this.enemies.push(new Enemy(x, y, behavior));
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1.0,
                decay: 0.02,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    showMutationScreen() {
        this.state = 'mutation';
        const mutationScreen = document.getElementById('mutation-screen');
        const optionsDiv = document.getElementById('mutation-options');
        mutationScreen.classList.remove('hidden');
        
        // Update mutation screen progress bars
        const creatures = ['gorilla', 'crab', 'bee', 'elephant', 'bird', 'fox'];
        for (const creature of creatures) {
            const progress = this.player.evolutionProgress[creature] || 0;
            const evolved = this.player.superEvolutions[creature];
            
            const fillEl = document.getElementById(`mut-prog-${creature}`);
            const pctEl = document.getElementById(`mut-pct-${creature}`);
            
            if (fillEl) {
                fillEl.style.width = `${Math.min(progress, 100)}%`;
            }
            
            if (pctEl) {
                if (evolved) {
                    pctEl.textContent = '✓';
                    pctEl.style.color = '#4CAF50';
                } else {
                    pctEl.textContent = `${Math.floor(progress)}%`;
                    pctEl.style.color = progress >= 100 ? '#4CAF50' : '#ccc';
                }
            }
        }
        
        const options = this.mutation.getRandomOptions(3, this.player);
        optionsDiv.innerHTML = '';
        
        // Helper function to update mutation screen progress bars
        const updateMutationProgressBars = (previewCreatureTypes = null) => {
            for (const creature of creatures) {
                const currentProgress = this.player.evolutionProgress[creature] || 0;
                const evolved = this.player.superEvolutions[creature];
                
                // Calculate preview progress if hovering
                let displayProgress = currentProgress;
                let isPreview = false;
                if (previewCreatureTypes && previewCreatureTypes.includes(creature)) {
                    displayProgress = Math.min(currentProgress + 10, 100);
                    isPreview = true;
                }
                
                const fillEl = document.getElementById(`mut-prog-${creature}`);
                const pctEl = document.getElementById(`mut-pct-${creature}`);
                const itemEl = fillEl ? fillEl.closest('.mut-prog-item') : null;
                
                if (fillEl) {
                    fillEl.style.width = `${Math.min(displayProgress, 100)}%`;
                }
                
                if (pctEl) {
                    if (evolved) {
                        pctEl.textContent = '✓';
                        pctEl.style.color = '#4CAF50';
                    } else if (isPreview) {
                        pctEl.textContent = `${Math.floor(currentProgress)}% → ${Math.floor(displayProgress)}%`;
                        pctEl.style.color = '#ffa500';
                    } else {
                        pctEl.textContent = `${Math.floor(currentProgress)}%`;
                        pctEl.style.color = currentProgress >= 100 ? '#4CAF50' : '#ccc';
                    }
                }
                
                if (itemEl) {
                    if (isPreview) {
                        itemEl.classList.add('preview-highlight');
                    } else {
                        itemEl.classList.remove('preview-highlight');
                    }
                }
            }
        };
        
        options.forEach((option, index) => {
            const div = document.createElement('div');
            div.className = 'mutation-option';
            
            // Calculate what level this mutation will be
            const currentLevel = this.player.getMutationLevel(option.name);
            const nextLevel = currentLevel + 1;
            const levelMultiplier = 1 + (nextLevel - 1) * 0.5;
            
            // Special naming for Arms -> Guns
            let displayName = option.name;
            let displayDesc = option.description;
            if (option.name === 'Arms') {
                if (nextLevel >= 2) {
                    displayName = 'Guns';
                    const gunsLevel = nextLevel - 1;
                    const gunsRange = 150 + (gunsLevel - 1) * 50;
                    displayDesc = `Transform your arms into guns! Ranged line attack with ${gunsRange}px range.`;
                }
            }
            
            // Calculate scaled stats for display
            const scaledHealth = option.health ? Math.floor(option.health * levelMultiplier) : 0;
            const scaledSpeed = option.speed ? Math.floor(option.speed * levelMultiplier) : 0;
            const scaledAttack = option.attack ? Math.floor(option.attack * levelMultiplier) : 0;
            
            // Show which creature types this mutation contributes to
            const creatureEmojis = {
                gorilla: '🦍', crab: '🦀', bee: '🐝', elephant: '🐘', bird: '🐦', fox: '🦊'
            };
            let creatureHint = '';
            if (option.creatureTypes && option.creatureTypes.length > 0) {
                const emojis = option.creatureTypes.map(c => creatureEmojis[c]).join(' ');
                creatureHint = `<p class="creature-hint">Evolution: ${emojis} +10%</p>`;
            }
            
            div.innerHTML = `
                <h3>${displayName} ${nextLevel > 1 ? `Lv.${nextLevel}` : ''}</h3>
                <p>${displayDesc}</p>
                <p>Health: +${scaledHealth} | Speed: +${scaledSpeed} | Attack: +${scaledAttack}</p>
                ${creatureHint}
                ${option.crabRisk ? `<p class="crab-risk">⚠️ Crab Risk: +${option.crabRisk}%</p>` : ''}
            `;
            
            // Hover events to preview evolution progress
            div.addEventListener('mouseenter', () => {
                updateMutationProgressBars(option.creatureTypes || []);
            });
            
            div.addEventListener('mouseleave', () => {
                updateMutationProgressBars(null);
            });
            
            div.addEventListener('click', () => {
                this.selectMutation(option);
            });
            optionsDiv.appendChild(div);
        });
    }
    
    selectMutation(mutation) {
        this.player.applyMutation(mutation);
        this.mutation.applyMutation(mutation);
        
        document.getElementById('mutation-screen').classList.add('hidden');
        
        // Check if any super evolution is ready
        const readyEvolutions = this.player.getReadySuperEvolutions();
        if (readyEvolutions.length > 0) {
            this.showSuperEvolutionScreen(readyEvolutions[0]);
        } else {
            this.state = 'playing';
            this.gameLoop(performance.now());
        }
    }
    
    showSuperEvolutionScreen(creature) {
        this.state = 'superEvolution';
        this.pendingSuperEvolution = creature;
        
        const superEvolutionData = {
            gorilla: {
                emoji: '🦍',
                name: 'Super Gorilla',
                description: 'You have become a mighty gorilla! Raw strength courses through your veins.',
                abilityName: 'Ground Pound',
                abilityDesc: 'Slam the ground dealing 5x damage to all nearby enemies.',
                key: '1'
            },
            crab: {
                emoji: '🦀',
                name: 'Super Crab',
                description: 'Your shell has hardened to perfection! Nothing can harm you now.',
                abilityName: 'Iron Shell',
                abilityDesc: 'Become invincible for 4 seconds.',
                key: '2'
            },
            bee: {
                emoji: '🐝',
                name: 'Super Bee',
                description: 'The hive mind awakens! Command your swarm to attack.',
                abilityName: 'Swarm',
                abilityDesc: 'Summon 10 bees that attack enemies for 8 seconds.',
                key: '3'
            },
            elephant: {
                emoji: '🐘',
                name: 'Super Elephant',
                description: 'Unstoppable force! Charge through anything in your path.',
                abilityName: 'Stampede',
                abilityDesc: 'Charge forward dealing 4x damage and knocking back enemies.',
                key: '4'
            },
            bird: {
                emoji: '🐦',
                name: 'Super Bird',
                description: 'Take to the skies! Enemies cannot reach you up there.',
                abilityName: 'Flight',
                abilityDesc: 'Fly for 5 seconds - untargetable and 3x speed.',
                key: '5'
            },
            fox: {
                emoji: '🦊',
                name: 'Super Fox',
                description: 'Master of stealth! Strike from the shadows.',
                abilityName: 'Vanish',
                abilityDesc: 'Turn invisible for 6 seconds. Next attack deals 3x damage.',
                key: '6'
            }
        };
        
        const data = superEvolutionData[creature];
        
        document.getElementById('super-creature-icon').textContent = data.emoji;
        document.getElementById('super-creature-name').textContent = data.name;
        document.getElementById('super-creature-description').textContent = data.description;
        document.getElementById('super-ability-name').textContent = data.abilityName;
        document.getElementById('super-ability-description').textContent = data.abilityDesc;
        document.getElementById('super-ability-key').textContent = `Press [${data.key}] to activate`;
        
        document.getElementById('super-evolution-screen').classList.remove('hidden');
        
        document.getElementById('evolve-button').onclick = () => this.confirmSuperEvolution();
        document.getElementById('decline-button').onclick = () => this.declineSuperEvolution();
    }
    
    confirmSuperEvolution() {
        if (this.pendingSuperEvolution) {
            this.player.activateSuperEvolution(this.pendingSuperEvolution);
            
            // Check for carcinization (all 6 super evolutions)
            if (this.player.hasAllSuperEvolutions()) {
                document.getElementById('super-evolution-screen').classList.add('hidden');
                this.carcinizationEnding();
                return;
            }
        }
        
        document.getElementById('super-evolution-screen').classList.add('hidden');
        document.getElementById('ability-bar').classList.remove('hidden');
        
        const readyEvolutions = this.player.getReadySuperEvolutions();
        if (readyEvolutions.length > 0) {
            this.showSuperEvolutionScreen(readyEvolutions[0]);
        } else {
            this.state = 'playing';
            this.gameLoop(performance.now());
        }
    }
    
    declineSuperEvolution() {
        document.getElementById('super-evolution-screen').classList.add('hidden');
        
        const readyEvolutions = this.player.getReadySuperEvolutions();
        if (readyEvolutions.length > 0) {
            this.showSuperEvolutionScreen(readyEvolutions[0]);
        } else {
            this.state = 'playing';
            this.gameLoop(performance.now());
        }
    }
    
    carcinizationEnding() {
        this.state = 'gameOver';
        document.getElementById('game-over-title').textContent = '🦀 CARCINIZATION 🦀';
        document.getElementById('game-over-message').textContent = 
            'You have achieved ultimate evolution! All creatures eventually evolve into crabs. ' +
            'You have become the ULTIMATE CRAB and transcended this mortal plane.';
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('ability-bar').classList.add('hidden');
    }
    
    gameOver(message) {
        this.state = 'gameOver';
        document.getElementById('game-over-title').textContent = 'Game Over';
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    }
    
    restart() {
        this.state = 'menu';
        this.player = null;
        this.enemies = [];
        this.bosses = [];
        this.trees = [];
        this.apples = [];
        this.particles = [];
        this.evolutionPoints = 0;
        this.applesCollected = 0;
        this.desertDamageTimer = 0;
        this.bossesSpawned = [false, false, false];
        this.bossesKilled = 0;
        this.isCursed = false;
        this.curseTimer = 0;
        this.mutation = new Mutation();
        this.worldWidth = this.width * 4;
        this.worldHeight = this.height * 4;
        this.surface = new Surface(this.worldWidth, this.worldHeight);
        this.renderer.setSurface(this.surface);
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    }
    
    updateUI() {
        if (this.player) {
            const healthPercent = (this.player.health / this.player.maxHealth) * 100;
            document.getElementById('health-fill').style.width = healthPercent + '%';
            document.getElementById('health-text').textContent = 
                `${Math.max(0, Math.floor(this.player.health))}/${this.player.maxHealth}`;
            document.getElementById('points').textContent = this.evolutionPoints;
            document.getElementById('apples-count').textContent = this.applesCollected;
            document.getElementById('bosses-killed').textContent = this.bossesKilled;
            
            // Update surface indicator
            const playerSurface = this.surface.getSurfaceAt(this.player.x, this.player.y);
            const surfaceTypeElement = document.getElementById('surface-type');
            surfaceTypeElement.textContent = playerSurface.charAt(0).toUpperCase() + playerSurface.slice(1);
            surfaceTypeElement.className = playerSurface;
            
            // Update evolution progress bars
            const creatures = ['gorilla', 'crab', 'bee', 'elephant', 'bird', 'fox'];
            for (const creature of creatures) {
                const progress = this.player.evolutionProgress[creature] || 0;
                const evolved = this.player.superEvolutions[creature];
                
                const fillEl = document.getElementById(`evo-${creature}`);
                const pctEl = document.getElementById(`evo-pct-${creature}`);
                const checkEl = document.getElementById(`check-${creature}`);
                const barEl = fillEl ? fillEl.parentElement : null;
                
                if (fillEl) {
                    fillEl.style.width = `${Math.min(progress, 100)}%`;
                }
                
                if (pctEl) {
                    if (evolved) {
                        pctEl.textContent = '✓';
                        pctEl.style.color = '#4CAF50';
                    } else {
                        pctEl.textContent = `${Math.floor(progress)}%`;
                        pctEl.style.color = progress >= 100 ? '#4CAF50' : '#fff';
                    }
                }
                
                if (barEl) {
                    if (progress >= 100 && !evolved) {
                        barEl.classList.add('evolution-ready');
                    } else {
                        barEl.classList.remove('evolution-ready');
                    }
                }
                
                if (checkEl) {
                    checkEl.textContent = evolved ? '✓' : '';
                }
            }
            
            // Update ability bar
            for (const creature of creatures) {
                const slotEl = document.getElementById(`ability-${creature}`);
                const cdEl = document.getElementById(`cd-${creature}`);
                const evolved = this.player.superEvolutions[creature];
                const cooldown = this.player.abilityCooldowns[creature];
                const maxCooldown = this.player.abilityMaxCooldowns[creature];
                
                if (slotEl) {
                    if (evolved) {
                        slotEl.classList.add('unlocked');
                        if (cooldown <= 0) {
                            slotEl.classList.add('ready');
                        } else {
                            slotEl.classList.remove('ready');
                        }
                    } else {
                        slotEl.classList.remove('unlocked', 'ready');
                    }
                }
                
                if (cdEl) {
                    if (evolved && cooldown > 0) {
                        cdEl.textContent = Math.ceil(cooldown / 1000) + 's';
                        cdEl.style.height = `${(cooldown / maxCooldown) * 100}%`;
                    } else {
                        cdEl.textContent = '';
                        cdEl.style.height = '0%';
                    }
                }
            }
            
            // Show ability bar if any super evolution is unlocked
            const hasAnySuperEvolution = Object.values(this.player.superEvolutions).some(v => v);
            if (hasAnySuperEvolution) {
                document.getElementById('ability-bar').classList.remove('hidden');
            }
        }
    }
    
    render() {
        this.renderer.setCamera(this.camera);
        this.renderer.clear();
        this.trees.forEach(tree => this.renderer.renderTree(tree));
        this.apples.forEach(apple => this.renderer.renderApple(apple));
        this.renderer.renderPlayer(this.player, this.isCursed, this.curseTimer, this.curseInterval);
        this.enemies.forEach(enemy => this.renderer.renderEnemy(enemy));
        this.bosses.forEach(boss => this.renderer.renderBoss(boss));
        this.particles.forEach(particle => this.renderer.renderParticle(particle));
        
        // Render attack effect
        if (this.attackEffect) {
            this.renderer.renderAttackEffect(this.attackEffect);
        }
    }
}

