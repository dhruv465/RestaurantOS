// Fixed-window counter per key, in memory. Used for guest code guesses.
// shortcut: per-process memory; move to Redis if more than one backend instance runs.
const hits = new Map();

const tooMany = (key, limit, windowMs, now = Date.now()) => {
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
        hits.set(key, { start: now, count: 1 });
        if (hits.size > 10000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
        return false;
    }
    entry.count += 1;
    return entry.count > limit;
};

module.exports = { tooMany };
