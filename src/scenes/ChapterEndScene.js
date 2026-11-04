import chapters from '../game/story/index.js';
import Stats from '../game/Stats.js';
import { STAT_DEFS, STAT_KEYS, formatStat } from '../game/statDefs.js';
import Button from '../ui/Button.js';
import { PALETTE, INK, textStyle, card } from '../ui/theme.js';

const CARD_WIDTH = 480;

/** Chapter results: GPA (spec: "GPA: 챕터 최종 평가") and the stats carried into the next chapter. */
export default class ChapterEndScene extends Phaser.Scene {
    constructor() {
        super('ChapterEnd');
    }

    init(data) {
        this.chapter = chapters[data.chapterId];
        this.next = data.next ? chapters[data.next] : null;
    }

    create() {
        const { width, height } = this.view;
        const stats = new Stats(this);
        const keys = STAT_KEYS.filter((k) => k !== 'gpa');
        const cardHeight = 200 + keys.length * 36 + 96;
        const top = height / 2 - cardHeight / 2;
        const left = width / 2 - CARD_WIDTH / 2 + 32;
        const right = width / 2 + CARD_WIDTH / 2 - 32;

        this.add.rectangle(0, 0, width, height, PALETTE.rail).setOrigin(0);
        card(this, width / 2, height / 2, CARD_WIDTH, cardHeight);
        this.add.text(width / 2, top + 32, `${this.chapter?.title ?? ''} 끝`, textStyle(22, { weight: 700, color: INK.strong }))
            .setOrigin(0.5, 0);
        this.add.text(width / 2, top + 80, '최종 GPA', textStyle(14, { color: INK.muted })).setOrigin(0.5, 0);
        this.add.text(width / 2, top + 100, formatStat('gpa', stats.get('gpa')), textStyle(56, { weight: 700, color: INK.good }))
            .setOrigin(0.5, 0);

        keys.forEach((key, i) => {
            const y = top + 200 + i * 36;
            this.add.text(left, y, STAT_DEFS[key].label, textStyle(15, { color: INK.muted })).setOrigin(0, 0.5);
            this.add.text(right, y, formatStat(key, stats.get(key)), textStyle(15, { weight: 700, color: INK.strong })).setOrigin(1, 0.5);
        });

        const buttonY = top + cardHeight - 32 - 22;
        if (this.next) {
            new Button(this, width / 2, buttonY, `다음 챕터: ${this.next.title}`, {
                width: CARD_WIDTH - 64,
                variant: 'primary',
                onClick: () => this.scene.start('Story', { chapterId: this.next.id }),
            });
        } else {
            new Button(this, width / 2, buttonY, '타이틀로', {
                width: CARD_WIDTH - 64,
                variant: 'primary',
                onClick: () => this.scene.start('Title'),
            });
        }
    }
}
