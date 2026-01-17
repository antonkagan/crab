import Game from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);

// Start button
document.getElementById('start-button').addEventListener('click', () => {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    game.start();
});

// Restart button
document.getElementById('restart-button').addEventListener('click', () => {
    game.restart();
});

