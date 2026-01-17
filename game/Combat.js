export default class Combat {
    static checkCollision(entity1, entity2) {
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < entity1.radius + entity2.radius;
    }
    
    static calculateDamage(attacker, defender) {
        return attacker.attack;
    }
    
    static processCombat(player, enemy) {
        if (!this.checkCollision(player, enemy)) {
            return { hit: false };
        }
        
        // Player attacks enemy
        const playerDamage = this.calculateDamage(player, enemy);
        enemy.takeDamage(playerDamage);
        
        const enemyKilled = enemy.health <= 0;
        
        if (!enemyKilled) {
            // Enemy attacks player
            const enemyDamage = this.calculateDamage(enemy, player);
            player.takeDamage(enemyDamage);
        }
        
        return {
            hit: true,
            enemyKilled: enemyKilled,
            playerDamage: playerDamage,
            enemyDamage: enemyKilled ? 0 : this.calculateDamage(enemy, player)
        };
    }
}

