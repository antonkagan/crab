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
        
        // If player has a creature form, draw it instead of the default slime
        if (player.currentCreatureForm) {
            this.drawCreatureForm(player.currentCreatureForm, screen, player.radius, features.color);
        } else {
            // Draw slime base form
            this.drawSlime(screen, player.radius, features.color);
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
        
        // Draw eyes (only if not slime - slime has its own eyes, creature forms have their own too)
        if (player.currentCreatureForm) {
            // Creature forms have eyes built into their drawing methods
        } else {
            // Slime already has eyes drawn in drawSlime()
        }
        
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
    
    drawSlime(screen, radius, color) {
        const time = Date.now() * 0.003;
        
        // Wobble animation parameters
        const wobble1 = Math.sin(time) * 0.1;
        const wobble2 = Math.sin(time * 1.3 + 1) * 0.08;
        const wobble3 = Math.sin(time * 0.7 + 2) * 0.12;
        
        // Draw slime shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + 3, screen.y + radius * 0.7, radius * 0.9, radius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw main slime body with wobble (blob shape)
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        
        // Create wobbly blob using bezier curves
        const points = 8;
        for (let i = 0; i <= points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const wobbleOffset = Math.sin(time * 2 + i * 0.8) * radius * 0.1;
            const r = radius + wobbleOffset;
            
            // Flatten bottom slightly for "sitting" look
            const ySquish = Math.sin(angle) > 0.3 ? 0.85 : 1;
            
            const x = screen.x + Math.cos(angle) * r;
            const y = screen.y + Math.sin(angle) * r * ySquish;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                // Use quadratic curve for smooth blob
                const prevAngle = (Math.PI * 2 * (i - 0.5)) / points;
                const prevWobble = Math.sin(time * 2 + (i - 0.5) * 0.8) * radius * 0.1;
                const prevR = radius + prevWobble;
                const prevYSquish = Math.sin(prevAngle) > 0.3 ? 0.85 : 1;
                const cpX = screen.x + Math.cos(prevAngle) * prevR * 1.1;
                const cpY = screen.y + Math.sin(prevAngle) * prevR * prevYSquish * 1.1;
                this.ctx.quadraticCurveTo(cpX, cpY, x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw inner glow/transparency effect
        const gradient = this.ctx.createRadialGradient(
            screen.x - radius * 0.3, screen.y - radius * 0.3, 0,
            screen.x, screen.y, radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, radius * 0.9, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw shine highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            screen.x - radius * 0.35 + wobble1 * radius,
            screen.y - radius * 0.35 + wobble2 * radius,
            radius * 0.25,
            radius * 0.15,
            -0.5,
            0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Small secondary shine
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(
            screen.x - radius * 0.1 + wobble3 * radius,
            screen.y - radius * 0.5,
            radius * 0.1,
            0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw cute slime eyes
        const eyeY = screen.y - radius * 0.1;
        const eyeSpacing = radius * 0.35;
        
        // Eye whites
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - eyeSpacing, eyeY, radius * 0.18, radius * 0.22, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + eyeSpacing, eyeY, radius * 0.18, radius * 0.22, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pupils (look slightly down)
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - eyeSpacing, eyeY + radius * 0.05, radius * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + eyeSpacing, eyeY + radius * 0.05, radius * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eye shine
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - eyeSpacing - radius * 0.03, eyeY, radius * 0.04, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + eyeSpacing - radius * 0.03, eyeY, radius * 0.04, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Small smile
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.arc(screen.x, eyeY + radius * 0.35, radius * 0.2, 0.2, Math.PI - 0.2);
        this.ctx.stroke();
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
        if (screen.x + enemy.radius * 2 < 0 || screen.x - enemy.radius * 2 > this.width ||
            screen.y + enemy.radius * 2 < 0 || screen.y - enemy.radius * 2 > this.height) {
            return; // Enemy is outside viewport
        }
        
        this.ctx.save();
        
        // Draw crab based on type
        this.drawCrabEnemy(enemy, screen);
        
        // Draw health bar
        const barWidth = enemy.radius * 2.5;
        const barHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - enemy.radius - 15, barWidth, barHeight);
        
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#ffa500' : '#ff6b6b';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - enemy.radius - 15, barWidth * healthPercent, barHeight);
        
        this.ctx.restore();
    }
    
    drawCrabEnemy(enemy, screen) {
        const r = enemy.radius;
        const animPhase = enemy.animPhase || 0;
        const legWiggle = Math.sin(animPhase * 3) * 0.2;
        
        switch (enemy.crabType) {
            case 'hermit':
                this.drawHermitCrab(enemy, screen, r, legWiggle);
                break;
            case 'fiddler':
                this.drawFiddlerCrab(enemy, screen, r, legWiggle);
                break;
            case 'king':
                this.drawKingCrab(enemy, screen, r, legWiggle);
                break;
            default:
                this.drawFiddlerCrab(enemy, screen, r, legWiggle);
        }
    }
    
    drawHermitCrab(enemy, screen, r, legWiggle) {
        // Hermit Crab - small body with spiral shell
        const shellColor = enemy.shellColor || '#8B7355';
        
        // Draw legs (3 per side, visible from shell)
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 2;
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const baseAngle = side * (0.4 + i * 0.25) + legWiggle * side;
                const legLen = r * 0.8;
                const x1 = screen.x + side * r * 0.5;
                const y1 = screen.y + r * 0.2;
                const x2 = x1 + Math.cos(baseAngle + Math.PI/2 * side) * legLen;
                const y2 = y1 + Math.sin(baseAngle + Math.PI/2 * side) * legLen * 0.5 + r * 0.3;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
        
        // Draw spiral shell (on back)
        this.ctx.fillStyle = shellColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.1, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Shell spiral pattern
        this.ctx.strokeStyle = '#6B5344';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let t = 0; t < 4; t += 0.1) {
            const spiralR = t * r * 0.15;
            const angle = t * 1.5;
            const x = screen.x + Math.cos(angle) * spiralR;
            const y = screen.y - r * 0.1 + Math.sin(angle) * spiralR * 0.7;
            if (t === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
        
        // Draw small crab body (peeking out)
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y + r * 0.5, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Small claws
        this.ctx.fillStyle = enemy.color;
        this.drawSmallClaw(screen.x - r * 0.6, screen.y + r * 0.4, r * 0.25, -0.3);
        this.drawSmallClaw(screen.x + r * 0.6, screen.y + r * 0.4, r * 0.25, 0.3);
        
        // Eye stalks
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.2, screen.y + r * 0.3);
        this.ctx.lineTo(screen.x - r * 0.3, screen.y + r * 0.1);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.2, screen.y + r * 0.3);
        this.ctx.lineTo(screen.x + r * 0.3, screen.y + r * 0.1);
        this.ctx.stroke();
        
        // Eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.3, screen.y + r * 0.1, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.3, screen.y + r * 0.1, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.3, screen.y + r * 0.1, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.3, screen.y + r * 0.1, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawFiddlerCrab(enemy, screen, r, legWiggle) {
        // Fiddler Crab - one giant claw, one small claw
        const bigClawSide = enemy.bigClawSide === 'left' ? -1 : 1;
        
        // Draw legs (3 per side)
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 3;
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 3; i++) {
                const baseAngle = side * (0.3 + i * 0.3) + legWiggle * side;
                const legLen = r * 1.0;
                const x1 = screen.x + side * r * 0.6;
                const y1 = screen.y + r * 0.1 + i * r * 0.15;
                const midX = x1 + Math.cos(baseAngle) * legLen * 0.5 * side;
                const midY = y1 + Math.abs(Math.sin(baseAngle)) * legLen * 0.3;
                const x2 = midX + Math.cos(baseAngle + 0.5 * side) * legLen * 0.5 * side;
                const y2 = midY + r * 0.2;
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(midX, midY);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
        
        // Draw body (oval)
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y, r * 1.1, r * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body pattern
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.1, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Giant claw
        const bigClawX = screen.x + bigClawSide * r * 1.3;
        const bigClawY = screen.y - r * 0.2;
        this.ctx.fillStyle = enemy.color;
        
        // Claw arm
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + bigClawSide * r * 0.8, bigClawY + r * 0.1, r * 0.4, r * 0.25, bigClawSide * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Big claw pincer
        this.ctx.beginPath();
        this.ctx.ellipse(bigClawX, bigClawY, r * 0.7, r * 0.5, bigClawSide * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        // Claw opening
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.beginPath();
        this.ctx.ellipse(bigClawX + bigClawSide * r * 0.15, bigClawY, r * 0.15, r * 0.35, bigClawSide * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Small claw
        const smallClawX = screen.x - bigClawSide * r * 0.9;
        const smallClawY = screen.y + r * 0.1;
        this.ctx.fillStyle = enemy.color;
        this.drawSmallClaw(smallClawX, smallClawY, r * 0.3, -bigClawSide * 0.3);
        
        // Eye stalks
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 3;
        const eyeStalkHeight = r * 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.25, screen.y - r * 0.5);
        this.ctx.lineTo(screen.x - r * 0.3, screen.y - r * 0.5 - eyeStalkHeight);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.25, screen.y - r * 0.5);
        this.ctx.lineTo(screen.x + r * 0.3, screen.y - r * 0.5 - eyeStalkHeight);
        this.ctx.stroke();
        
        // Eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.3, screen.y - r * 0.5 - eyeStalkHeight, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.3, screen.y - r * 0.5 - eyeStalkHeight, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.3, screen.y - r * 0.5 - eyeStalkHeight, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.3, screen.y - r * 0.5 - eyeStalkHeight, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawKingCrab(enemy, screen, r, legWiggle) {
        // King Crab - large, spiky, intimidating
        
        // Draw legs (4 per side, longer)
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 4;
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const baseAngle = side * (0.2 + i * 0.25) + legWiggle * side * 0.5;
                const legLen = r * 1.4;
                const x1 = screen.x + side * r * 0.7;
                const y1 = screen.y - r * 0.2 + i * r * 0.25;
                const midX = x1 + Math.cos(baseAngle) * legLen * 0.6 * side;
                const midY = y1 + Math.abs(Math.sin(baseAngle)) * legLen * 0.2 + r * 0.1;
                const x2 = midX + Math.cos(baseAngle + 0.3 * side) * legLen * 0.5 * side;
                const y2 = midY + r * 0.3;
                
                // Draw jointed leg
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(midX, midY);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
                
                // Leg spikes
                this.ctx.fillStyle = '#4a0000';
                this.ctx.beginPath();
                this.ctx.arc(midX, midY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Draw spiky shell body
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y, r * 1.3, r * 1.0, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Shell spikes
        this.ctx.fillStyle = '#4a0000';
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
            const spikeBase = r * 1.1;
            const spikeLen = r * 0.35;
            const x1 = screen.x + Math.cos(angle) * spikeBase;
            const y1 = screen.y + Math.sin(angle) * spikeBase * 0.8;
            const x2 = screen.x + Math.cos(angle) * (spikeBase + spikeLen);
            const y2 = screen.y + Math.sin(angle) * (spikeBase + spikeLen) * 0.8;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1 - 4, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.lineTo(x1 + 4, y1);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Shell pattern - darker center
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.1, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Two large claws
        for (let side = -1; side <= 1; side += 2) {
            const clawX = screen.x + side * r * 1.5;
            const clawY = screen.y - r * 0.3;
            
            // Claw arm
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.ellipse(screen.x + side * r * 1.0, clawY + r * 0.2, r * 0.35, r * 0.25, side * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Claw pincer
            this.ctx.beginPath();
            this.ctx.ellipse(clawX, clawY, r * 0.5, r * 0.4, side * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Claw spikes
            this.ctx.fillStyle = '#4a0000';
            this.ctx.beginPath();
            this.ctx.moveTo(clawX + side * r * 0.3, clawY - r * 0.35);
            this.ctx.lineTo(clawX + side * r * 0.5, clawY - r * 0.55);
            this.ctx.lineTo(clawX + side * r * 0.4, clawY - r * 0.25);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Claw opening
            this.ctx.fillStyle = '#1a1a2e';
            this.ctx.beginPath();
            this.ctx.ellipse(clawX + side * r * 0.1, clawY, r * 0.1, r * 0.25, side * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Eye stalks (shorter, thicker)
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 4;
        const eyeStalkHeight = r * 0.4;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.3, screen.y - r * 0.7);
        this.ctx.lineTo(screen.x - r * 0.35, screen.y - r * 0.7 - eyeStalkHeight);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.3, screen.y - r * 0.7);
        this.ctx.lineTo(screen.x + r * 0.35, screen.y - r * 0.7 - eyeStalkHeight);
        this.ctx.stroke();
        
        // Angry eyes (red tint)
        this.ctx.fillStyle = '#ffcccc';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.35, screen.y - r * 0.7 - eyeStalkHeight, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.35, screen.y - r * 0.7 - eyeStalkHeight, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#8B0000';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.35, screen.y - r * 0.7 - eyeStalkHeight, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.35, screen.y - r * 0.7 - eyeStalkHeight, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawSmallClaw(x, y, size, angle) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        
        // Claw base
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Claw tip/pincer
        this.ctx.beginPath();
        this.ctx.moveTo(size * 0.5, -size * 0.3);
        this.ctx.lineTo(size * 1.2, 0);
        this.ctx.lineTo(size * 0.5, size * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
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
        if (screen.x + boss.radius * 2 < 0 || screen.x - boss.radius * 2 > this.width ||
            screen.y + boss.radius * 2 < 0 || screen.y - boss.radius * 2 > this.height) {
            return;
        }
        
        this.ctx.save();
        const r = boss.radius;
        
        // Draw pulsing glow effect
        const pulseSize = Math.sin(boss.pulsePhase) * 5 + 10;
        const gradient = this.ctx.createRadialGradient(
            screen.x, screen.y, r,
            screen.x, screen.y, r + pulseSize
        );
        gradient.addColorStop(0, boss.glowColor);
        gradient.addColorStop(1, 'transparent');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, r + pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw monster based on boss number
        switch (boss.bossNumber) {
            case 1:
                this.drawOgreBoss(boss, screen, r);
                break;
            case 2:
                this.drawDemonBoss(boss, screen, r);
                break;
            case 3:
                this.drawDragonBoss(boss, screen, r);
                break;
        }
        
        // Draw ability effects on top
        this.drawBossAbilityEffects(boss, screen, r);
        
        // Draw health bar
        const barWidth = r * 3;
        const barHeight = 8;
        const healthPercent = boss.health / boss.maxHealth;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - r - 40, barWidth, barHeight);
        
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#ffa500' : '#ff0000';
        this.ctx.fillRect(screen.x - barWidth / 2, screen.y - r - 40, barWidth * healthPercent, barHeight);
        
        this.ctx.strokeStyle = boss.color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screen.x - barWidth / 2, screen.y - r - 40, barWidth, barHeight);
        
        // Draw boss name
        this.ctx.fillStyle = boss.color;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(boss.name, screen.x, screen.y - r - 47);
        
        this.ctx.restore();
    }
    
    drawOgreBoss(boss, screen, r) {
        // Ogre - Large brutish figure with green/gold skin, tusks, holding a massive cleaver
        const bodyColor = '#5D8C3E'; // Green-ish
        const skinHighlight = '#7DAA5E';
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y + r * 0.8, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Legs
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.35, screen.y + r * 0.6, r * 0.25, r * 0.45, -0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.35, screen.y + r * 0.6, r * 0.25, r * 0.45, 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body (barrel chest)
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Belly
        this.ctx.fillStyle = skinHighlight;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y + r * 0.1, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Left arm (non-weapon)
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.9, screen.y - r * 0.1, r * 0.25, r * 0.5, -0.4, 0, Math.PI * 2);
        this.ctx.fill();
        // Fist
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 1.05, screen.y + r * 0.3, r * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right arm holding cleaver
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.85, screen.y - r * 0.2, r * 0.25, r * 0.5, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // CLEAVER (weapon)
        const cleaverX = screen.x + r * 1.1;
        const cleaverY = screen.y - r * 0.5;
        // Handle
        this.ctx.fillStyle = '#4a3728';
        this.ctx.fillRect(cleaverX - 5, cleaverY + r * 0.2, 10, r * 0.5);
        // Blade
        this.ctx.fillStyle = '#C0C0C0';
        this.ctx.beginPath();
        this.ctx.moveTo(cleaverX - r * 0.1, cleaverY + r * 0.2);
        this.ctx.lineTo(cleaverX + r * 0.5, cleaverY - r * 0.3);
        this.ctx.lineTo(cleaverX + r * 0.55, cleaverY + r * 0.1);
        this.ctx.lineTo(cleaverX + r * 0.1, cleaverY + r * 0.2);
        this.ctx.closePath();
        this.ctx.fill();
        // Blade edge
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cleaverX + r * 0.5, cleaverY - r * 0.3);
        this.ctx.lineTo(cleaverX + r * 0.55, cleaverY + r * 0.1);
        this.ctx.stroke();
        
        // Head
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.6, r * 0.5, r * 0.45, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Ears (pointed)
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.45, screen.y - r * 0.7);
        this.ctx.lineTo(screen.x - r * 0.7, screen.y - r * 1.0);
        this.ctx.lineTo(screen.x - r * 0.35, screen.y - r * 0.85);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.45, screen.y - r * 0.7);
        this.ctx.lineTo(screen.x + r * 0.7, screen.y - r * 1.0);
        this.ctx.lineTo(screen.x + r * 0.35, screen.y - r * 0.85);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Tusks
        this.ctx.fillStyle = '#FFFFF0';
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.25, screen.y - r * 0.35);
        this.ctx.lineTo(screen.x - r * 0.4, screen.y - r * 0.15);
        this.ctx.lineTo(screen.x - r * 0.2, screen.y - r * 0.25);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.25, screen.y - r * 0.35);
        this.ctx.lineTo(screen.x + r * 0.4, screen.y - r * 0.15);
        this.ctx.lineTo(screen.x + r * 0.2, screen.y - r * 0.25);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eyes (angry)
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.18, screen.y - r * 0.65, r * 0.12, r * 0.08, -0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.18, screen.y - r * 0.65, r * 0.12, r * 0.08, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        // Pupils
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.18, screen.y - r * 0.65, r * 0.05, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.18, screen.y - r * 0.65, r * 0.05, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Angry brow
        this.ctx.strokeStyle = bodyColor;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.35, screen.y - r * 0.8);
        this.ctx.lineTo(screen.x - r * 0.05, screen.y - r * 0.72);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.35, screen.y - r * 0.8);
        this.ctx.lineTo(screen.x + r * 0.05, screen.y - r * 0.72);
        this.ctx.stroke();
    }
    
    drawDemonBoss(boss, screen, r) {
        // Demon - Purple horned figure with glowing eyes and wings, holding curved dagger
        const bodyColor = '#6B3FA0';
        const skinDark = '#4A2870';
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y + r * 0.8, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Wings (behind body)
        this.ctx.fillStyle = skinDark;
        // Left wing
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.3, screen.y - r * 0.2);
        this.ctx.quadraticCurveTo(screen.x - r * 1.5, screen.y - r * 0.8, screen.x - r * 1.3, screen.y + r * 0.3);
        this.ctx.quadraticCurveTo(screen.x - r * 0.8, screen.y + r * 0.1, screen.x - r * 0.3, screen.y + r * 0.2);
        this.ctx.closePath();
        this.ctx.fill();
        // Right wing
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.3, screen.y - r * 0.2);
        this.ctx.quadraticCurveTo(screen.x + r * 1.5, screen.y - r * 0.8, screen.x + r * 1.3, screen.y + r * 0.3);
        this.ctx.quadraticCurveTo(screen.x + r * 0.8, screen.y + r * 0.1, screen.x + r * 0.3, screen.y + r * 0.2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Wing bones
        this.ctx.strokeStyle = '#3A1850';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.3, screen.y);
        this.ctx.lineTo(screen.x - r * 1.2, screen.y - r * 0.5);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.3, screen.y);
        this.ctx.lineTo(screen.x + r * 1.2, screen.y - r * 0.5);
        this.ctx.stroke();
        
        // Legs
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.25, screen.y + r * 0.55, r * 0.18, r * 0.4, -0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.25, screen.y + r * 0.55, r * 0.18, r * 0.4, 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body (slim, muscular)
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y, r * 0.6, r * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Left arm
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.7, screen.y - r * 0.1, r * 0.15, r * 0.4, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right arm with dagger
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.65, screen.y - r * 0.2, r * 0.15, r * 0.4, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // CURVED DAGGER (weapon)
        const daggerX = screen.x + r * 0.9;
        const daggerY = screen.y - r * 0.5;
        // Handle
        this.ctx.fillStyle = '#2F1A47';
        this.ctx.fillRect(daggerX - 4, daggerY + r * 0.1, 8, r * 0.25);
        // Guard
        this.ctx.fillStyle = '#9B59B6';
        this.ctx.fillRect(daggerX - 10, daggerY + r * 0.08, 20, 6);
        // Curved blade
        this.ctx.fillStyle = '#A0A0B0';
        this.ctx.beginPath();
        this.ctx.moveTo(daggerX, daggerY + r * 0.08);
        this.ctx.quadraticCurveTo(daggerX + r * 0.25, daggerY - r * 0.2, daggerX + r * 0.1, daggerY - r * 0.4);
        this.ctx.lineTo(daggerX - r * 0.05, daggerY - r * 0.35);
        this.ctx.quadraticCurveTo(daggerX + r * 0.1, daggerY - r * 0.1, daggerX, daggerY + r * 0.08);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Head
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.55, r * 0.4, r * 0.35, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Horns
        this.ctx.fillStyle = '#1A0A25';
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.3, screen.y - r * 0.75);
        this.ctx.quadraticCurveTo(screen.x - r * 0.5, screen.y - r * 1.2, screen.x - r * 0.15, screen.y - r * 1.1);
        this.ctx.lineTo(screen.x - r * 0.25, screen.y - r * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.3, screen.y - r * 0.75);
        this.ctx.quadraticCurveTo(screen.x + r * 0.5, screen.y - r * 1.2, screen.x + r * 0.15, screen.y - r * 1.1);
        this.ctx.lineTo(screen.x + r * 0.25, screen.y - r * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Glowing eyes
        this.ctx.fillStyle = '#FF00FF';
        this.ctx.shadowColor = '#FF00FF';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.15, screen.y - r * 0.55, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.15, screen.y - r * 0.55, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Evil grin
        this.ctx.strokeStyle = '#FF00FF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y - r * 0.4, r * 0.15, 0.2, Math.PI - 0.2);
        this.ctx.stroke();
    }
    
    drawDragonBoss(boss, screen, r) {
        // Dragon - Serpentine body with scales, fire aura, holding flaming sword
        const bodyColor = '#8B0000';
        const scaleColor = '#DC143C';
        const fireColor = '#FF4500';
        
        // Fire aura
        const fireGlow = Math.sin(boss.pulsePhase * 3) * 0.2 + 0.6;
        this.ctx.fillStyle = `rgba(255, 69, 0, ${fireGlow * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, r * 1.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y + r * 0.85, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tail (serpentine, behind)
        this.ctx.strokeStyle = bodyColor;
        this.ctx.lineWidth = r * 0.25;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.3, screen.y + r * 0.5);
        this.ctx.quadraticCurveTo(screen.x - r * 1.0, screen.y + r * 0.3, screen.x - r * 1.3, screen.y + r * 0.7);
        this.ctx.stroke();
        // Tail spikes
        this.ctx.fillStyle = '#4a0000';
        for (let i = 0; i < 4; i++) {
            const tx = screen.x - r * 0.5 - i * r * 0.2;
            const ty = screen.y + r * 0.4 + Math.sin(i) * r * 0.1;
            this.ctx.beginPath();
            this.ctx.moveTo(tx, ty - 5);
            this.ctx.lineTo(tx - 8, ty - 15);
            this.ctx.lineTo(tx + 3, ty - 3);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Body (serpentine torso)
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y + r * 0.1, r * 0.7, r * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Scales pattern
        this.ctx.fillStyle = scaleColor;
        for (let row = 0; row < 3; row++) {
            for (let col = -2; col <= 2; col++) {
                const sx = screen.x + col * r * 0.2 + (row % 2) * r * 0.1;
                const sy = screen.y - r * 0.1 + row * r * 0.25;
                this.ctx.beginPath();
                this.ctx.ellipse(sx, sy, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // Left arm/claw
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.75, screen.y - r * 0.1, r * 0.18, r * 0.45, -0.4, 0, Math.PI * 2);
        this.ctx.fill();
        // Claws
        this.ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(screen.x - r * 0.85 - i * 5, screen.y + r * 0.25);
            this.ctx.lineTo(screen.x - r * 0.9 - i * 5, screen.y + r * 0.4);
            this.ctx.lineTo(screen.x - r * 0.8 - i * 5, screen.y + r * 0.28);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Right arm holding sword
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.7, screen.y - r * 0.15, r * 0.18, r * 0.45, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // FLAMING SWORD (weapon)
        const swordX = screen.x + r * 1.0;
        const swordY = screen.y - r * 0.6;
        // Handle
        this.ctx.fillStyle = '#2F1A00';
        this.ctx.fillRect(swordX - 5, swordY + r * 0.3, 10, r * 0.35);
        // Guard
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.ellipse(swordX, swordY + r * 0.28, r * 0.12, r * 0.05, 0, 0, Math.PI * 2);
        this.ctx.fill();
        // Blade
        this.ctx.fillStyle = '#FF4500';
        this.ctx.beginPath();
        this.ctx.moveTo(swordX - r * 0.08, swordY + r * 0.25);
        this.ctx.lineTo(swordX, swordY - r * 0.5);
        this.ctx.lineTo(swordX + r * 0.08, swordY + r * 0.25);
        this.ctx.closePath();
        this.ctx.fill();
        // Fire effect on blade
        this.ctx.fillStyle = `rgba(255, 200, 0, ${fireGlow})`;
        this.ctx.beginPath();
        this.ctx.moveTo(swordX - r * 0.05, swordY + r * 0.15);
        this.ctx.lineTo(swordX, swordY - r * 0.35);
        this.ctx.lineTo(swordX + r * 0.05, swordY + r * 0.15);
        this.ctx.closePath();
        this.ctx.fill();
        // Fire particles around sword
        this.ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
        for (let i = 0; i < 5; i++) {
            const fx = swordX + Math.sin(boss.pulsePhase * 5 + i) * r * 0.15;
            const fy = swordY - r * 0.1 - i * r * 0.1 + Math.cos(boss.pulsePhase * 3 + i) * 5;
            this.ctx.beginPath();
            this.ctx.arc(fx, fy, 3 + Math.random() * 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Head (dragon snout)
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.55, r * 0.45, r * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Snout
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x, screen.y - r * 0.35, r * 0.25, r * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Nostrils (with smoke)
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        this.ctx.arc(screen.x - r * 0.1, screen.y - r * 0.35, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(screen.x + r * 0.1, screen.y - r * 0.35, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Horns (multiple)
        this.ctx.fillStyle = '#4a0000';
        // Main horns
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.3, screen.y - r * 0.8);
        this.ctx.lineTo(screen.x - r * 0.5, screen.y - r * 1.2);
        this.ctx.lineTo(screen.x - r * 0.2, screen.y - r * 0.85);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.3, screen.y - r * 0.8);
        this.ctx.lineTo(screen.x + r * 0.5, screen.y - r * 1.2);
        this.ctx.lineTo(screen.x + r * 0.2, screen.y - r * 0.85);
        this.ctx.closePath();
        this.ctx.fill();
        // Small back horns
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x - r * 0.15, screen.y - r * 0.9);
        this.ctx.lineTo(screen.x - r * 0.2, screen.y - r * 1.05);
        this.ctx.lineTo(screen.x - r * 0.1, screen.y - r * 0.92);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + r * 0.15, screen.y - r * 0.9);
        this.ctx.lineTo(screen.x + r * 0.2, screen.y - r * 1.05);
        this.ctx.lineTo(screen.x + r * 0.1, screen.y - r * 0.92);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eyes (fiery)
        this.ctx.fillStyle = '#FF4500';
        this.ctx.shadowColor = '#FF4500';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.18, screen.y - r * 0.6, r * 0.1, r * 0.07, -0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.18, screen.y - r * 0.6, r * 0.1, r * 0.07, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        // Slit pupils
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x - r * 0.18, screen.y - r * 0.6, r * 0.02, r * 0.06, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(screen.x + r * 0.18, screen.y - r * 0.6, r * 0.02, r * 0.06, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawBossAbilityEffects(boss, screen, r) {
        // Draw spikes active indicator (Golden Crusher)
        if (boss.spikesActive) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, r + 15, 0, Math.PI * 2);
            this.ctx.stroke();
            
            const warningGradient = this.ctx.createRadialGradient(
                screen.x, screen.y, r,
                screen.x, screen.y, r + 25
            );
            warningGradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
            warningGradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = warningGradient;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, r + 25, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw buff active indicator (Void Emperor)
        if (boss.buffActive) {
            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([10, 5]);
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, r + 20, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw curse indicator (Crimson Overlord)
        if (boss.hasCurse) {
            const curseGlow = Math.sin(boss.pulsePhase * 2) * 0.3 + 0.5;
            const curseGradient = this.ctx.createRadialGradient(
                screen.x, screen.y, r,
                screen.x, screen.y, r + 30
            );
            curseGradient.addColorStop(0, `rgba(220, 20, 60, ${curseGlow})`);
            curseGradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = curseGradient;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, r + 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw hurricanes (Void Emperor)
        if (boss.hurricanes && boss.hurricanes.length > 0) {
            for (const hurricane of boss.hurricanes) {
                const hScreen = this.worldToScreen(hurricane.x, hurricane.y);
                
                if (hScreen.x + hurricane.radius * 2 < 0 || hScreen.x - hurricane.radius * 2 > this.width ||
                    hScreen.y + hurricane.radius * 2 < 0 || hScreen.y - hurricane.radius * 2 > this.height) {
                    continue;
                }
                
                this.ctx.save();
                this.ctx.translate(hScreen.x, hScreen.y);
                this.ctx.rotate(hurricane.rotation);
                
                const hurricaneGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, hurricane.radius * 2);
                hurricaneGradient.addColorStop(0, 'rgba(155, 89, 182, 0.8)');
                hurricaneGradient.addColorStop(0.5, 'rgba(155, 89, 182, 0.4)');
                hurricaneGradient.addColorStop(1, 'transparent');
                this.ctx.fillStyle = hurricaneGradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, hurricane.radius * 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(200, 150, 255, 0.7)';
                this.ctx.lineWidth = 3;
                for (let arm = 0; arm < 4; arm++) {
                    this.ctx.beginPath();
                    for (let t = 0; t < 3; t += 0.1) {
                        const hr = t * hurricane.radius * 0.5;
                        const angle = t * 2 + (arm * Math.PI / 2);
                        const x = Math.cos(angle) * hr;
                        const y = Math.sin(angle) * hr;
                        if (t === 0) this.ctx.moveTo(x, y);
                        else this.ctx.lineTo(x, y);
                    }
                    this.ctx.stroke();
                }
                
                this.ctx.fillStyle = 'rgba(100, 50, 150, 0.9)';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, hurricane.radius * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
            }
        }
        
        // Draw dash indicator (Golden Crusher)
        if (boss.isDashing) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 10;
            this.ctx.beginPath();
            this.ctx.arc(screen.x, screen.y, r + 10, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
}

