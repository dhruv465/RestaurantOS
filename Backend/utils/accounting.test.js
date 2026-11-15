const test = require('node:test');
const assert = require('node:assert');
const { cashFlow, expectedCash, gstByRate, payrollCost, stockCost, profitAndLoss } = require('./accounting');

test('cashFlow counts cash by payment time, not order time', () => {
    const start = new Date('2026-11-15T00:00:00Z');
    const end = new Date('2026-11-16T00:00:00Z');
    const orders = [
        { payments: [{ method: 'Cash', amountPaise: 5000, at: '2026-11-15T10:00:00Z' }, { method: 'Card', amountPaise: 9000, at: '2026-11-15T10:00:00Z' }] },
        { payments: [{ method: 'Cash', amountPaise: 7000, at: '2026-11-14T23:59:00Z' }], refunds: [{ method: 'Cash', amountPaise: 1000, at: '2026-11-15T09:00:00Z' }] },
    ];
    assert.deepStrictEqual(cashFlow(orders, start, end), { cashInPaise: 5000, cashOutPaise: 1000 });
    assert.strictEqual(expectedCash({ openingFloatPaise: 200000, cashInPaise: 5000, cashOutPaise: 1000, tillExpensesPaise: 1500 }), 202500);
});

test('gstByRate groups paid orders and splits CGST/SGST exactly', () => {
    const rows = gstByRate([
        { paymentStatus: 'Paid', bills: { taxRatePercent: 5, totalPaise: 10600, taxPaise: 501, tipPaise: 100 } },
        { paymentStatus: 'Paid', bills: { taxRatePercent: 5, totalPaise: 2100, taxPaise: 100 } },
        { paymentStatus: 'Unpaid', bills: { taxRatePercent: 5, totalPaise: 99999, taxPaise: 999 } },
        { paymentStatus: 'Paid', orderStatus: 'Cancelled', bills: { taxRatePercent: 5, totalPaise: 1, taxPaise: 1 } },
        { paymentStatus: 'Paid', bills: { taxRatePercent: 0, totalPaise: 500, taxPaise: 0 } },
    ]);
    assert.deepStrictEqual(rows, [
        { ratePercent: 0, orders: 1, taxablePaise: 500, taxPaise: 0, cgstPaise: 0, sgstPaise: 0 },
        { ratePercent: 5, orders: 2, taxablePaise: 11999, taxPaise: 601, cgstPaise: 300, sgstPaise: 301 },
    ]);
});

test('payrollCost takes the overlapping share of finalized runs, without tips', () => {
    const runs = [
        { status: 'Finalized', from: '2026-11-01', to: '2026-11-10', totalPaise: 110000, tipsPaise: 10000 },
        { status: 'Draft', from: '2026-11-01', to: '2026-11-10', totalPaise: 999999 },
        { status: 'Paid', from: '2026-10-01', to: '2026-10-31', totalPaise: 310000 },
    ];
    // 5 of 10 days of the first run, none of October.
    assert.strictEqual(payrollCost(runs, '2026-11-06', '2026-11-20'), 50000);
});

test('stockCost and profitAndLoss', () => {
    const stock = stockCost([
        { type: 'consumption', qty: -200, unitCostPaise: 0.5 },
        { type: 'waste', qty: -10, unitCostPaise: 2 },
        { type: 'count', qty: 5, unitCostPaise: 2 },
        { type: 'purchase', qty: 1000, unitCostPaise: 0.5 },
    ]);
    assert.deepStrictEqual(stock, { foodPaise: 100, shrinkagePaise: 20 });
    const pnl = profitAndLoss({
        totals: { totalPaise: 12000, taxPaise: 500, tipPaise: 300, refundsPaise: 200 },
        expensesByCategory: [{ key: 'Rent', amountPaise: 3000 }],
        payrollPaise: 4000,
        stock,
    });
    assert.strictEqual(pnl.revenuePaise, 11000);
    assert.strictEqual(pnl.grossProfitPaise, 10880);
    assert.strictEqual(pnl.netProfitPaise, 3880);
    assert.strictEqual(pnl.marginPercent, 35.3);
});
