const test = require('node:test');
const assert = require('node:assert');
const { dayRange } = require('./reservationController');

test('a day in Kolkata starts at 18:30 UTC the day before', () => {
    const [from, to] = dayRange('2026-11-15', 'Asia/Kolkata');
    assert.strictEqual(from.toISOString(), '2026-11-14T18:30:00.000Z');
    assert.strictEqual(to.toISOString(), '2026-11-15T18:30:00.000Z');
    assert.strictEqual(dayRange('2026-11-15', 'UTC')[0].toISOString(), '2026-11-15T00:00:00.000Z');
});
