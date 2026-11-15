const test = require('node:test');
const assert = require('node:assert');
const { computeBills, buildLines, toPaise, cleanAdjustments } = require('./pricing');

const SIZE = { _id: 'g1', name: 'Size', minSelect: 1, maxSelect: 1, options: [{ _id: 'o1', name: 'Half', pricePaise: 0 }, { _id: 'o2', name: 'Full', pricePaise: 8000 }] };
const EXTRAS = { _id: 'g2', name: 'Extras', minSelect: 0, maxSelect: 2, options: [{ _id: 'o3', name: 'Cheese', pricePaise: 3000 }, { _id: 'o4', name: 'Egg', pricePaise: 2000 }] };
const PIZZA = { _id: 'p1', name: 'Pizza', price: 200, modifierGroups: ['g1', 'g2'] };

test('toPaise avoids float drift', () => {
    assert.strictEqual(toPaise(0.1 + 0.2), 30);
    assert.strictEqual(toPaise(219.99), 21999);
});

test('exclusive tax is added on top', () => {
    const b = computeBills([{ unitPaise: 22000, quantity: 2 }, { unitPaise: 4000, quantity: 1 }], { taxRatePercent: 5 });
    assert.deepStrictEqual(
        [b.subtotalPaise, b.taxPaise, b.totalPaise, b.total, b.tax, b.grandTotal],
        [48000, 2400, 50400, 480, 24, 504]
    );
});

test('inclusive tax is carved out of the price', () => {
    const b = computeBills([{ unitPaise: 10500, quantity: 1 }], { taxRatePercent: 5, taxInclusive: true });
    assert.deepStrictEqual([b.totalPaise, b.taxPaise, b.total], [10500, 500, 100]);
});

test('total + tax + tip always equals grandTotal', () => {
    const b = computeBills([{ unitPaise: 3333, quantity: 3 }], { taxRatePercent: 5.25 }, { discountType: 'percent', discountValue: 7, tipPaise: 1001 });
    assert.strictEqual(toPaise(b.total) + b.taxPaise + b.tipPaise, b.totalPaise);
});

test('discount comes off before tax, tip after', () => {
    const b = computeBills([{ unitPaise: 10000, quantity: 2 }], { taxRatePercent: 5 }, { discountType: 'percent', discountValue: 10, tipPaise: 500 });
    assert.deepStrictEqual([b.discountPaise, b.taxPaise, b.totalPaise], [2000, 900, 18000 + 900 + 500]);
    const inc = computeBills([{ unitPaise: 10500, quantity: 1 }], { taxRatePercent: 5, taxInclusive: true }, { discountType: 'flat', discountValue: 2100 });
    assert.deepStrictEqual([inc.discountPaise, inc.taxPaise, inc.totalPaise], [2100, 400, 8400]);
});

test('discount never exceeds the subtotal', () => {
    const b = computeBills([{ unitPaise: 500, quantity: 1 }], { taxRatePercent: 5 }, { discountType: 'flat', discountValue: 99999 });
    assert.deepStrictEqual([b.discountPaise, b.totalPaise], [500, 0]);
});

test('cleanAdjustments needs a reason and sane values', () => {
    assert.throws(() => cleanAdjustments({ discountType: 'percent', discountValue: 10 }), /reason/);
    assert.throws(() => cleanAdjustments({ discountType: 'percent', discountValue: 150, discountReason: 'x' }), /Invalid discount/);
    assert.throws(() => cleanAdjustments({ tipPaise: 10.5 }), /Invalid tip/);
    assert.deepStrictEqual(cleanAdjustments({ discountType: 'flat', discountValue: 5000, discountReason: ' regular ', tipPaise: 0 }),
        { discountType: 'flat', discountValue: 5000, discountReason: 'regular' });
    assert.deepStrictEqual(cleanAdjustments({}), {});
});

test('sold-out items can stay on an order but not be added or increased', () => {
    const menu = [{ _id: 'a1', name: 'Biryani', price: 300, available: false }];
    assert.throws(() => buildLines([{ id: 1, itemId: 'a1', quantity: 1 }], menu, []), /sold out/);
    assert.throws(() => buildLines([{ id: 1, itemId: 'a1', quantity: 3 }], menu, [{ id: 1, quantity: 2 }]), /sold out/);
    assert.strictEqual(buildLines([{ id: 1, itemId: 'a1', quantity: 2 }], menu, [{ id: 1, quantity: 2 }])[0].quantity, 2);
    assert.strictEqual(buildLines([{ id: 1, itemId: 'a1', quantity: 5 }], menu)[0].quantity, 5); // preview: no check
});

test('modifiers add their price and are snapshotted on the line', () => {
    const [line] = buildLines([{ itemId: 'p1', quantity: 2, modifiers: [{ groupId: 'g1', optionId: 'o2' }, { groupId: 'g2', optionId: 'o3' }] }], [PIZZA], undefined, [SIZE, EXTRAS]);
    assert.deepStrictEqual([line.unitPaise, line.price, line.modifiers.map((m) => m.name)], [31000, 620, ['Full', 'Cheese']]);
});

test('modifier rules: required, max, foreign and duplicate picks are refused', () => {
    const lines = (modifiers, prev) => buildLines([{ id: 1, itemId: 'p1', quantity: 1, modifiers }], [PIZZA], prev, [SIZE, EXTRAS]);
    assert.throws(() => lines([]), /choose 1 for Size/);
    assert.throws(() => lines([{ groupId: 'g1', optionId: 'o1' }, { groupId: 'g1', optionId: 'o2' }]), /choose 1 for Size/);
    assert.throws(() => lines([{ groupId: 'gX', optionId: 'o1' }]), /not offered/);
    assert.throws(() => lines([{ groupId: 'g1', optionId: 'o1' }, { groupId: 'g1', optionId: 'o1' }]), /twice/);
    // A line already on the order before Size became required is left alone.
    assert.strictEqual(lines([], [{ id: 1, quantity: 1 }])[0].unitPaise, 20000);
});

test('buildLines ignores client prices and validates quantity', () => {
    const menu = [{ _id: 'a1', name: 'Paneer Tikka', price: 220 }];
    const [line] = buildLines([{ itemId: 'a1', name: 'x', quantity: 2, price: 1 }], menu);
    assert.deepStrictEqual([line.name, line.unitPaise, line.price], ['Paneer Tikka', 22000, 440]);

    assert.throws(() => buildLines([{ itemId: 'a1', quantity: 0 }], menu), /Invalid quantity/);
    assert.throws(() => buildLines([{ itemId: 'zz', quantity: 1 }], menu), /Unknown menu item/);
    // legacy line without itemId matches by name
    assert.strictEqual(buildLines([{ name: 'Paneer Tikka', quantity: 1 }], menu)[0].unitPaise, 22000);
});
