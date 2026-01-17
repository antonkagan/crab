export default class Surface {
    constructor(worldWidth, worldHeight, gridSize = 100) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.gridSize = gridSize;
        this.grid = [];
        this.surfaceTypes = ['grass', 'snow', 'desert'];
        this.biomeSeeds = [];
        
        this.generateBiomeSeeds();
        this.generateGrid();
    }
    
    generateBiomeSeeds() {
        this.biomeSeeds = [];
        
        const centerX = this.worldWidth / 2;
        const centerY = this.worldHeight / 2;
        const margin = 200;
        
        // Force grass seeds near center (ensures spawn area is grass)
        this.biomeSeeds.push({ x: centerX, y: centerY, type: 'grass' });
        this.biomeSeeds.push({ x: centerX - 400, y: centerY - 300, type: 'grass' });
        this.biomeSeeds.push({ x: centerX + 400, y: centerY + 300, type: 'grass' });
        
        // Guarantee at least 2-3 snow biomes in different corners/edges
        this.biomeSeeds.push({ 
            x: margin + Math.random() * 400, 
            y: margin + Math.random() * 400, 
            type: 'snow' 
        });
        this.biomeSeeds.push({ 
            x: this.worldWidth - margin - Math.random() * 400, 
            y: margin + Math.random() * 400, 
            type: 'snow' 
        });
        this.biomeSeeds.push({ 
            x: centerX + (Math.random() - 0.5) * 800, 
            y: margin + Math.random() * 300, 
            type: 'snow' 
        });
        
        // Guarantee at least 2-3 desert biomes in different corners/edges
        this.biomeSeeds.push({ 
            x: margin + Math.random() * 400, 
            y: this.worldHeight - margin - Math.random() * 400, 
            type: 'desert' 
        });
        this.biomeSeeds.push({ 
            x: this.worldWidth - margin - Math.random() * 400, 
            y: this.worldHeight - margin - Math.random() * 400, 
            type: 'desert' 
        });
        this.biomeSeeds.push({ 
            x: centerX + (Math.random() - 0.5) * 800, 
            y: this.worldHeight - margin - Math.random() * 300, 
            type: 'desert' 
        });
        
        // Add a few more random seeds for variety
        const numExtraSeeds = 4 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numExtraSeeds; i++) {
            const x = margin + Math.random() * (this.worldWidth - margin * 2);
            const y = margin + Math.random() * (this.worldHeight - margin * 2);
            
            // Check distance from center
            const distFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );
            
            let type;
            if (distFromCenter < 600) {
                // Near center - higher chance of grass
                type = Math.random() < 0.6 ? 'grass' : this.surfaceTypes[Math.floor(Math.random() * 3)];
            } else {
                // Far from center - equal chance of all types
                type = this.surfaceTypes[Math.floor(Math.random() * 3)];
            }
            
            this.biomeSeeds.push({ x, y, type });
        }
    }
    
    generateGrid() {
        const cols = Math.ceil(this.worldWidth / this.gridSize);
        const rows = Math.ceil(this.worldHeight / this.gridSize);
        
        for (let row = 0; row < rows; row++) {
            this.grid[row] = [];
            for (let col = 0; col < cols; col++) {
                // Get center position of this cell
                const cellX = col * this.gridSize + this.gridSize / 2;
                const cellY = row * this.gridSize + this.gridSize / 2;
                
                // Find nearest biome seed
                this.grid[row][col] = this.getNearestBiome(cellX, cellY);
            }
        }
    }
    
    getNearestBiome(x, y) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const seed of this.biomeSeeds) {
            const dx = x - seed.x;
            const dy = y - seed.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = seed;
            }
        }
        
        return nearest ? nearest.type : 'grass';
    }
    
    // Get the two nearest biomes and their distances for blending
    getTwoNearestBiomes(x, y) {
        let nearest = null;
        let secondNearest = null;
        let minDist = Infinity;
        let secondMinDist = Infinity;
        
        for (const seed of this.biomeSeeds) {
            const dx = x - seed.x;
            const dy = y - seed.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                secondMinDist = minDist;
                secondNearest = nearest;
                minDist = dist;
                nearest = seed;
            } else if (dist < secondMinDist) {
                secondMinDist = dist;
                secondNearest = seed;
            }
        }
        
        return {
            nearest: nearest,
            nearestDist: minDist,
            secondNearest: secondNearest,
            secondNearestDist: secondMinDist
        };
    }
    
    getSurfaceAt(x, y) {
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);
        
        if (row >= 0 && row < this.grid.length && col >= 0 && col < this.grid[0].length) {
            return this.grid[row][col];
        }
        
        // Default to grass if out of bounds
        return 'grass';
    }
    
    resize(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.generateBiomeSeeds();
        this.generateGrid();
    }
    
    getWorldSize() {
        return { width: this.worldWidth, height: this.worldHeight };
    }
    
    getSurfaceColor(surfaceType) {
        switch (surfaceType) {
            case 'grass':
                return '#2d5016';
            case 'snow':
                return '#e8f4f8';
            case 'desert':
                return '#d2b48c';
            default:
                return '#0f0f1e';
        }
    }
    
    // Get RGB values for a surface type
    getSurfaceRGB(surfaceType) {
        switch (surfaceType) {
            case 'grass':
                return { r: 45, g: 80, b: 22 };
            case 'snow':
                return { r: 232, g: 244, b: 248 };
            case 'desert':
                return { r: 210, g: 180, b: 140 };
            default:
                return { r: 15, g: 15, b: 30 };
        }
    }
    
    // Get blended color based on position (for smooth transitions)
    getBlendedColor(x, y) {
        const biomes = this.getTwoNearestBiomes(x, y);
        
        if (!biomes.secondNearest || biomes.nearest.type === biomes.secondNearest.type) {
            return this.getSurfaceColor(biomes.nearest.type);
        }
        
        // Calculate blend factor based on distance difference
        const totalDist = biomes.nearestDist + biomes.secondNearestDist;
        const blendThreshold = 80; // Blend within this distance from boundary (tighter with small cells)
        
        // How close are we to the boundary between two biomes?
        const distDiff = biomes.secondNearestDist - biomes.nearestDist;
        
        if (distDiff > blendThreshold) {
            // Far from boundary, use solid color
            return this.getSurfaceColor(biomes.nearest.type);
        }
        
        // Near boundary, blend colors
        const blendFactor = distDiff / blendThreshold; // 0 = at boundary, 1 = far from boundary
        
        const color1 = this.getSurfaceRGB(biomes.nearest.type);
        const color2 = this.getSurfaceRGB(biomes.secondNearest.type);
        
        const r = Math.round(color1.r * blendFactor + color2.r * (1 - blendFactor));
        const g = Math.round(color1.g * blendFactor + color2.g * (1 - blendFactor));
        const b = Math.round(color1.b * blendFactor + color2.b * (1 - blendFactor));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    getSpeedModifier(surfaceType) {
        switch (surfaceType) {
            case 'snow':
                return 0.5; // 50% speed
            case 'grass':
            case 'desert':
            default:
                return 1.0; // Normal speed
        }
    }
}
