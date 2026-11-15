const test = require('node:test');
const assert = require('node:assert');
const { newAverageCost, usageFor, dishesFor, usageSummary, recipeCost } = require('./stock');

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

test('dishes per ingredient: same dish adds up, each dish keeps its own grams', () => {
    const d = dishesFor(
        [{ itemId: 'roti', name: 'Bajri roti', quantity: 4 }, { itemId: 'roti', name: 'Bajri roti', quantity: 2 }, { itemId: 'khichdi', name: 'Khichdi', quantity: 1 }],
        { roti: [{ ingredient: 'bajri', qty: 60 }], khichdi: [{ ingredient: 'bajri', qty: 80 }, { ingredient: 'ghee', qty: 10 }] }
    );
    assert.deepStrictEqual(d.get('bajri'), [{ name: 'Bajri roti', quantity: 6, qty: 360 }, { name: 'Khichdi', quantity: 1, qty: 80 }]);
    assert.deepStrictEqual(d.get('ghee'), [{ name: 'Khichdi', quantity: 1, qty: 10 }]);
});

test('usage summary: 25 kg bought, 12 rotis, some waste, a count correction', () => {
    const s = usageSummary(500, [
        { type: 'purchase', qty: 25000, unitCostPaise: 4 },
        { type: 'consumption', qty: -240, unitCostPaise: 4, dishes: [{ name: 'Bajri roti', quantity: 4, qty: 240 }] },
        { type: 'consumption', qty: -480, unitCostPaise: 4, dishes: [{ name: 'Bajri roti', quantity: 8, qty: 480 }] },
        { type: 'waste', qty: -300, unitCostPaise: 4 },
        { type: 'count', qty: -20 },
    ]);
    assert.deepStrictEqual(s, {
        start: 500, bought: 25000, used: 720, wasted: 300, corrected: -20, usedCostPaise: 2880, wastedCostPaise: 1200,
        dishes: { 'Bajri roti': { quantity: 12, qty: 720 } }, left: 24460,
    });
});
