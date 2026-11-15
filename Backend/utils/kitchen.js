// Turns order changes into kitchen tickets (KOTs). Saved order lines count as already sent to the kitchen.
const Kot = require('../models/kotModel');
const Order = require('../models/orderModel');
const Table = require('../models/tableModel');
const Counter = require('../models/counterModel');
const Settings = require('../models/settingsModel');
const { emit } = require('./realtime');

const lineKey = (l) => String(l.id ?? l.itemId ?? l.name);
const modifierNames = (l) => (l.modifiers || []).map((m) => m.name);

// Pure: what changed between the saved lines and the new lines. Negative quantity = cancel.
const kitchenDelta = (prevItems = [], nextItems = []) => {
    const prev = new Map(prevItems.map((l) => [lineKey(l), l]));
    const out = [];
    for (const l of nextItems) {
        const p = prev.get(lineKey(l));
        prev.delete(lineKey(l));
        const quantity = l.quantity - (p?.quantity || 0);
        const noteChanged = p && (p.instructions || '') !== (l.instructions || '');
        // quantity 0 = same food, new note for the kitchen.
        if (quantity || noteChanged) {
            out.push({ lineId: l.id, name: l.name, station: l.station, quantity, instructions: l.instructions, prepMinutes: l.prepMinutes, modifiers: modifierNames(l) });
        }
    }
    for (const p of prev.values()) {
        out.push({ lineId: p.id, name: p.name, station: p.station, quantity: -p.quantity, instructions: p.instructions, modifiers: modifierNames(p) });
    }
    return out;
};

// Pure: { stationName: [lines] }. Lines whose station no longer exists go to the first station.
const groupByStation = (lines, stations = ['Kitchen']) => {
    const groups = {};
    for (const { station, ...line } of lines) {
        const name = stations.includes(station) ? station : stations[0] || 'Kitchen';
        (groups[name] ||= []).push(line);
    }
    return groups;
};

// DB-backed: create the tickets for an order change and tell the kitchen screens.
const sendToKitchen = async (order, prevItems, user) => {
    if (order.kitchenHeld) return []; // scheduled for later; utils/scheduler.js sends the whole order when it is time
    const lines = kitchenDelta(prevItems, order.items);
    if (!lines.length) return [];

    const settings = await Settings.load();
    const table = order.table ? await Table.findById(order.table).select('tableNo') : null;
    const kots = [];
    for (const [station, items] of Object.entries(groupByStation(lines, settings.stations))) {
        const prep = Math.max(0, ...items.map((i) => (i.quantity > 0 && i.prepMinutes) || 0));
        kots.push(await Kot.create({
            prepMinutes: prep || undefined,
            order: order._id,
            orderNo: order.orderNo,
            ticketNo: await Counter.nextKotNo(settings.timezone),
            station,
            orderType: order.type,
            tableNo: table?.tableNo,
            items,
            createdBy: user?._id,
        }));
    }
    // New food for an order the kitchen had finished: it is cooking again.
    if (lines.some((l) => l.quantity > 0)) {
        await Order.updateOne({ _id: order._id, orderStatus: 'Ready' }, { orderStatus: 'In Progress' });
    }
    emit('kot');
    return kots;
};

module.exports = { kitchenDelta, groupByStation, sendToKitchen };
