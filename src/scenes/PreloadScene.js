import { SETTINGS } from '../config.js';
import manifest from '../game/assets.js';
import { queueAssets, finalizeAssets } from '../engine/AssetLoader.js';
import { STORY_DIR, CHAPTER_LIST, readChapterList, buildChapters } from '../game/story/index.js';
import { textStyle, COLORS } from '../ui/theme.js';

const LIST_KEY = 'story:list';
const storyKey = (id) => `story:${id}`;
/** Story scripts change often while writing; never let the browser serve a stale copy. */
const fresh = (url) => `${url}?v=${Date.now()}`;

/** Loads every asset from src/game/assets.js plus the story scripts, and shows a progress bar. */
export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('Preload');
    }

    preload() {
        const { width, height } = this.scale;
        const barWidth = width * 0.5;
        const x = (width - barWidth) / 2;
        const y = height / 2;

        this.add.rectangle(width / 2, y, barWidth + 4, 24).setStrokeStyle(2, 0xffffff);
        const bar = this.add.rectangle(x, y, 1, 18, 0x00ffff).setOrigin(0, 0.5);
        this.add.text(width / 2, y - 40, 'Loading...', { fontFamily: SETTINGS.font, fontSize: '20px' }).setOrigin(0.5);
        this.load.on(Phaser.Loader.Events.PROGRESS, (p) => {
            bar.width = Math.max(1, barWidth * p);
        });

        this.failedAssets = queueAssets(this, manifest);

        // The chapter list decides which script files to load next.
        this.chapterIds = [];
        this.load.once(`${Phaser.Loader.Events.FILE_KEY_COMPLETE}text-${LIST_KEY}`, (_key, _type, text) => {
            this.chapterIds = readChapterList(text);
            for (const id of this.chapterIds) this.load.text(storyKey(id), fresh(`${STORY_DIR}${id}.txt`));
        });
        this.load.text(LIST_KEY, fresh(CHAPTER_LIST));
    }

    create() {
        finalizeAssets(this, manifest, this.failedAssets);

        const errors = this.cache.text.exists(LIST_KEY)
            ? buildChapters(this.chapterIds, (id) => this.cache.text.get(storyKey(id)))
            : [`${CHAPTER_LIST} 파일을 찾을 수 없습니다.`];
        if (!errors.length && !this.chapterIds.length) errors.push(`${CHAPTER_LIST}에 챕터가 하나도 없습니다.`);

        if (errors.length) {
            this.#showErrors(errors);
            return;
        }
        this.scene.start('Title');
    }

    /** Script mistakes stop the game here with the file and line, so they're fixed before playing. */
    #showErrors(errors) {
        errors.forEach((e) => console.error(`[대본 오류] ${e}`));
        const { width, height } = this.scale;
        this.children.removeAll(true);
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a0f14);
        this.add.text(60, 50, '대본(story 폴더)에 고칠 곳이 있어요', textStyle(34, { fontStyle: 'bold', color: COLORS.bad }));
        this.add.text(60, 120, errors.slice(0, 8).map((e) => `• ${e}`).join('\n\n'), textStyle(20, {
            wordWrap: { width: width - 120, useAdvancedWrap: true },
            lineSpacing: 6,
        }));
        this.add.text(60, height - 50, '고친 다음 저장하고 새로고침(F5 / Cmd+R)하세요.', textStyle(20, { color: COLORS.muted }));
    }
}
