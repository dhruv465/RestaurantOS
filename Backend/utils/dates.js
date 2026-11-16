// Start/end of a calendar day in the restaurant's timezone, as UTC instants.
const dayRange = (yyyyMmDd, timezone) => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const guess = Date.UTC(y, m - 1, d);
    // Offset of the timezone at that date, e.g. +330 min for Asia/Kolkata.
    const local = new Date(new Date(guess).toLocaleString('en-US', { timeZone: timezone }));
    const offset = local.getTime() - new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const start = new Date(guess - offset);
    return [start, new Date(start.getTime() + 24 * 3600 * 1000)];
};

module.exports = { dayRange };
