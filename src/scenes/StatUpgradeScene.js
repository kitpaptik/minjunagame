import Stats from '../game/Stats.js';
import { UPGRADE_OPTIONS } from '../game/statDefs.js';
import Button from '../ui/Button.js';
import { PALETTE, INK, RADIUS, textStyle, card } from '../ui/theme.js';
import { SHELL } from '../ui/shell.js';

const CARD_WIDTH = 440;

/**
 * Modal launched by StoryScene for `{ upgrade: N }` steps.
 * The backdrop stops at the stats panel, so each point's effect shows there as it is spent.
 * Emits 'upgrade-done' on the Story scene when finished.
 */
export default class StatUpgradeScene extends Phaser.Scene {
    constructor() {
        super('StatUpgrade');
    }

    init(data) {
        this.points = data.points ?? 1;
    }

    create() {
        const { height } = this.view;
        const stats = new Stats(this);
        const cx = (SHELL.chatLeft + SHELL.chatRight) / 2;
        const cardHeight = 96 + UPGRADE_OPTIONS.length * 52 + 76;
        const top = height / 2 - cardHeight / 2;

        card(this, cx, height / 2, CARD_WIDTH, cardHeight, { backdrop: true, backdropWidth: SHELL.chatRight });
        this.add.text(cx, top + 32, '스탯 강화', textStyle(20, { weight: 700, color: INK.strong })).setOrigin(0.5, 0);
        const pointsText = this.add.text(cx, top + 62, '', textStyle(14, { color: INK.muted })).setOrigin(0.5, 0);

        const buttons = UPGRADE_OPTIONS.map((opt, i) =>
            new Button(this, cx, top + 112 + i * 52, opt.text, {
                width: CARD_WIDTH - 48,
                onClick: () => {
                    if (this.points <= 0) return;
                    stats.apply({ add: { [opt.key]: opt.amount } });
                    this.points -= 1;
                    refresh();
                },
            }));

        // Footer strip, like a modal's action row.
        const footerY = top + cardHeight - 68;
        this.add.graphics().fillStyle(PALETTE.sidebar)
            .fillRoundedRect(cx - CARD_WIDTH / 2, footerY, CARD_WIDTH, 68, { tl: 0, tr: 0, bl: RADIUS.card, br: RADIUS.card });
        const done = new Button(this, cx + CARD_WIDTH / 2 - 24 - 60, footerY + 34, '완료', {
            width: 120,
            height: 40,
            variant: 'primary',
            onClick: () => this.#finish(),
        });

        const refresh = () => {
            pointsText.setText(this.points > 0 ? `남은 포인트 ${this.points}개` : '포인트를 다 썼어요');
            buttons.forEach((b) => b.setDisabled(this.points <= 0));
            done.setDisabled(this.points > 0);
        };
        refresh();
    }

    #finish() {
        this.scene.get('Story').events.emit('upgrade-done');
        this.scene.stop();
    }
}
