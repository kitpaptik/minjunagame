import chapters from '../game/story/index.js';
import Stats from '../game/Stats.js';
import { STAT_DEFS, STAT_KEYS, formatStat } from '../game/statDefs.js';
import Button from '../ui/Button.js';
import { COLORS, textStyle } from '../ui/theme.js';

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
        const { width } = this.scale;
        const stats = new Stats(this);

        this.add.text(width / 2, 110, `${this.chapter?.title ?? ''} 끝`, textStyle(56, { fontStyle: 'bold', color: COLORS.accent }))
            .setOrigin(0.5);

        this.add.text(width / 2, 200, '최종 GPA', textStyle(24, { color: COLORS.muted })).setOrigin(0.5);
        this.add.text(width / 2, 260, formatStat('gpa', stats.get('gpa')), textStyle(72, { fontStyle: 'bold', color: COLORS.gold }))
            .setOrigin(0.5);

        const lines = STAT_KEYS.filter((k) => k !== 'gpa')
            .map((k) => `${STAT_DEFS[k].label}   ${formatStat(k, stats.get(k))}`)
            .join('\n');
        this.add.text(width / 2, 420, lines, textStyle(26, { align: 'center', lineSpacing: 12 })).setOrigin(0.5);

        if (this.next) {
            new Button(this, width / 2, 620, `다음: ${this.next.title} · ${this.next.subtitle}`, {
                width: 520,
                onClick: () => this.scene.start('Story', { chapterId: this.next.id }),
            });
        } else {
            new Button(this, width / 2, 620, '타이틀로', { onClick: () => this.scene.start('Title') });
        }
    }
}
