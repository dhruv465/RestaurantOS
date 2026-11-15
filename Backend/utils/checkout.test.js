const test = require('node:test');
const assert = require('node:assert');
const { paymentStatusFor, cleanPayments, refundable } = require('./checkout');

test('payment status follows the amount paid', () => {
    assert.strictEqual(paymentStatusFor(0, 1000), 'Unpaid');
    assert.strictEqual(paymentStatusFor(400, 1000), 'Partial');
    assert.strictEqual(paymentStatusFor(1000, 1000), 'Paid');
});

test('refundable = paid minus refunded, online tracked separately', () => {
    const order = {
        payments: [{ method: 'Cash', amountPaise: 30000 }, { method: 'Online', amountPaise: 20000 }],
        refunds: [{ method: 'Online', amountPaise: 5000 }, { method: 'Cash', amountPaise: 1000 }],
    };
    assert.deepStrictEqual(refundable(order), { totalPaise: 44000, onlinePaise: 15000, pointsPaise: 0 });
    assert.deepStrictEqual(refundable({ payments: [], refunds: [] }), { totalPaise: 0, onlinePaise: 0, pointsPaise: 0 });
});

test('cash change is tendered minus amount; bad payments are refused', () => {
    const [cash, card] = cleanPayments([{ method: 'Cash', amountPaise: 45000, tenderedPaise: 50000 }, { method: 'Card', amountPaise: 100, tenderedPaise: 999 }]);
    assert.deepStrictEqual([cash.changePaise, card.tenderedPaise, card.changePaise], [5000, 100, 0]);
    assert.throws(() => cleanPayments([{ method: 'Cash', amountPaise: 500, tenderedPaise: 400 }]), /less than/);
    assert.throws(() => cleanPayments([{ method: 'Online', amountPaise: 500 }]), /method/);
    assert.throws(() => cleanPayments([{ method: 'UPI', amountPaise: 10.5 }]), /amount/);
});
