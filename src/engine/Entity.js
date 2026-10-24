import { toColor, toXY } from './utils.js';

/**
 * Chainable wrapper around a Phaser game object.
 * Level code talks to Entity; `entity.raw` is the escape hatch to the Phaser object.
 */
export default class Entity {
    constructor(gameObject) {
        this.raw = gameObject;
    }

    get body() {
        return this.raw.body;
    }

    get isStatic() {
        return this.raw.body instanceof Phaser.Physics.Arcade.StaticBody;
    }

    // ---- Transform ---------------------------------------------------------

    at(x, y) {
        this.raw.setPosition(x, y);
        this.#syncStaticBody();
        return this;
    }

    setX(x) {
        return this.at(x, this.raw.y);
    }

    setY(y) {
        return this.at(this.raw.x, y);
    }

    getX() {
        return this.raw.x;
    }

    getY() {
        return this.raw.y;
    }

    scale(x, y = x) {
        this.raw.setScale(x, y);
        this.#syncStaticBody();
        return this;
    }

    flip(flipped = true) {
        this.raw.setFlipX?.(flipped);
        return this;
    }

    tint(color) {
        this.raw.setTint?.(toColor(color));
        return this;
    }

    depth(value) {
        this.raw.setDepth(value);
        return this;
    }

    // ---- Physics -----------------------------------------------------------

    /**
     * Gives the entity an Arcade body.
     * Options: static, gravity, bounce, drag, friction, weight, hitbox, speedLimit, bounded.
     */
    physics(opts = {}) {
        const {
            static: isStatic = false,
            gravity = true,
            bounce = 0,
            drag = 0,
            friction = 0,
            weight = null,
            hitbox = null,
            speedLimit = null,
            bounded = true,
        } = opts;

        const scene = this.raw.scene;
        if (!scene) return this;

        if (this.raw.body && this.isStatic !== isStatic) {
            scene.physics.world.disableBody(this.raw.body);
            this.raw.body.destroy();
            this.raw.body = null;
        }
        if (!this.raw.body) {
            scene.physics.add.existing(this.raw, isStatic);
        }

        const body = this.raw.body;
        if (hitbox) {
            body.setSize(hitbox.width, hitbox.height);
            body.setOffset(hitbox.offsetX ?? 0, hitbox.offsetY ?? 0);
        }

        if (isStatic) {
            body.updateFromGameObject();
            return this;
        }

        const b = toXY(bounce);
        const d = toXY(drag);
        const f = toXY(friction);
        body.setAllowGravity(gravity);
        body.setCollideWorldBounds(bounded);
        body.setBounce(b.x, b.y);
        body.setDrag(d.x, d.y);
        body.setFriction(f.x, f.y);
        if (weight !== null) body.setMass(weight);
        if (speedLimit) body.setMaxVelocity(speedLimit.x ?? 10000, speedLimit.y ?? 10000);
        return this;
    }

    /** Adds a dynamic body if the entity has none yet. Used by rules.collide/onOverlap. */
    ensureBody() {
        if (!this.raw.body) this.physics();
        return this;
    }

    setVelocity(x, y) {
        this.#dynamicBody()?.setVelocity(x, y);
        return this;
    }

    moveLeft(speed) {
        this.#dynamicBody()?.setVelocityX(-speed);
        return this;
    }

    moveRight(speed) {
        this.#dynamicBody()?.setVelocityX(speed);
        return this;
    }

    stop() {
        this.#dynamicBody()?.setVelocityX(0);
        return this;
    }

    jump(force) {
        this.#dynamicBody()?.setVelocityY(-force);
        return this;
    }

    isGrounded() {
        const body = this.raw.body;
        if (!body) return false;
        return body.blocked.down || body.touching.down;
    }

    // ---- Animation ---------------------------------------------------------

    /**
     * Registers spritesheet animations.
     * Example: animations({ states: { run: { start: 0, end: 5, speed: 12, loop: true } } })
     */
    animations({ states = {} } = {}) {
        const scene = this.raw.scene;
        const textureKey = this.raw.texture.key;
        for (const [name, cfg] of Object.entries(states)) {
            const animKey = `${textureKey}_${name}`;
            if (scene.anims.exists(animKey)) continue;
            scene.anims.create({
                key: animKey,
                frames: scene.anims.generateFrameNumbers(textureKey, { start: cfg.start, end: cfg.end }),
                frameRate: cfg.speed ?? 10,
                repeat: cfg.loop ? -1 : 0,
            });
        }
        return this;
    }

    play(name) {
        this.raw.anims?.play(`${this.raw.texture.key}_${name}`, true);
        return this;
    }

    destroy() {
        this.raw.destroy();
    }

    // ---- Internals ---------------------------------------------------------

    #dynamicBody() {
        const body = this.raw.body;
        return body && !this.isStatic ? body : null;
    }

    /** Static bodies don't follow their game object, so resync after moves/scales. */
    #syncStaticBody() {
        if (this.isStatic) this.raw.body.updateFromGameObject();
    }
}
