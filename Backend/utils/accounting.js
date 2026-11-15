// Pure money maths for the back office. All amounts are integer paise.
const { overlapDays } = require('./payroll');

const inRange = (at, start, end) => {
    const t = new Date(at).getTime();
    return t >= start.getTime() && t < end.getTime();
};

// Cash that went into / out of the till between start and end, by payment/refund time (not order time).
const cashFlow = (orders, start, end) => {
    let inPaise = 0;
    let outPaise = 0;
    for (const o of orders) {
        for (const p of o.payments || []) if (p.method === 'Cash' && inRange(p.at, start, end)) inPaise += p.amountPaise;
        for (const r of o.refunds || []) if (r.method === 'Cash' && inRange(r.at, start, end)) outPaise += r.amountPaise;
    }
    return { cashInPaise: inPaise, cashOutPaise: outPaise };
};

const expectedCash = ({ openingFloatPaise = 0, cashInPaise = 0, cashOutPaise = 0, tillExpensesPaise = 0 }) =>
    openingFloatPaise + cashInPaise - cashOutPaise - tillExpensesPaise;

// Paid orders' tax grouped by rate. Taxable value = what the guest paid before tax and tip.
// shortcut: assumes intra-state sale (CGST + SGST halves); refunds are not netted off. Add IGST/credit notes when needed.
const gstByRate = (orders) => {
    const byRate = new Map();
    for (const o of orders) {
        if (o.orderStatus === 'Cancelled' || o.paymentStatus !== 'Paid') continue;
        const b = o.bills || {};
        const rate = b.taxRatePercent || 0;
        const row = byRate.get(rate) || { ratePercent: rate, orders: 0, taxablePaise: 0, taxPaise: 0 };
        row.orders += 1;
        row.taxablePaise += (b.totalPaise || 0) - (b.taxPaise || 0) - (b.tipPaise || 0);
        row.taxPaise += b.taxPaise || 0;
        byRate.set(rate, row);
    }
    return [...byRate.values()]
        .sort((a, b) => a.ratePercent - b.ratePercent)
        .map((r) => ({ ...r, cgstPaise: Math.floor(r.taxPaise / 2), sgstPaise: r.taxPaise - Math.floor(r.taxPaise / 2) }));
};

// Staff cost from finalized/paid payroll runs, spread evenly over each run's days so a range only takes its share.
// Tips are left out: they came from guests and went straight to staff, so they are neither revenue nor cost.
const payrollCost = (runs, from, to) =>
    runs.reduce((sum, run) => {
        if (!['Finalized', 'Paid'].includes(run.status)) return sum;
        const runDays = overlapDays(run.from, run.to, run.from, run.to);
        const share = overlapDays(from, to, run.from, run.to);
        return runDays ? sum + Math.round(((run.totalPaise - (run.tipsPaise || 0)) * share) / runDays) : sum;
    }, 0);

// Stock used, at the cost recorded on each movement. Consumption = food cost; waste and count/adjust losses = shrinkage.
const stockCost = (movements) => {
    let foodPaise = 0;
    let shrinkagePaise = 0;
    for (const m of movements) {
        if (m.qty >= 0) continue;
        const cost = Math.round(-m.qty * (m.unitCostPaise || 0));
        if (m.type === 'consumption') foodPaise += cost;
        else if (['waste', 'count', 'adjust'].includes(m.type)) shrinkagePaise += cost;
    }
    return { foodPaise, shrinkagePaise };
};

// totals: from utils/reports#summarize. Revenue is net of tax, tips and refunds.
// shortcut: refunds are taken off in full (tax part included) since refunds don't record their tax split.
const profitAndLoss = ({ totals, expensesByCategory = [], payrollPaise = 0, stock = { foodPaise: 0, shrinkagePaise: 0 } }) => {
    const revenuePaise = totals.totalPaise - totals.taxPaise - totals.tipPaise - totals.refundsPaise;
    const expensesPaise = expensesByCategory.reduce((s, e) => s + e.amountPaise, 0);
    const grossProfitPaise = revenuePaise - stock.foodPaise - stock.shrinkagePaise;
    const netProfitPaise = grossProfitPaise - payrollPaise - expensesPaise;
    return {
        revenuePaise,
        foodCostPaise: stock.foodPaise,
        shrinkagePaise: stock.shrinkagePaise,
        grossProfitPaise,
        payrollPaise,
        expensesPaise,
        expensesByCategory,
        netProfitPaise,
        marginPercent: revenuePaise > 0 ? Math.round((netProfitPaise / revenuePaise) * 1000) / 10 : null,
    };
};

module.exports = { cashFlow, expectedCash, gstByRate, payrollCost, stockCost, profitAndLoss };
