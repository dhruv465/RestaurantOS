const test = require('node:test');
const assert = require('node:assert');
const { normalizePhone, pointsToPay, pointsEarned } = require('./loyalty');

test('normalizePhone keeps the 10-digit number', () => {
    assert.equal(normalizePhone('+91 98765-43210'), '9876543210');
    assert.equal(normalizePhone('09876543210'), '9876543210');
    assert.equal(normalizePhone('98765 43210'), '9876543210');
    assert.equal(normalizePhone('12'), '12');
});

test('points round in the restaurant\'s favour', () => {
    assert.equal(pointsToPay(250, 100), 3); // ₹2.50 at ₹1/point needs 3 points
    assert.equal(pointsEarned(54000, 1), 5); // ₹540 at 1 point per ₹100
    assert.equal(pointsEarned(9999, 1), 0);
    assert.equal(pointsEarned(100000, 5), 50);
});
