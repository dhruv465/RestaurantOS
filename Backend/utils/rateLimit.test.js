const test = require('node:test');
const assert = require('node:assert');
const { tooMany } = require('./rateLimit');

test('allows up to the limit, then blocks until the window passes', () => {
    for (let i = 0; i < 3; i++) assert.equal(tooMany('k', 3, 1000, 0), false);
    assert.equal(tooMany('k', 3, 1000, 10), true);
    assert.equal(tooMany('k', 3, 1000, 1000), false);
});
