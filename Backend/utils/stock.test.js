const test = require('node:test');
const assert = require('node:assert');
const { newAverageCost, usageFor, recipeCost } = require('./stock');

test('weighted average cost', () => {
    assert.strictEqual(newAverageCost(1000, 0.5, 1000, 1.5), 1); // 1kg at 0.5p/g + 1kg at 1.5p/g
    assert.strictEqual(newAverageCost(-200, 9, 500, 2), 2); // negative stock is ignored
    assert.strictEqual(newAverageCost(0, 0, 0, 3), 3);
});

test('usage adds up recipes × quantity per ingredient', () => {
    const use = usageFor(
        [{ itemId: 'dal', quantity: 2 }, { itemId: 'naan', quantity: 3 }, { itemId: 'tea', quantity: 1 }],
        { dal: [{ ingredient: 'lentil', qty: 120 }, { ingredient: 'butter', qty: 10.5 }], naan: [{ ingredient: 'butter', qty: 5 }] }
    );
    assert.deepStrictEqual(Object.fromEntries(use), { lentil: 240, butter: 36 });
});

test('recipe cost and food cost %', () => {
    const r = recipeCost([{ ingredient: 'a', qty: 100 }, { ingredient: 'b', qty: 2 }], { a: { avgCostPaise: 0.8 }, b: { avgCostPaise: 500 } }, 25000);
    assert.deepStrictEqual(r, { costPaise: 1080, foodCostPercent: 4.3 });
});
