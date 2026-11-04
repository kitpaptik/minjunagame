import { GAME_WIDTH, GAME_HEIGHT, RENDER_SCALE, SETTINGS } from './config.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import StoryScene from './scenes/StoryScene.js';
import StatUpgradeScene from './scenes/StatUpgradeScene.js';
import ChapterEndScene from './scenes/ChapterEndScene.js';
import EndingScene from './scenes/EndingScene.js';
import { MINIGAME_SCENES } from './minigames/index.js';

if (typeof Phaser === 'undefined') {
    document.body.innerHTML = '<p class="load-error">lib/phaser.min.js를 불러오지 못했습니다.</p>';
    throw new Error('Phaser global not found. Check that lib/phaser.min.js exists.');
}

// Canvas text uses whatever font is ready when it is drawn, so wait for the game font (offline: give up after 3s).
await Promise.race([
    Promise.all(['400', '500', '700'].map((w) => document.fonts.load(`${w} 16px 'Noto Sans KR'`))).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 3000)),
]);

// Every scene lays out in 1280x720 (`this.view`) and its camera zooms up to the larger canvas.
const VIEW = Object.freeze({ width: GAME_WIDTH, height: GAME_HEIGHT });
Object.defineProperty(Phaser.Scene.prototype, 'view', { get: () => VIEW });

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH * RENDER_SCALE,
    height: GAME_HEIGHT * RENDER_SCALE,
    backgroundColor: SETTINGS.backgroundColor,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
        // Zoom each scene's camera so the 1280x720 layout fills the larger canvas.
        // postBoot runs before the first scene starts; START fires before each scene's preload/create.
        postBoot: (booted) => {
            for (const scene of booted.scene.scenes) {
                scene.sys.events.on(Phaser.Scenes.Events.START, () => {
                    scene.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
                    scene.physics?.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
                });
            }
        },
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
