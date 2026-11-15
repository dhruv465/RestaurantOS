// Pure payroll maths. Money in paise, time in minutes. All inputs are plain objects (tested in payroll.test.js).
const DAY_MS = 86400000;

// Worked minutes of one attendance entry (open entries count as 0).
const workedMinutes = (a) => (a.clockOut ? Math.max(0, Math.round((new Date(a.clockOut) - new Date(a.clockIn)) / 60000) - (a.breakMinutes || 0)) : 0);

// Inclusive count of calendar days in [from, to] that a leave [lf, lt] overlaps. Dates are 'YYYY-MM-DD'.
const overlapDays = (from, to, lf, lt) => {
    const start = Math.max(Date.parse(from), Date.parse(lf));
    const end = Math.min(Date.parse(to), Date.parse(lt));
    return end < start ? 0 : Math.round((end - start) / DAY_MS) + 1;
};

// Split total by weights; remainders go to the largest weights so the parts add up exactly.
const splitByWeight = (total, weights) => {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (!sum || !total) return weights.map(() => 0);
    const raw = weights.map((w) => (total * w) / sum);
    const parts = raw.map(Math.floor);
    let left = total - parts.reduce((s, p) => s + p, 0);
    const order = raw.map((r, i) => [r - Math.floor(r), weights[i], i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    for (const [, , i] of order) {
        if (left <= 0) break;
        parts[i] += 1;
        left -= 1;
    }
    return parts;
};

/**
 * staff: [{ userId, name, profile: { type: 'hourly'|'monthly', hourlyRatePaise, monthlySalaryPaise, overtimeAfterMinutes, overtimeMultiplier, tipPool } }]
 * attendance: [{ user, clockIn, clockOut, breakMinutes, day: 'YYYY-MM-DD' }]  (day = local date of clockIn)
 * leaves: [{ user, from, to, type: 'paid'|'unpaid'|'sick' }] approved only
 * period: { from, to } 'YYYY-MM-DD' inclusive; tipsPaise: tips taken in the period
 */
const computePayroll = ({ staff, attendance, leaves, period, tipsPaise }) => {
    const periodDays = overlapDays(period.from, period.to, period.from, period.to);
    const lines = staff.map(({ userId, name, profile }) => {
        const mine = attendance.filter((a) => String(a.user) === String(userId));
        const perDay = new Map();
        for (const a of mine) perDay.set(a.day, (perDay.get(a.day) || 0) + workedMinutes(a));
        const minutes = [...perDay.values()].reduce((s, m) => s + m, 0);
        const unpaidLeaveDays = leaves
            .filter((l) => String(l.user) === String(userId) && l.type === 'unpaid')
            .reduce((s, l) => s + overlapDays(period.from, period.to, l.from, l.to), 0);

        let basePaise = 0;
        let overtimePaise = 0;
        let overtimeMinutes = 0;
        let deductionsPaise = 0;
        if (profile?.type === 'hourly') {
            const after = profile.overtimeAfterMinutes || 0;
            for (const m of perDay.values()) overtimeMinutes += after ? Math.max(0, m - after) : 0;
            const regular = minutes - overtimeMinutes;
            basePaise = Math.round((regular * (profile.hourlyRatePaise || 0)) / 60);
            overtimePaise = Math.round((overtimeMinutes * (profile.hourlyRatePaise || 0) * (profile.overtimeMultiplier || 1)) / 60);
        } else if (profile?.type === 'monthly') {
            // shortcut: a "month" is 30 days, so a 7-day run pays 7/30 of the salary. Use calendar months if staff ask.
            const daily = (profile.monthlySalaryPaise || 0) / 30;
            basePaise = Math.round(daily * periodDays);
            deductionsPaise = Math.round(daily * Math.min(unpaidLeaveDays, periodDays));
        }
        return { user: userId, name, payType: profile?.type || 'none', minutes, overtimeMinutes, unpaidLeaveDays, basePaise, overtimePaise, deductionsPaise, tipsPaise: 0, inTipPool: profile?.tipPool !== false && minutes > 0 };
    });

    const pool = lines.filter((l) => l.inTipPool);
    splitByWeight(tipsPaise || 0, pool.map((l) => l.minutes)).forEach((t, i) => (pool[i].tipsPaise = t));
    for (const l of lines) {
        l.totalPaise = l.basePaise + l.overtimePaise + l.tipsPaise - l.deductionsPaise;
        delete l.inTipPool;
    }
    return { periodDays, tipsPaise: tipsPaise || 0, totalPaise: lines.reduce((s, l) => s + l.totalPaise, 0), lines };
};

module.exports = { workedMinutes, overlapDays, splitByWeight, computePayroll };
