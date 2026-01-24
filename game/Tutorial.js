export default class Tutorial {
    constructor(renderBackground = null) {
        this.active = false;
        this.step = 0;
        this.renderBackground = renderBackground; // Callback to render the game background
        
        this.steps = [
            {
                title: 'Welcome, Little Slime!',
                text: 'You are a slime on a journey to evolve. Your goal is to defeat 3 powerful bosses to win!',
                position: 'center',
                highlight: null,
                showHud: false
            },
            {
                title: 'Movement',
                text: 'Use <span class="key">W</span> <span class="key">A</span> <span class="key">S</span> <span class="key">D</span> or <span class="key">Arrow Keys</span> to move around.',
                position: 'center',
                highlight: null,
                showHud: false
            },
            {
                title: 'Attack',
                text: '<span class="key">Click</span> to attack enemies. Red crabs will chase you, blue crabs will flee!',
                position: 'center',
                highlight: null,
                showHud: false
            },
            {
                title: 'Health Bar',
                text: 'This is your health. If it reaches zero, game over!',
                position: 'below',
                highlight: 'health-bar',
                showHud: true
            },
            {
                title: 'Evolution Points',
                text: 'Kill enemies to earn Evolution Points. At 100, 200, and 300 points, a boss will spawn!',
                position: 'below',
                highlight: 'evolution-points',
                showHud: true
            },
            {
                title: 'Collect Apples',
                text: 'Apples restore health. Collect 10 to trigger a mutation!',
                position: 'below',
                highlight: 'apple-counter',
                showHud: true
            },
            {
                title: 'Surface Types',
                text: 'Grass is safe. Snow slows you down. Desert damages you over time!',
                position: 'below',
                highlight: 'surface-indicator',
                showHud: true
            },
            {
                title: 'Super Evolution',
                text: 'Mutations give 10% progress toward super evolutions. At 100%, you can transform into a powerful creature!',
                position: 'below',
                highlight: 'evolution-progress',
                showHud: true
            },
            {
                title: 'Ready to Play!',
                text: 'Defeat all 3 bosses to win — or unlock all 6 super evolutions for ultimate carcinization! Good luck, little slime!',
                position: 'center',
                highlight: null,
                showHud: true
            }
        ];
    }
    
    setupEventListeners() {
        document.getElementById('tutorial-button')?.addEventListener('click', () => {
            this.start();
        });
        
        document.getElementById('tutorial-next')?.addEventListener('click', () => {
            this.nextStep();
        });
        
        document.getElementById('tutorial-skip')?.addEventListener('click', () => {
            this.end();
        });
    }
    
    start() {
        this.active = true;
        this.step = 0;
        
        // Hide start screen during tutorial
        document.getElementById('start-screen').classList.add('hidden');
        
        // Show tutorial overlay
        document.getElementById('tutorial-overlay').classList.remove('hidden');
        
        // Render the background
        if (this.renderBackground) {
            this.renderBackground();
        }
        
        this.showStep();
    }
    
    showStep() {
        const step = this.steps[this.step];
        const box = document.getElementById('tutorial-box');
        const highlight = document.getElementById('tutorial-highlight');
        const hud = document.getElementById('hud');
        
        // Show/hide HUD based on step requirement
        if (step.showHud) {
            hud.classList.remove('hidden');
        } else {
            hud.classList.add('hidden');
        }
        
        // Update step indicator dots
        const indicator = document.getElementById('tutorial-step-indicator');
        indicator.innerHTML = '';
        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'tutorial-dot';
            if (i < this.step) dot.classList.add('completed');
            if (i === this.step) dot.classList.add('active');
            indicator.appendChild(dot);
        }
        
        // Update content
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-text').innerHTML = step.text;
        
        // Update button text for last step
        const nextBtn = document.getElementById('tutorial-next');
        if (this.step === this.steps.length - 1) {
            nextBtn.textContent = 'Start Playing!';
        } else {
            nextBtn.textContent = 'Next';
        }
        
        // Remove arrow classes
        box.classList.remove('arrow-up', 'arrow-down', 'arrow-left', 'arrow-right');
        
        // Position the tutorial box and highlight
        if (step.highlight) {
            const targetEl = document.getElementById(step.highlight);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                
                // Show and position highlight
                highlight.classList.remove('hidden');
                highlight.style.left = (rect.left - 5) + 'px';
                highlight.style.top = (rect.top - 5) + 'px';
                highlight.style.width = (rect.width + 10) + 'px';
                highlight.style.height = (rect.height + 10) + 'px';
                
                // Position box based on step.position
                if (step.position === 'below') {
                    box.style.left = Math.max(20, Math.min(rect.left, window.innerWidth - 420)) + 'px';
                    box.style.top = (rect.bottom + 30) + 'px';
                    box.style.transform = 'none';
                    box.classList.add('arrow-up');
                } else if (step.position === 'above') {
                    box.style.left = Math.max(20, Math.min(rect.left, window.innerWidth - 420)) + 'px';
                    box.style.top = (rect.top - 200) + 'px';
                    box.style.transform = 'none';
                    box.classList.add('arrow-down');
                }
            } else {
                highlight.classList.add('hidden');
                this.centerBox(box);
            }
        } else {
            highlight.classList.add('hidden');
            this.centerBox(box);
        }
    }
    
    centerBox(box) {
        box.style.left = '50%';
        box.style.top = '50%';
        box.style.transform = 'translate(-50%, -50%)';
    }
    
    nextStep() {
        this.step++;
        
        if (this.step >= this.steps.length) {
            this.end();
        } else {
            this.showStep();
        }
    }
    
    end() {
        this.active = false;
        document.getElementById('tutorial-overlay').classList.add('hidden');
        document.getElementById('tutorial-highlight').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        
        // Show start screen so user can click "Start Game"
        document.getElementById('start-screen').classList.remove('hidden');
    }
    
    isActive() {
        return this.active;
    }
}
