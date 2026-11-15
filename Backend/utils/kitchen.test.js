const test = require('node:test');
const assert = require('node:assert');
const { kitchenDelta, groupByStation } = require('./kitchen');

test('new order sends every line', () => {
    const next = [{ id: 1, name: 'Dal', quantity: 2 }, { id: 2, name: 'Naan', quantity: 3, station: 'Tandoor' }];
    assert.deepStrictEqual(kitchenDelta([], next).map((l) => [l.name, l.quantity]), [['Dal', 2], ['Naan', 3]]);
});

test('update sends only added quantity and new lines', () => {
    const prev = [{ id: 1, name: 'Dal', quantity: 2 }];
    const next = [{ id: 1, name: 'Dal', quantity: 3 }, { id: 2, name: 'Naan', quantity: 1 }];
    assert.deepStrictEqual(kitchenDelta(prev, next).map((l) => [l.name, l.quantity]), [['Dal', 1], ['Naan', 1]]);
});

test('removed or reduced lines become cancels, unchanged lines send nothing', () => {
    const prev = [{ id: 1, name: 'Dal', quantity: 2 }, { id: 2, name: 'Naan', quantity: 4 }, { id: 3, name: 'Rice', quantity: 1 }];
    const next = [{ id: 2, name: 'Naan', quantity: 1 }, { id: 3, name: 'Rice', quantity: 1 }];
    assert.deepStrictEqual(kitchenDelta(prev, next).map((l) => [l.name, l.quantity]), [['Naan', -3], ['Dal', -2]]);
});

test('a changed note alone sends a quantity-0 line; modifiers travel as names', () => {
    const prev = [{ id: 1, name: 'Dal', quantity: 2, instructions: '' }];
    const next = [{ id: 1, name: 'Dal', quantity: 2, instructions: 'no onion', modifiers: [{ name: 'Full' }] }];
    assert.deepStrictEqual(kitchenDelta(prev, next).map((l) => [l.quantity, l.instructions, l.modifiers]), [[0, 'no onion', ['Full']]]);
    assert.deepStrictEqual(kitchenDelta(next, next), []);
});

test('lines go to their station, unknown stations to the first one', () => {
    const groups = groupByStation(
        [{ name: 'Dal', station: 'Kitchen', quantity: 1 }, { name: 'Naan', station: 'Tandoor', quantity: 1 }, { name: 'Lassi', station: 'Gone', quantity: 1 }],
        ['Kitchen', 'Tandoor']
    );
    assert.deepStrictEqual(Object.keys(groups), ['Kitchen', 'Tandoor']);
    assert.deepStrictEqual(groups.Kitchen.map((l) => l.name), ['Dal', 'Lassi']);
    assert.strictEqual(groups.Tandoor[0].station, undefined);
});
