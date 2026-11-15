const test = require('node:test');
const assert = require('node:assert');
const { workedMinutes, overlapDays, splitByWeight, computePayroll } = require('./payroll');

test('worked minutes subtract breaks; open shifts count 0', () => {
    assert.strictEqual(workedMinutes({ clockIn: '2026-11-01T09:00:00Z', clockOut: '2026-11-01T17:30:00Z', breakMinutes: 30 }), 480);
    assert.strictEqual(workedMinutes({ clockIn: '2026-11-01T09:00:00Z' }), 0);
});

test('overlapDays is inclusive', () => {
    assert.strictEqual(overlapDays('2026-11-01', '2026-11-07', '2026-11-06', '2026-11-10'), 2);
    assert.strictEqual(overlapDays('2026-11-01', '2026-11-07', '2026-11-08', '2026-11-10'), 0);
    assert.strictEqual(overlapDays('2026-11-01', '2026-11-30', '2026-11-01', '2026-11-30'), 30);
});

test('splitByWeight adds up exactly', () => {
    const parts = splitByWeight(1000, [1, 1, 1]);
    assert.strictEqual(parts.reduce((s, p) => s + p, 0), 1000);
    assert.deepStrictEqual(splitByWeight(0, [5, 5]), [0, 0]);
    assert.deepStrictEqual(splitByWeight(100, [0, 0]), [0, 0]);
});

test('payroll: hourly with overtime, monthly with unpaid leave, tips by hours', () => {
    const r = computePayroll({
        period: { from: '2026-11-01', to: '2026-11-15' },
        tipsPaise: 30000,
        staff: [
            { userId: 'a', name: 'Asha', profile: { type: 'hourly', hourlyRatePaise: 12000, overtimeAfterMinutes: 480, overtimeMultiplier: 1.5 } },
            { userId: 'b', name: 'Bala', profile: { type: 'monthly', monthlySalaryPaise: 3000000, tipPool: true } },
            { userId: 'c', name: 'Chef', profile: { type: 'monthly', monthlySalaryPaise: 6000000, tipPool: false } },
        ],
        attendance: [
            { user: 'a', day: '2026-11-01', clockIn: '2026-11-01T08:00:00Z', clockOut: '2026-11-01T18:00:00Z', breakMinutes: 0 }, // 600 = 480 + 120 OT
            { user: 'b', day: '2026-11-01', clockIn: '2026-11-01T08:00:00Z', clockOut: '2026-11-01T13:00:00Z', breakMinutes: 0 }, // 300
            { user: 'c', day: '2026-11-01', clockIn: '2026-11-01T08:00:00Z', clockOut: '2026-11-01T18:00:00Z' },
        ],
        leaves: [{ user: 'b', from: '2026-11-14', to: '2026-11-20', type: 'unpaid' }],
    });
    const [a, b, c] = r.lines;
    assert.deepStrictEqual([a.basePaise, a.overtimePaise, a.tipsPaise], [96000, 36000, 20000]); // 8h×120 + 2h×180; tips 600/900
    assert.deepStrictEqual([b.basePaise, b.deductionsPaise, b.tipsPaise, b.unpaidLeaveDays], [1500000, 200000, 10000, 2]);
    assert.deepStrictEqual([c.basePaise, c.tipsPaise], [3000000, 0]);
    assert.strictEqual(r.totalPaise, a.totalPaise + b.totalPaise + c.totalPaise);
});
