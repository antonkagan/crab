export default class Renderer {
    constructor(ctx, width, height, surface = null) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.surface = surface;
        this.camera = { x: 0, y: 0 };
    }
    
    setSurface(surface) {
        this.surface = surface;
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.camera.x,
            y: worldY - this.camera.y
        };
    }
    
    clear() {
        if (this.surface) {
            // Render surface grid
            this.renderSurface();
        } else {
            // Fallback to black background
            this.ctx.fillStyle = '#0f0f1e';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    renderSurface() {
        const gridSize = this.surface.gridSize;
        const subCellSize = 10; // Render in small chunks for very smooth blending
        
        // Calculate which grid cells are visible in viewport (with some margin)
        const startX = Math.floor(this.camera.x / subCellSize) * subCellSize;
        const endX = Math.ceil((this.camera.x + this.width) / subCellSize) * subCellSize;
        const startY = Math.floor(this.camera.y / subCellSize) * subCellSize;
        const endY = Math.ceil((this.camera.y + this.height) / subCellSize) * subCellSize;
        
        for (let worldY = startY; worldY <= endY; worldY += subCellSize) {
            for (let worldX = startX; worldX <= endX; worldX += subCellSize) {
                // Get blended color at center of this sub-cell
                const centerX = worldX + subCellSize / 2;
                const centerY = worldY + subCellSize / 2;
                const color = this.surface.getBlendedColor(centerX, centerY);
                
                const screen = this.worldToScreen(worldX, worldY);
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(screen.x, screen.y, subCellSize + 1, subCellSize + 1); // +1 to avoid gaps
            }
        }
    }
    
    renderPlayer(player, isCursed = false, curseTimer = 0, curseInterval = 20000) {
        if (!player) return;
        
        const screen = this.worldToScreen(player.x, player.y);
        const features = player.getVisualFeatures();
        
        // Draw curse effect if cursed
        if (isCursed) {
            // Pulsing crimson ring that intensifies as curse tick approaches
            const curseProgress = curseTimer / curseInterval;
            const pulseIntensity = 0.3 + curseProgress * 0.5;
            const pulseSize = Math.sin(Date.now() * 0.01) * 3 + 5;
            
            this.ctx.strokeStyle = `rgba(220, 20, 60, ${pulseIntensity})`;
            this.ctx.lineWidth = 3 + curseProgress * 3;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, player.radius + pulseSize + 5, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Inner glow
            const curseGradient = this.ctx.createRadialGradient(
                screen.x, screen.y, player.radius,
                screen.x, screen.y, player.radius + 15
            );
            curseGradient.addColorStop(0, `rgba(220, 20, 60, ${pulseIntensity * 0.5})`);
            curseGradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = curseGradient;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, player.radius + 15, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw main body
        this.ctx.save();
        
        // If player has a creature form, draw it instead of the default circle
        if (player.currentCreatureForm) {
            this.drawCreatureForm(player.currentCreatureForm, screen, player.radius, features.color);
        } else {
            this.ctx.fillStyle = features.color;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, player.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw shell if present
        if (features.hasShell) {
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, player.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw wings
        if (features.hasWings) {
            const wingFlap = Math.sin(Date.now() * 0.015) * 0.4; // Animated flapping
            
            // Left wing
            this.ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.ellipse(
                screen.x - player.radius * 0.8, 
                screen.y - player.radius * 0.3,
                player.radius * 1.2, 
                player.radius * 0.5, 
                -0.5 + wingFlap, 
                0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Right wing
            this.ctx.beginPath();
            this.ctx.ellipse(
                screen.x + player.radius * 0.8, 
                screen.y - player.radius * 0.3,
                player.radius * 1.2, 
                player.radius * 0.5, 
                0.5 - wingFlap, 
                0, Math.PI * 2
            );
            this.ctx.fill();
            
            // Wing details (veins)
            this.ctx.strokeStyle = 'rgba(150, 180, 220, 0.5)';
            this.ctx.lineWidth = 1;
            // Left wing veins
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x - player.radius * 0.5, screen.y - player.radius * 0.2);
            this.ctx.lineTo(screen.x - player.radius * 1.8, screen.y - player.radius * 0.5);
            this.ctx.stroke();
            // Right wing veins
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x + player.radius * 0.5, screen.y - player.radius * 0.2);
            this.ctx.lineTo(screen.x + player.radius * 1.8, screen.y - player.radius * 0.5);
            this.ctx.stroke();
        }
        
        // Draw spikes
        if (features.hasSpikes) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const x1 = screen.x + Math.cos(angle) * player.radius;
                const y1 = screen.y + Math.sin(angle) * player.radius;
                const x2 = screen.x + Math.cos(angle) * (player.radius + 8);
                const y2 = screen.y + Math.sin(angle) * (player.radius + 8);
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
        
        // Draw claws
        if (features.hasClaws) {
            this.ctx.fillStyle = '#ff6b6b';
            const clawSize = 8;
            // Left claw
            this.drawClaw(screen.x - player.radius * 0.7, screen.y, clawSize, -Math.PI / 4);
            // Right claw
            this.drawClaw(screen.x + player.radius * 0.7, screen.y, clawSize, Math.PI / 4);
        }
        
        // Draw tentacles
        if (features.hasTentacles) {
            this.ctx.strokeStyle = features.color;
            this.ctx.lineWidth = 3;
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6;
                const x1 = screen.x + Math.cos(angle) * player.radius;
                const y1 = screen.y + Math.sin(angle) * player.radius;
                const x2 = screen.x + Math.cos(angle) * (player.radius + 15);
                const y2 = screen.y + Math.sin(angle) * (player.radius + 15);
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
        
        // Draw arms
        if (features.hasArms) {
            const armColor = features.color;
            this.ctx.strokeStyle = armColor;
            this.ctx.fillStyle = armColor;
            this.ctx.lineWidth = 4;
            // Left arm
            this.drawArm(screen.x - player.radius * 0.8, screen.y, screen.x - player.radius * 1.8, screen.y - 10);
            // Right arm
            this.drawArm(screen.x + player.radius * 0.8, screen.y, screen.x + player.radius * 1.8, screen.y - 10);
        }
        
        // Draw legs
        if (features.hasLegs) {
            const legColor = features.color;
            this.ctx.strokeStyle = legColor;
            this.ctx.fillStyle = legColor;
            this.ctx.lineWidth = 4;
            // Left leg
            this.drawLeg(screen.x - player.radius * 0.5, screen.y + player.radius * 0.5, screen.x - player.radius * 0.8, screen.y + player.radius * 1.5);
            // Right leg
            this.drawLeg(screen.x + player.radius * 0.5, screen.y + player.radius * 0.5, screen.x + player.radius * 0.8, screen.y + player.radius * 1.5);
        }
        
        // Draw tail
        if (features.hasTail) {
            const tailWag = Math.sin(Date.now() * 0.008) * 0.3; // Animated wagging
            this.ctx.strokeStyle = features.color;
            this.ctx.fillStyle = features.color;
            this.ctx.lineWidth = 6;
            this.ctx.lineCap = 'round';
            
            // Draw curved tail with animation
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x - player.radius * 0.5, screen.y + player.radius * 0.3);
            this.ctx.quadraticCurveTo(
                screen.x - player.radius * 1.5 + tailWag * 20, 
                screen.y + player.radius * 0.5,
                screen.x - player.radius * 1.8 + tailWag * 30, 
                screen.y - player.radius * 0.2
            );
            this.ctx.stroke();
            
            // Tail tip
            this.ctx.beginPath();
            this.ctx.arc(
                screen.x - player.radius * 1.8 + tailWag * 30, 
                screen.y - player.radius * 0.2, 
                4, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Draw eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - 5, screen.y - 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + 5, screen.y - 5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - 5, screen.y - 5, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + 5, screen.y - 5, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw super evolution visual effects
        if (player.superEvolutions) {
            this.renderSuperEvolutionEffects(player, screen);
        }
        
        // Draw active ability effects
        if (player.activeAbilities) {
            // Iron Shell - golden invincibility shield
            if (player.activeAbilities.ironShell) {
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, player.radius + 10, 0, Math.PI * 2);
                this.ctx.stroke();
                
                const shellGradient = this.ctx.createRadialGradient(
                    screen.x, screen.y, player.radius,
                    screen.x, screen.y, player.radius + 20
                );
                shellGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
                shellGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = shellGradient;
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, player.radius + 20, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Flight - sky blue aura
            if (player.activeAbilities.flight) {
                const flightGradient = this.ctx.createRadialGradient(
                    screen.x, screen.y, player.radius,
                    screen.x, screen.y, player.radius + 25
                );
                flightGradient.addColorStop(0, 'rgba(135, 206, 235, 0.4)');
                flightGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = flightGradient;
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, player.radius + 25, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Small feather particles around player
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                for (let i = 0; i < 6; i++) {
                    const angle = (Date.now() * 0.002 + i * Math.PI / 3) % (Math.PI * 2);
                    const dist = player.radius + 15 + Math.sin(Date.now() * 0.005 + i) * 5;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        screen.x + Math.cos(angle) * dist,
                        screen.y + Math.sin(angle) * dist,
                        2, 0, Math.PI * 2
                    );
                    this.ctx.fill();
                }
            }
            
            // Vanish - transparency effect (already handled by globalAlpha in render)
            if (player.activeAbilities.vanish) {
                this.ctx.strokeStyle = 'rgba(255, 140, 0, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, player.radius + 5, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Stampede - dust trail
            if (player.activeAbilities.stampede) {
                this.ctx.strokeStyle = '#A0A0A0';
                this.ctx.lineWidth = 4;
                this.ctx.setLineDash([10, 5]);
                this.ctx.beginPath();
                const trailX = screen.x - player.activeAbilities.stampedeDirection.x * 50;
                const trailY = screen.y - player.activeAbilities.stampedeDirection.y * 50;
                this.ctx.moveTo(trailX, trailY);
                this.ctx.lineTo(trailX - player.activeAbilities.stampedeDirection.x * 50, trailY - player.activeAbilities.stampedeDirection.y * 50);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
        
        // Draw bee swarm
        if (player.beeSwarm && player.beeSwarm.length > 0) {
            this.renderBeeSwarm(player.beeSwarm);
        }
        
        this.ctx.restore();
    }
    
    renderSuperEvolutionEffects(player, screen) {
        const unlockedCreatures = [];
        const creatureData = {
            gorilla: { emoji: '🦍', color: '#8B4513' },
            crab: { emoji: '🦀', color: '#E53935' },
            bee: { emoji: '🐝', color: '#FFC107' },
            elephant: { emoji: '🐘', color: '#78909C' },
            bird: { emoji: '🐦', color: '#42A5F5' },
            fox: { emoji: '🦊', color: '#FF7043' }
        };
        
        for (const creature in player.superEvolutions) {
            if (player.superEvolutions[creature]) {
                unlockedCreatures.push(creature);
            }
        }
        
        if (unlockedCreatures.length > 0) {
            // Draw small orbiting icons for each unlocked super evolution
            const orbitRadius = player.radius + 30;
            const time = Date.now() * 0.001;
            
            for (let i = 0; i < unlockedCreatures.length; i++) {
                const creature = unlockedCreatures[i];
                const data = creatureData[creature];
                const angle = time + (i * Math.PI * 2 / unlockedCreatures.length);
                const orbitX = screen.x + Math.cos(angle) * orbitRadius;
                const orbitY = screen.y + Math.sin(angle) * orbitRadius;
                
                // Draw small colored circle
                this.ctx.fillStyle = data.color;
                this.ctx.beginPath();
                this.ctx.arc(orbitX, orbitY, 8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw emoji
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = '#fff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(data.emoji, orbitX, orbitY);
            }
        }
    }
    
    drawCreatureForm(creature, screen, radius, baseColor) {
        const creatureColors = {
            gorilla: '#8B4513',
            crab: '#E53935',
            bee: '#FFC107',
            elephant: '#78909C',
            bird: '#42A5F5',
            fox: '#FF7043'
        };
        
        const color = creatureColors[creature] || baseColor;
        
        switch (creature) {
            case 'gorilla':
                // Draw gorilla - muscular ape shape
                this.ctx.fillStyle = color;
                // Body
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y, radius * 1.2, radius, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Head
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y - radius * 0.7, radius * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
                // Arms
                this.ctx.fillStyle = '#5D4037';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x - radius * 1.3, screen.y + radius * 0.2, radius * 0.5, radius * 0.3, -0.3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x + radius * 1.3, screen.y + radius * 0.2, radius * 0.5, radius * 0.3, 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                // Face details
                this.ctx.fillStyle = '#3E2723';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y - radius * 0.5, radius * 0.35, radius * 0.25, 0, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'crab':
                // Draw crab - wide body with claws
                this.ctx.fillStyle = color;
                // Body (wide oval)
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y, radius * 1.4, radius * 0.9, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Shell pattern
                this.ctx.strokeStyle = '#C62828';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, radius * 0.6, 0, Math.PI, true);
                this.ctx.stroke();
                // Big claws
                this.ctx.fillStyle = '#D32F2F';
                this.drawClaw(screen.x - radius * 1.5, screen.y - radius * 0.3, 15, -Math.PI / 4);
                this.drawClaw(screen.x + radius * 1.5, screen.y - radius * 0.3, 15, Math.PI + Math.PI / 4);
                // Legs
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    // Left legs
                    this.ctx.beginPath();
                    this.ctx.moveTo(screen.x - radius * 0.8, screen.y + radius * 0.3 * i);
                    this.ctx.lineTo(screen.x - radius * 1.5, screen.y + radius * 0.5 + radius * 0.3 * i);
                    this.ctx.stroke();
                    // Right legs
                    this.ctx.beginPath();
                    this.ctx.moveTo(screen.x + radius * 0.8, screen.y + radius * 0.3 * i);
                    this.ctx.lineTo(screen.x + radius * 1.5, screen.y + radius * 0.5 + radius * 0.3 * i);
                    this.ctx.stroke();
                }
                // Eye stalks
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(screen.x - radius * 0.3, screen.y - radius * 0.8, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(screen.x + radius * 0.3, screen.y - radius * 0.8, 4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'bee':
                // Draw bee - striped body with wings
                const wingFlap = Math.sin(Date.now() * 0.02) * 0.4;
                // Wings
                this.ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x - radius * 0.8, screen.y - radius * 0.5, radius * 1.0, radius * 0.5, -0.5 + wingFlap, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x + radius * 0.8, screen.y - radius * 0.5, radius * 1.0, radius * 0.5, 0.5 - wingFlap, 0, Math.PI * 2);
                this.ctx.fill();
                // Body
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y, radius * 0.9, radius * 1.1, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Stripes
                this.ctx.fillStyle = '#1A1A1A';
                for (let i = -1; i <= 1; i++) {
                    this.ctx.beginPath();
                    this.ctx.ellipse(screen.x, screen.y + i * radius * 0.5, radius * 0.85, radius * 0.15, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                // Stinger
                this.ctx.fillStyle = '#1A1A1A';
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x, screen.y + radius * 1.1);
                this.ctx.lineTo(screen.x - 4, screen.y + radius * 1.5);
                this.ctx.lineTo(screen.x + 4, screen.y + radius * 1.5);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'elephant':
                // Draw elephant - large round body with trunk and ears
                this.ctx.fillStyle = color;
                // Body
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, radius * 1.2, 0, Math.PI * 2);
                this.ctx.fill();
                // Ears
                this.ctx.fillStyle = '#546E7A';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x - radius * 1.3, screen.y - radius * 0.3, radius * 0.6, radius * 0.8, -0.2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x + radius * 1.3, screen.y - radius * 0.3, radius * 0.6, radius * 0.8, 0.2, 0, Math.PI * 2);
                this.ctx.fill();
                // Trunk
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 8;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x, screen.y + radius * 0.3);
                this.ctx.quadraticCurveTo(screen.x, screen.y + radius * 1.5, screen.x - radius * 0.5, screen.y + radius * 1.8);
                this.ctx.stroke();
                // Tusks
                this.ctx.fillStyle = '#ECEFF1';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x - radius * 0.5, screen.y + radius * 0.6, 4, radius * 0.5, -0.3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x + radius * 0.5, screen.y + radius * 0.6, 4, radius * 0.5, 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'bird':
                // Draw bird - sleek body with beak and wings
                const birdWingFlap = Math.sin(Date.now() * 0.015) * 0.5;
                // Wings spread
                this.ctx.fillStyle = '#1E88E5';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x - radius * 1.2, screen.y, radius * 1.0, radius * 0.4, -0.3 + birdWingFlap, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x + radius * 1.2, screen.y, radius * 1.0, radius * 0.4, 0.3 - birdWingFlap, 0, Math.PI * 2);
                this.ctx.fill();
                // Body
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y, radius * 0.8, radius * 1.0, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Head
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y - radius * 0.9, radius * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
                // Beak
                this.ctx.fillStyle = '#FF9800';
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x, screen.y - radius * 0.9);
                this.ctx.lineTo(screen.x + radius * 0.6, screen.y - radius * 0.9);
                this.ctx.lineTo(screen.x, screen.y - radius * 0.7);
                this.ctx.closePath();
                this.ctx.fill();
                // Tail feathers
                this.ctx.fillStyle = '#1565C0';
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x, screen.y + radius * 0.8);
                this.ctx.lineTo(screen.x - radius * 0.4, screen.y + radius * 1.5);
                this.ctx.lineTo(screen.x, screen.y + radius * 1.3);
                this.ctx.lineTo(screen.x + radius * 0.4, screen.y + radius * 1.5);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'fox':
                // Draw fox - sleek body with pointy ears and bushy tail
                this.ctx.fillStyle = color;
                // Body
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y, radius * 0.9, radius * 1.0, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Head
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y - radius * 0.8, radius * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
                // Pointy ears
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x - radius * 0.5, screen.y - radius * 1.0);
                this.ctx.lineTo(screen.x - radius * 0.7, screen.y - radius * 1.6);
                this.ctx.lineTo(screen.x - radius * 0.2, screen.y - radius * 1.1);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.moveTo(screen.x + radius * 0.5, screen.y - radius * 1.0);
                this.ctx.lineTo(screen.x + radius * 0.7, screen.y - radius * 1.6);
                this.ctx.lineTo(screen.x + radius * 0.2, screen.y - radius * 1.1);
                this.ctx.closePath();
                this.ctx.fill();
                // Snout
                this.ctx.fillStyle = '#FFCCBC';
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x, screen.y - radius * 0.6, radius * 0.3, radius * 0.2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                // Nose
                this.ctx.fillStyle = '#1A1A1A';
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y - radius * 0.55, 3, 0, Math.PI * 2);
                this.ctx.fill();
                // Bushy tail
                const tailWag = Math.sin(Date.now() * 0.008) * 0.3;
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.ellipse(screen.x - radius * 1.0 + tailWag * 15, screen.y + radius * 0.3, radius * 0.8, radius * 0.35, -0.5 + tailWag, 0, Math.PI * 2);
                this.ctx.fill();
                // Tail tip (white)
                this.ctx.fillStyle = '#FFCCBC';
                this.ctx.beginPath();
                this.ctx.arc(screen.x - radius * 1.6 + tailWag * 20, screen.y + radius * 0.1, radius * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            default:
                // Fallback to circle
                this.ctx.fillStyle = baseColor;
                this.ctx.beginPath();
                this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
        }
    }
    
    renderBeeSwarm(beeSwarm) {
        for (const bee of beeSwarm) {
            const screen = this.worldToScreen(bee.x, bee.y);
            
            // Draw bee body
            this.ctx.fillStyle = '#FFC107';
            this.ctx.beginPath();
            this.ctx.ellipse(screen.x, screen.y, 6, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw stripes
            this.ctx.fillStyle = '#1A1A1A';
            this.ctx.beginPath();
            this.ctx.ellipse(screen.x - 2, screen.y, 1.5, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.ellipse(screen.x + 2, screen.y, 1.5, 3, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw wings
            const wingFlap = Math.sin(Date.now() * 0.05 + bee.angle * 10) * 0.5;
            this.ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.ellipse(screen.x - 3, screen.y - 3, 4, 2, -0.5 + wingFlap, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.ellipse(screen.x + 3, screen.y - 3, 4, 2, 0.5 - wingFlap, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawClaw(x, y, size, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-size, -size);
        this.ctx.lineTo(-size * 1.5, 0);
        this.ctx.lineTo(-size, size);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }
    
    drawArm(x1, y1, x2, y2) {
        // Draw upper arm
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Draw hand (small circle at end)
        this.ctx.beginPath();
        this.ctx.arc(x2, y2, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawLeg(x1, y1, x2, y2) {
        // Draw leg
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Draw foot (small circle at end)
        this.ctx.beginPath();
        this.ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    renderEnemy(enemy) {
        // Only render if enemy is in viewport
        const screen = this.worldToScreen(enemy.x, enemy.y);
        if (screen.x + enemy.radius < 0 || screen.x - enemy.radius > this.width ||
            screen.y + enemy.radius < 0 || screen.y - enemy.radius > this.height) {
            return; // Enemy is outside viewport
        }
        
        this.ctx.save();
        
        // Draw enemy body
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, enemy.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw health bar
        const barWidth = enemy.radius * 2;
        const barHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - enemy.radius - 10, barWidth, barHeight);
        
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#ffa500' : '#ff6b6b';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - enemy.radius - 10, barWidth * healthPercent, barHeight);
        
        // Draw simple eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - 3, screen.y - 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + 3, screen.y - 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Visual indicator for behavior
        if (enemy.behavior === 'attack') {
            // Draw aggressive spikes/claws for attacking crabs
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6;
                const x1 = screen.x + Math.cos(angle) * enemy.radius;
                const y1 = screen.y + Math.sin(angle) * enemy.radius;
                const x2 = screen.x + Math.cos(angle) * (enemy.radius + 5);
                const y2 = screen.y + Math.sin(angle) * (enemy.radius + 5);
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        } else {
            // Draw motion lines for fleeing crabs
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            // Draw small motion lines behind the crab
            for (let i = 0; i < 3; i++) {
                const offsetX = enemy.radius * 1.3 + i * 4;
                this.ctx.moveTo(screen.x - offsetX, screen.y - 2);
                this.ctx.lineTo(screen.x - offsetX - 3, screen.y - 2);
            }
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    renderParticle(particle) {
        const screen = this.worldToScreen(particle.x, particle.y);
        // Only render if particle is in viewport
        if (screen.x + particle.size < 0 || screen.x - particle.size > this.width ||
            screen.y + particle.size < 0 || screen.y - particle.size > this.height) {
            return; // Particle is outside viewport
        }
        
        this.ctx.save();
        this.ctx.globalAlpha = particle.life;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    renderTree(tree) {
        const screen = this.worldToScreen(tree.x, tree.y);
        // Only render if tree is in viewport
        if (screen.x + tree.foliageRadius < 0 || screen.x - tree.foliageRadius > this.width ||
            screen.y + tree.trunkHeight + tree.foliageRadius < 0 || screen.y - tree.foliageRadius > this.height) {
            return; // Tree is outside viewport
        }
        
        this.ctx.save();
        
        // Draw trunk (brown rectangle)
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(
            screen.x - 4,
            screen.y,
            8,
            tree.trunkHeight
        );
        
        // Draw foliage (green circle)
        this.ctx.fillStyle = '#228b22';
        this.ctx.beginPath();
        this.ctx.arc(
            screen.x,
            screen.y - tree.trunkHeight / 2,
            tree.foliageRadius,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Add some texture to foliage (darker green circles)
        this.ctx.fillStyle = '#1a6b1a';
        this.ctx.beginPath();
        this.ctx.arc(
            screen.x - tree.foliageRadius * 0.3,
            screen.y - tree.trunkHeight / 2 - tree.foliageRadius * 0.2,
            tree.foliageRadius * 0.4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(
            screen.x + tree.foliageRadius * 0.3,
            screen.y - tree.trunkHeight / 2 - tree.foliageRadius * 0.2,
            tree.foliageRadius * 0.4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderApple(apple) {
        if (apple.collected) return;
        
        const screen = this.worldToScreen(apple.x, apple.y);
        // Only render if apple is in viewport
        if (screen.x + apple.radius < 0 || screen.x - apple.radius > this.width ||
            screen.y + apple.radius < 0 || screen.y - apple.radius > this.height) {
            return; // Apple is outside viewport
        }
        
        this.ctx.save();
        
        // Draw apple body (red circle)
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, apple.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add highlight (lighter red circle)
        this.ctx.fillStyle = '#ff9999';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - apple.radius * 0.3, screen.y - apple.radius * 0.3, apple.radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw stem (small brown line)
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x, screen.y - apple.radius);
        this.ctx.lineTo(screen.x, screen.y - apple.radius - 4);
        this.ctx.stroke();
        
        // Draw leaf (small green shape)
        this.ctx.fillStyle = '#228b22';
        this.ctx.beginPath();
        this.ctx.ellipse(
            screen.x + apple.radius * 0.5,
            screen.y - apple.radius * 0.7,
            3,
            2,
            -Math.PI / 4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderAttackEffect(effect) {
        const screen = this.worldToScreen(effect.x, effect.y);
        
        this.ctx.save();
        
        // Calculate angle from facing direction
        const angle = Math.atan2(effect.facingY, effect.facingX);
        
        if (effect.isGuns) {
            // Gun line attack effect
            const alpha = effect.life * 6; // Brighter but fades fast
            const endX = screen.x + effect.facingX * effect.range;
            const endY = screen.y + effect.facingY * effect.range;
            
            // Outer glow
            this.ctx.strokeStyle = `rgba(255, 150, 0, ${alpha * 0.5})`;
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x + effect.facingX * 20, screen.y + effect.facingY * 20);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            // Inner beam
            this.ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x + effect.facingX * 20, screen.y + effect.facingY * 20);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            // Core
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x + effect.facingX * 20, screen.y + effect.facingY * 20);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        } else {
            // Melee arc slash effect
            this.ctx.strokeStyle = `rgba(255, 255, 0, ${effect.life * 3})`;
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            
            // Draw slash arc
            this.ctx.beginPath();
            this.ctx.arc(
                screen.x, 
                screen.y, 
                effect.range,
                angle - Math.PI / 3,  // 60 degrees each side
                angle + Math.PI / 3
            );
            this.ctx.stroke();
            
            // Draw inner arc
            this.ctx.strokeStyle = `rgba(255, 200, 0, ${effect.life * 2})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(
                screen.x, 
                screen.y, 
                effect.range * 0.7,
                angle - Math.PI / 4,
                angle + Math.PI / 4
            );
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    renderBoss(boss) {
        const screen = this.worldToScreen(boss.x, boss.y);
        
        // Only render if boss is in viewport
        if (screen.x + boss.radius + 20 < 0 || screen.x - boss.radius - 20 > this.width ||
            screen.y + boss.radius + 20 < 0 || screen.y - boss.radius - 20 > this.height) {
            return;
        }
        
        this.ctx.save();
        
        // Draw pulsing glow effect
        const pulseSize = Math.sin(boss.pulsePhase) * 5 + 10;
        const gradient = this.ctx.createRadialGradient(
            screen.x, screen.y, boss.radius,
            screen.x, screen.y, boss.radius + pulseSize
        );
        gradient.addColorStop(0, boss.glowColor);
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, boss.radius + pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw boss body
        this.ctx.fillStyle = boss.color;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, boss.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw spikes active indicator (red pulsing ring)
        if (boss.spikesActive) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, boss.radius + 8, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Inner warning glow
            const warningGradient = this.ctx.createRadialGradient(
                screen.x, screen.y, boss.radius,
                screen.x, screen.y, boss.radius + 20
            );
            warningGradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
            warningGradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = warningGradient;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, boss.radius + 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw buff active indicator (Void Emperor - purple aura)
        if (boss.buffActive) {
            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([10, 5]);
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, boss.radius + 15, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Purple glow
            const buffGradient = this.ctx.createRadialGradient(
                screen.x, screen.y, boss.radius,
                screen.x, screen.y, boss.radius + 30
            );
            buffGradient.addColorStop(0, 'rgba(155, 89, 182, 0.4)');
            buffGradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = buffGradient;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, boss.radius + 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw curse indicator (Crimson Overlord - crimson skull-like aura)
        if (boss.hasCurse) {
            // Pulsing crimson glow
            const curseGlow = Math.sin(boss.pulsePhase * 2) * 0.3 + 0.5;
            const curseGradient = this.ctx.createRadialGradient(
                screen.x, screen.y, boss.radius,
                screen.x, screen.y, boss.radius + 25
            );
            curseGradient.addColorStop(0, `rgba(220, 20, 60, ${curseGlow})`);
            curseGradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = curseGradient;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, boss.radius + 25, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw hurricanes (Void Emperor)
        if (boss.hurricanes && boss.hurricanes.length > 0) {
            for (const hurricane of boss.hurricanes) {
                const hScreen = this.worldToScreen(hurricane.x, hurricane.y);
                
                // Skip if off screen
                if (hScreen.x + hurricane.radius * 2 < 0 || hScreen.x - hurricane.radius * 2 > this.width ||
                    hScreen.y + hurricane.radius * 2 < 0 || hScreen.y - hurricane.radius * 2 > this.height) {
                    continue;
                }
                
                // Draw swirling hurricane effect
                this.ctx.save();
                this.ctx.translate(hScreen.x, hScreen.y);
                this.ctx.rotate(hurricane.rotation);
                
                // Outer swirl gradient
                const hurricaneGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, hurricane.radius * 2);
                hurricaneGradient.addColorStop(0, 'rgba(155, 89, 182, 0.8)');
                hurricaneGradient.addColorStop(0.5, 'rgba(155, 89, 182, 0.4)');
                hurricaneGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = hurricaneGradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, hurricane.radius * 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw spiral arms
                this.ctx.strokeStyle = 'rgba(200, 150, 255, 0.7)';
                this.ctx.lineWidth = 3;
                for (let arm = 0; arm < 4; arm++) {
                    this.ctx.beginPath();
                    for (let t = 0; t < 3; t += 0.1) {
                        const r = t * hurricane.radius * 0.5;
                        const angle = t * 2 + (arm * Math.PI / 2);
                        const x = Math.cos(angle) * r;
                        const y = Math.sin(angle) * r;
                        if (t === 0) {
                            this.ctx.moveTo(x, y);
                        } else {
                            this.ctx.lineTo(x, y);
                        }
                    }
                    this.ctx.stroke();
                }
                
                // Inner core
                this.ctx.fillStyle = 'rgba(100, 50, 150, 0.9)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, hurricane.radius * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
            }
        }
        
        // Draw dash charging indicator (white trail when dashing)
        if (boss.isDashing) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 10;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, boss.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw darker inner circle for depth
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(screen.x + 3, screen.y + 3, boss.radius * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw crown/spikes based on boss number
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        
        const spikeCount = boss.bossNumber + 4; // 5, 6, 7 spikes
        for (let i = 0; i < spikeCount; i++) {
            const angle = (Math.PI * 2 * i) / spikeCount - Math.PI / 2;
            const x1 = screen.x + Math.cos(angle) * boss.radius;
            const y1 = screen.y + Math.sin(angle) * boss.radius;
            const x2 = screen.x + Math.cos(angle) * (boss.radius + 15 + boss.bossNumber * 3);
            const y2 = screen.y + Math.sin(angle) * (boss.radius + 15 + boss.bossNumber * 3);
            
            this.ctx.strokeStyle = boss.color;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            
            // Spike tip
            this.ctx.fillStyle = boss.glowColor;
            this.ctx.beginPath();
            this.ctx.arc(x2, y2, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw menacing eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - boss.radius * 0.3, screen.y - boss.radius * 0.2, boss.radius * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + boss.radius * 0.3, screen.y - boss.radius * 0.2, boss.radius * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw red pupils
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - boss.radius * 0.3, screen.y - boss.radius * 0.2, boss.radius * 0.12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + boss.radius * 0.3, screen.y - boss.radius * 0.2, boss.radius * 0.12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw health bar (larger and more prominent)
        const barWidth = boss.radius * 3;
        const barHeight = 8;
        const healthPercent = boss.health / boss.maxHealth;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - boss.radius - 25, barWidth, barHeight);
        
        // Health fill
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#ffa500' : '#ff0000';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - boss.radius - 25, barWidth * healthPercent, barHeight);
        
        // Border
        this.ctx.strokeStyle = boss.color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screen.x - barWidth / 2, screen.y - boss.radius - 25, barWidth, barHeight);
        
        // Draw boss name
        this.ctx.fillStyle = boss.color;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(boss.name, screen.x, screen.y - boss.radius - 32);
        
        this.ctx.restore();
    }
}

