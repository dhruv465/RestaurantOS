// Pure: turn a list of orders into a sales summary. Money in paise; local dates/hours in the restaurant's timezone.
const localParts = (date, timezone) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(date)).map((p) => [p.type, p.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
};

const bump = (map, key, fields) => {
    const row = map.get(key) || { key };
    for (const [k, v] of Object.entries(fields)) row[k] = (row[k] || 0) + v;
    map.set(key, row);
};
const rows = (map, sortKey) => [...map.values()].sort((a, b) => (sortKey ? b[sortKey] - a[sortKey] : String(a.key).localeCompare(String(b.key))));

const summarize = (orders, timezone, staffNames = {}) => {
    const totals = { orders: 0, subtotalPaise: 0, discountPaise: 0, taxPaise: 0, tipPaise: 0, totalPaise: 0, refundsPaise: 0, cancelled: 0 };
    const byDay = new Map(), byHour = new Map(), byMethod = new Map(), byItem = new Map(), byType = new Map(), byStaff = new Map(), cancelReasons = new Map(), discountReasons = new Map();

    for (const o of orders) {
        if (o.orderStatus === 'Cancelled') {
            // Merged orders aren't lost sales; their lines live on in the order they joined.
            if (!o.cancel?.mergedInto) {
                totals.cancelled += 1;
                bump(cancelReasons, o.cancel?.reason || 'No reason', { count: 1 });
            }
            continue;
        }
        // Orders from before checkout v2 have no paymentStatus and rupee-only bills: Completed meant paid.
        const legacy = !o.paymentStatus;
        if (legacy ? o.orderStatus !== 'Completed' : o.paymentStatus !== 'Paid') continue;
        const raw = o.bills || {};
        const toP = (r) => Math.round((r || 0) * 100);
        const b = {
            subtotalPaise: raw.subtotalPaise ?? toP(raw.total),
            discountPaise: raw.discountPaise || 0,
            taxPaise: raw.taxPaise ?? toP(raw.tax),
            tipPaise: raw.tipPaise || 0,
            totalPaise: raw.totalPaise ?? toP(raw.grandTotal),
        };
        const payments = o.payments?.length ? o.payments : legacy && o.paymentMethod ? [{ method: o.paymentMethod, amountPaise: b.totalPaise }] : [];
        const { day, hour } = localParts(o.createdAt, timezone);
        const refunds = (o.refunds || []).reduce((s, r) => s + r.amountPaise, 0);
        totals.orders += 1;
        totals.subtotalPaise += b.subtotalPaise || 0;
        totals.discountPaise += b.discountPaise || 0;
        totals.taxPaise += b.taxPaise || 0;
        totals.tipPaise += b.tipPaise || 0;
        totals.totalPaise += b.totalPaise || 0;
        totals.refundsPaise += refunds;
        bump(byDay, day, { orders: 1, totalPaise: b.totalPaise || 0, refundsPaise: refunds });
        bump(byHour, hour, { orders: 1, totalPaise: b.totalPaise || 0 });
        bump(byType, o.type || 'Dine-in', { orders: 1, totalPaise: b.totalPaise || 0 });
        bump(byStaff, staffNames[String(o.createdBy)] || 'Guest QR / unknown', { orders: 1, totalPaise: b.totalPaise || 0 });
        for (const p of payments) bump(byMethod, p.method, { paidPaise: p.amountPaise, refundedPaise: 0 });
        for (const r of o.refunds || []) bump(byMethod, r.method, { paidPaise: 0, refundedPaise: r.amountPaise });
        for (const l of o.items || []) bump(byItem, l.name, { quantity: l.quantity, revenuePaise: (l.unitPaise ?? Math.round((l.price / l.quantity) * 100)) * l.quantity });
        if (b.discountPaise > 0) bump(discountReasons, o.adjustments?.discountReason || 'No reason', { count: 1, discountPaise: b.discountPaise });
    }
    totals.netPaise = totals.totalPaise - totals.refundsPaise;
    totals.averagePaise = totals.orders ? Math.round(totals.totalPaise / totals.orders) : 0;
    return {
        totals,
        byDay: rows(byDay),
        byHour: rows(byHour).sort((a, b) => a.key - b.key),
        byMethod: rows(byMethod, 'paidPaise'),
        byItem: rows(byItem, 'revenuePaise'),
        byType: rows(byType, 'totalPaise'),
        byStaff: rows(byStaff, 'totalPaise'),
        cancelReasons: rows(cancelReasons, 'count'),
        discountReasons: rows(discountReasons, 'discountPaise'),
    };
};

module.exports = { summarize, localParts };
