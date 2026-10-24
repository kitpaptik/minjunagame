/** Accepts an Entity or an array of Entities and returns what Arcade Physics expects. */
function toPhysicsTarget(target) {
    if (Array.isArray(target)) return target.map((e) => e.ensureBody().raw);
    return target.ensureBody().raw;
}

export function createRules(scene) {
    return {
        /** Makes two things block each other. Optional callback runs on contact. */
        collide: (a, b, callback = null) =>
            scene.physics.add.collider(toPhysicsTarget(a), toPhysicsTarget(b), callback),

        /** Runs callback every frame the two things overlap (they pass through each other). */
        onOverlap: (a, b, callback) =>
            scene.physics.add.overlap(toPhysicsTarget(a), toPhysicsTarget(b), callback),
    };
}
