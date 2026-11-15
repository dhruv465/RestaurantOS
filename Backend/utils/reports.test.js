const test = require('node:test');
const assert = require('node:assert');
const { summarize, localParts } = require('./reports');

test('local day and hour follow the restaurant timezone', () => {
    // 20:00 UTC = 01:30 next day in India
    assert.deepStrictEqual(localParts('2026-11-14T20:00:00Z', 'Asia/Kolkata'), { day: '2026-11-15', hour: 1 });
});

test('paid orders count; unpaid and merged ones do not; cancels are tallied', () => {
    const paid = {
        orderStatus: 'Completed', paymentStatus: 'Paid', type: 'Takeaway', createdAt: '2026-11-15T06:00:00Z', createdBy: 'u1',
        bills: { subtotalPaise: 20000, discountPaise: 2000, taxPaise: 900, tipPaise: 500, totalPaise: 19400 },
        adjustments: { discountReason: 'Regular' },
        items: [{ name: 'Dal', quantity: 2, unitPaise: 10000 }],
        payments: [{ method: 'Cash', amountPaise: 10000 }, { method: 'UPI', amountPaise: 9400 }],
        refunds: [{ method: 'Cash', amountPaise: 1000 }],
    };
    const r = summarize([
        paid,
        { orderStatus: 'In Progress', paymentStatus: 'Unpaid', bills: { totalPaise: 999 } },
        { orderStatus: 'Cancelled', cancel: { reason: 'Customer left' } },
        { orderStatus: 'Cancelled', cancel: { reason: 'Merged into X', mergedInto: 'x' } },
    ], 'Asia/Kolkata', { u1: 'Asha' });
    assert.strictEqual(r.totals.orders, 1);
    assert.strictEqual(r.totals.netPaise, 18400);
    assert.strictEqual(r.totals.cancelled, 1);
    assert.deepStrictEqual(r.byDay, [{ key: '2026-11-15', orders: 1, totalPaise: 19400, refundsPaise: 1000 }]);
    assert.deepStrictEqual(r.byMethod.map((m) => [m.key, m.paidPaise, m.refundedPaise]), [['Cash', 10000, 1000], ['UPI', 9400, 0]]);
    assert.deepStrictEqual(r.byItem, [{ key: 'Dal', quantity: 2, revenuePaise: 20000 }]);
    assert.strictEqual(r.byStaff[0].key, 'Asha');
    assert.strictEqual(r.discountReasons[0].key, 'Regular');
});

test('old orders (no paymentStatus, rupee bills) still count when Completed', () => {
    const r = summarize([{ orderStatus: 'Completed', paymentMethod: 'Cash', createdAt: '2026-01-01T06:00:00Z', bills: { total: 100, tax: 5, grandTotal: 105 }, items: [{ name: 'Tea', quantity: 2, price: 100 }] }], 'Asia/Kolkata');
    assert.strictEqual(r.totals.totalPaise, 10500);
    assert.deepStrictEqual(r.byMethod.map((m) => [m.key, m.paidPaise]), [['Cash', 10500]]);
    assert.deepStrictEqual(r.byItem, [{ key: 'Tea', quantity: 2, revenuePaise: 10000 }]);
});
