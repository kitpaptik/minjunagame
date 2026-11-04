import { SETTINGS } from '../config.js';
import { PALETTE, INK, RADIUS, role, textStyle } from './theme.js';
import { SHELL } from './shell.js';
import Button from './Button.js';

const AVATAR = 40;
const TEXT_X = SHELL.chatLeft + 72;              // where message text starts
const TEXT_WIDTH = SHELL.chatRight - TEXT_X - 32;
const MAX_ROWS = 80;                             // older rows are destroyed

/**
 * The story as a chat channel. Lines pile up from the bottom like messages:
 * a speaker's first line gets an avatar, name and time; their next lines group under it.
 * Narration is a muted system row, title cards are date-style dividers, choices are message buttons.
 *
 * StoryScene drives it with say(), divider(), choices() and waits on isTyping / finishTyping().
 */
export default class ChatFeed {
    constructor(scene) {
        this.scene = scene;
        const { height } = scene.view;
        this.top = SHELL.headerHeight;
        this.bottom = height - SHELL.inputHeight;
        this.cursorY = 16;
        this.rows = [];
        this.lastSpeaker = null;
        this.clock = 8 * 60 + Phaser.Math.Between(0, 20); // in-story time, minutes since midnight
        this.typingEvent = null;

        // Rows that scroll past the top slide under the opaque channel header (drawn above at depth 30).
        this.content = scene.add.container(0, this.top).setDepth(10);

        this.#buildInputBar();
    }

    // ---- Public API --------------------------------------------------------

    get isTyping() {
        return this.typingEvent !== null;
    }

    /** A spoken line (speaker) or narration (speaker = null), typed out. */
    say(speaker, text) {
        this.finishTyping();
        if (speaker) this.#message(speaker, text);
        else this.#narration(text);
        this.setHint('클릭하거나 SPACE를 눌러 계속');
    }

    finishTyping() {
        if (!this.typingEvent) return;
        this.typingEvent.remove();
        this.typingEvent = null;
        this.typingTarget.setText(this.typingFull);
    }

    /** "Day 1" title cards become a divider across the channel. */
    divider(title, sub) {
        this.finishTyping();
        this.lastSpeaker = null;
        const cx = (SHELL.chatLeft + SHELL.chatRight) / 2;
        const y = this.cursorY + 18;
        const titleText = this.scene.add.text(cx, y, title, textStyle(20, { weight: 700, color: INK.strong })).setOrigin(0.5, 0);
        const subText = this.scene.add.text(cx, y + 30, sub ?? '', textStyle(14, { color: INK.muted })).setOrigin(0.5, 0);
        const lineY = y + 14;
        const gap = titleText.width / 2 + 16;
        const line = this.scene.add.graphics().lineStyle(1, PALETTE.raised)
            .lineBetween(SHELL.chatLeft + 16, lineY, cx - gap, lineY)
            .lineBetween(cx + gap, lineY, SHELL.chatRight - 16, lineY);
        this.#addRow([line, titleText, subText], sub ? 66 : 46);
        this.setHint('클릭하거나 SPACE를 눌러 계속');
    }

    /** A one-liner from the game itself, such as a surprise event's alert. tone: 'bad' | 'warn' | undefined (muted). */
    system(text, tone) {
        this.finishTyping();
        this.lastSpeaker = null;
        const t = this.scene.add.text(TEXT_X, this.cursorY + 8, text, textStyle(14, { weight: tone ? 700 : 400, color: INK[tone] ?? INK.muted }));
        this.#addRow([t], t.height + 10);
    }

    /**
     * Message buttons for a choice. Returns the Button objects (in option order).
     * spec: [{ label, locked: bool, onClick, onDisabledClick }]
     */
    choices(specs) {
        this.finishTyping();
        this.lastSpeaker = null;
        const width = Math.min(460, TEXT_WIDTH);
        const y0 = this.cursorY + 12;
        const label = this.scene.add.text(TEXT_X, y0, '어떻게 할까?', textStyle(14, { color: INK.muted }));
        const buttons = specs.map((spec, i) => new Button(this.scene, TEXT_X + width / 2, y0 + 44 + i * 48, spec.label, {
            width,
            height: 40,
            fontSize: 15,
            align: 'left',
            variant: 'secondary',
            disabled: spec.locked,
            onClick: spec.onClick,
            onDisabledClick: spec.onDisabledClick,
        }));
        this.#addRow([label, ...buttons], 34 + specs.length * 48 + 8);
        this.setHint(`클릭하거나 숫자키 1~${specs.length}로 고르기`);
        return buttons;
    }

    setHint(text) {
        this.hintText = text;
        this.hint.setText(text).setColor(INK.faint);
    }

    /** Briefly shows why something can't be done (a locked choice) in the input bar, in the danger colour. */
    warn(text) {
        this.warnTimer?.remove();
        this.hint.setText(text).setColor(INK.bad);
        this.warnTimer = this.scene.time.delayedCall(1600, () => this.hint.setText(this.hintText).setColor(INK.faint));
    }

    // ---- Rows --------------------------------------------------------------

    #message(speaker, text) {
        const grouped = speaker === this.lastSpeaker;
        this.lastSpeaker = speaker;
        this.clock += Phaser.Math.Between(0, 2);
        const objects = [];
        let y = this.cursorY + (grouped ? 2 : 16);

        if (!grouped) {
            const { ink: color, fill } = role(speaker);
            const avatarX = SHELL.chatLeft + 16 + AVATAR / 2;
            objects.push(
                this.scene.add.circle(avatarX, y + AVATAR / 2, AVATAR / 2, fill),
                this.scene.add.text(avatarX, y + AVATAR / 2, [...speaker][0], textStyle(17, { weight: 700, color: INK.white }))
                    .setOrigin(0.5),
            );
            const name = this.scene.add.text(TEXT_X, y, speaker, textStyle(16, { weight: 500, color }));
            const time = this.scene.add.text(TEXT_X + name.width + 8, y + 3, this.#timeLabel(), textStyle(12, { color: INK.muted }));
            objects.push(name, time);
            y += 22;
        }
        const [body, bodyHeight] = this.#typedText(TEXT_X, y, text, textStyle(16, {
            color: INK.text,
            lineSpacing: 4,
            wordWrap: { width: TEXT_WIDTH, useAdvancedWrap: true },
        }));
        objects.push(body);
        this.#addRow(objects, (y - this.cursorY) + bodyHeight + 2);
    }

    #narration(text) {
        this.lastSpeaker = null;
        const [body, bodyHeight] = this.#typedText(TEXT_X, this.cursorY + 12, text, textStyle(15, {
            color: INK.muted,
            lineSpacing: 4,
            wordWrap: { width: TEXT_WIDTH, useAdvancedWrap: true },
        }));
        this.#addRow([body], bodyHeight + 14);
    }

    /** Creates the text at full size to measure the height it will need, then types it out. Returns [text, height]. */
    #typedText(x, y, full, style) {
        const t = this.scene.add.text(x, y, full, style);
        const height = t.height;
        t.setText('');
        this.typingTarget = t;
        this.typingFull = full;
        let shown = 0;
        this.typingEvent = this.scene.time.addEvent({
            delay: SETTINGS.textSpeed,
            repeat: full.length - 1,
            callback: () => {
                shown += 1;
                t.setText(full.slice(0, shown));
                if (shown >= full.length) this.typingEvent = null;
            },
        });
        return [t, height];
    }

    #addRow(objects, height) {
        this.content.add(objects);
        this.rows.push(objects);
        this.cursorY += height;
        while (this.rows.length > MAX_ROWS) this.rows.shift().forEach((o) => o.destroy());

        // Keep the newest row just above the input bar; older rows slide up out of view.
        const visible = this.bottom - this.top - 12;
        const targetY = this.top + Math.min(0, visible - this.cursorY);
        this.scene.tweens.add({ targets: this.content, y: targetY, duration: 140, ease: 'Sine.easeOut' });
    }

    #timeLabel() {
        const h = Math.floor(this.clock / 60) % 24;
        const m = String(this.clock % 60).padStart(2, '0');
        return `오늘 ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
    }

    #buildInputBar() {
        const left = SHELL.chatLeft + 16;
        const width = SHELL.chatRight - SHELL.chatLeft - 32;
        const y = this.bottom + 32;
        // Opaque strip so rows never show through below the newest message.
        const strip = this.scene.add.rectangle(SHELL.chatLeft, this.bottom, SHELL.chatRight - SHELL.chatLeft, SHELL.inputHeight, PALETTE.chat)
            .setOrigin(0, 0).setDepth(20);
        const bar = this.scene.add.graphics().setDepth(20).fillStyle(PALETTE.input)
            .fillRoundedRect(left, y - 22, width, 44, RADIUS.card);
        this.hint = this.scene.add.text(left + 16, y, '', textStyle(15, { color: INK.faint })).setOrigin(0, 0.5).setDepth(21);
        this.inputBar = [strip, bar, this.hint];
    }
}
