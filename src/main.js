import { GAME_WIDTH, GAME_HEIGHT, SETTINGS } from './config.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import StoryScene from './scenes/StoryScene.js';
import StatUpgradeScene from './scenes/StatUpgradeScene.js';
import ChapterEndScene from './scenes/ChapterEndScene.js';
import EndingScene from './scenes/EndingScene.js';
import { MINIGAME_SCENES } from './minigames/index.js';

if (typeof Phaser === 'undefined') {
    document.body.innerHTML =
        '<p style="color:#fff;font-family:sans-serif;padding:16px">lib/phaser.min.js를 불러오지 못했습니다.</p>';
    throw new Error('Phaser global not found. Check that lib/phaser.min.js exists.');
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: SETTINGS.backgroundColor,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: SETTINGS.gravity },
            debug: SETTINGS.debugPhysics,
        },
    },
    scene: [
        BootScene,
        PreloadScene,
        TitleScene,
        StoryScene,
        StatUpgradeScene,
        ChapterEndScene,
        EndingScene,
        ...MINIGAME_SCENES,
    ],
});

// Handy for poking at the game from the browser console during development.
window.__GAME__ = game;
