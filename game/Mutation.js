export default class Mutation {
    constructor() {
        this.mutationPool = [
            {
                name: 'Sharp Claws',
                description: 'Develop powerful claws for increased attack power.',
                attack: 5,
                crabRisk: 15
            },
            {
                name: 'Protective Shell',
                description: 'Grow a hard shell for better defense.',
                health: 30,
                speed: -10,
                crabRisk: 20
            },
            {
                name: 'Tentacles',
                description: 'Grow tentacles for better reach and speed.',
                speed: 30,
                attack: 2,
                crabRisk: 10
            },
            {
                name: 'Spikes',
                description: 'Develop sharp spikes all over your body.',
                attack: 8,
                health: 10,
                crabRisk: 5
            },
            {
                name: 'Muscular Build',
                description: 'Develop stronger muscles.',
                health: 20,
                attack: 3,
                speed: 10
            },
            {
                name: 'Fast Metabolism',
                description: 'Increase your movement speed significantly.',
                speed: 50,
                health: -10
            },
            {
                name: 'Thick Hide',
                description: 'Develop thicker skin for more health.',
                health: 40,
                speed: -5
            },
            {
                name: 'Venomous Bite',
                description: 'Develop venomous attacks.',
                attack: 10,
                crabRisk: 8
            },
            {
                name: 'Camouflage',
                description: 'Blend into your environment.',
                speed: 20,
                health: 15
            },
            {
                name: 'Regeneration',
                description: 'Heal faster and gain more health.',
                health: 50,
                attack: 2
            },
            {
                name: 'Crab Claws',
                description: 'Develop crab-like claws. Very powerful but...',
                attack: 15,
                health: 20,
                crabRisk: 50
            },
            {
                name: 'Exoskeleton',
                description: 'Develop a hard exoskeleton.',
                health: 35,
                attack: 5,
                speed: -15,
                crabRisk: 30
            },
            {
                name: 'Arms',
                description: 'Grow functional arms for powerful attacks.',
                attack: 20
            },
            {
                name: 'Legs',
                description: 'Grow strong legs for faster movement.',
                speed: 50
            }
        ];
        
        this.selectedMutations = [];
    }
    
    getRandomOptions(count, player = null) {
        // All mutations are always available (can be selected multiple times)
        // But Arms becomes rarer after level 1 (when it becomes Guns)
        let pool = [...this.mutationPool];
        
        if (player) {
            const armsLevel = player.getMutationLevel('Arms');
            if (armsLevel >= 1) {
                // Arms (Guns) is slightly rarer - 80% chance to appear in pool
                pool = pool.filter(m => {
                    if (m.name === 'Arms') {
                        return Math.random() < 0.8;
                    }
                    return true;
                });
            }
        }
        
        const shuffled = pool.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    
    applyMutation(mutation) {
        // Track for stats but don't limit selection
        this.selectedMutations.push(mutation.name);
    }
}

