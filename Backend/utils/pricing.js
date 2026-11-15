// The only place order totals are computed. All money math is in integer paise.
const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const Item = require('../models/itemModel');
const Settings = require('../models/settingsModel');
const ModifierGroup = require('../models/modifierGroupModel');

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// Pure: validate discount/tip coming from the client. Flat discount and tip are in paise.
const cleanAdjustments = (input = {}) => {
    const out = {};
    const value = Number(input.discountValue) || 0;
    if (value) {
        if (!['percent', 'flat'].includes(input.discountType)) throw createHttpError(400, 'Discount type must be percent or flat');
        if (!(value > 0) || (input.discountType === 'percent' && value > 100)) throw createHttpError(400, 'Invalid discount');
        if (input.discountType === 'flat' && !Number.isInteger(value)) throw createHttpError(400, 'Flat discount must be whole paise');
        const reason = typeof input.discountReason === 'string' ? input.discountReason.trim().slice(0, 200) : '';
        if (!reason) throw createHttpError(400, 'Give a reason for the discount');
        Object.assign(out, { discountType: input.discountType, discountValue: value, discountReason: reason });
    }
    const tip = Number(input.tipPaise) || 0;
    if (tip) {
        if (!Number.isInteger(tip) || tip < 0 || tip > 10000000) throw createHttpError(400, 'Invalid tip');
        out.tipPaise = tip;
    }
    return out;
};

// Pure: lines [{ unitPaise, quantity }] + tax settings + discount/tip -> bills.
// Discount comes off before tax; tip is added after tax and is not taxed.
// The rupee fields (total/tax/grandTotal) are display copies derived from paise; never compute from them.
const computeBills = (lines, { taxRatePercent = 0, taxInclusive = false } = {}, adjustments = {}) => {
    const rate = Number(taxRatePercent) || 0;
    const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPaise * l.quantity, 0);

    const { discountType, discountValue = 0, tipPaise = 0, deliveryFeePaise = 0 } = adjustments;
    const rawDiscount = discountType === 'percent' ? Math.round((subtotalPaise * discountValue) / 100) : discountType === 'flat' ? discountValue : 0;
    const discountPaise = Math.min(Math.max(rawDiscount, 0), subtotalPaise);
    // Delivery fee is not discounted but is taxed with the food.
    const taxablePaise = subtotalPaise - discountPaise + deliveryFeePaise;

    let taxPaise;
    let netPaise; // after discount, before tax
    if (taxInclusive) {
        netPaise = Math.round((taxablePaise * 100) / (100 + rate));
        taxPaise = taxablePaise - netPaise;
    } else {
        netPaise = taxablePaise;
        taxPaise = Math.round((taxablePaise * rate) / 100);
    }
    const totalPaise = netPaise + taxPaise + tipPaise;

    return {
        subtotalPaise,
        discountPaise,
        taxPaise,
        tipPaise,
        deliveryFeePaise,
        totalPaise,
        taxRatePercent: rate,
        taxInclusive: !!taxInclusive,
        total: netPaise / 100,
        tax: taxPaise / 100,
        grandTotal: totalPaise / 100,
    };
};

// Pure: the options picked for one line -> price snapshot. strict = enforce min choices (new or increased lines),
// so an item that gets a required group later doesn't break orders already on the floor.
const applyModifiers = (item, picks, groups, strict) => {
    const chosen = Array.isArray(picks) ? picks : [];
    const groupIds = (item.modifierGroups || []).map(String);
    if (chosen.some((p) => !groupIds.includes(String(p.groupId)))) throw createHttpError(400, `That add-on is not offered with ${item.name}`);
    if (new Set(chosen.map((p) => String(p.optionId))).size !== chosen.length) throw createHttpError(400, `Same add-on picked twice for ${item.name}`);

    const modifiers = [];
    for (const gid of groupIds) {
        const group = groups.find((g) => String(g._id) === gid);
        if (!group) continue;
        const mine = chosen.filter((p) => String(p.groupId) === gid);
        if (mine.length > group.maxSelect || (strict && mine.length < group.minSelect)) {
            const range = group.minSelect === group.maxSelect ? group.minSelect : `${group.minSelect}–${group.maxSelect}`;
            throw createHttpError(400, `${item.name}: choose ${range} for ${group.name}`);
        }
        for (const p of mine) {
            const option = group.options.find((o) => String(o._id) === String(p.optionId));
            if (!option) throw createHttpError(400, `${item.name}: unknown ${group.name} option`);
            modifiers.push({ groupId: group._id, optionId: option._id, group: group.name, name: option.name, pricePaise: option.pricePaise });
        }
    }
    return { modifiers, extraPaise: modifiers.reduce((sum, m) => sum + m.pricePaise, 0) };
};

// Pure: client cart lines + menu items from the DB -> trusted order lines. Client prices are ignored.
// prevItems = the order's saved lines: a sold-out item may stay on an order, but not be added or increased.
// Leave it undefined for price previews, where nothing is being ordered yet.
const buildLines = (rawItems, menuItems, prevItems, groups = []) => {
    if (!Array.isArray(rawItems)) throw createHttpError(400, 'items must be an array');
    const prevQty = new Map((prevItems || []).map((l) => [String(l.id ?? l.itemId), l.quantity]));

    return rawItems.map((raw) => {
        // shortcut: cart lines saved before itemId existed are matched by name; drop once those old open orders are closed.
        const item = menuItems.find((m) =>
            raw.itemId ? String(m._id) === String(raw.itemId) : m.name === raw.name
        );
        if (!item) throw createHttpError(400, `Unknown menu item: ${raw.name || raw.itemId}`);

        const quantity = Number(raw.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
            throw createHttpError(400, `Invalid quantity for ${item.name}`);
        }

        const growing = !prevItems || quantity > (prevQty.get(String(raw.id ?? item._id)) || 0);
        if (prevItems && growing && item.available === false) {
            throw createHttpError(400, `${item.name} is sold out`);
        }

        const { modifiers, extraPaise } = applyModifiers(item, raw.modifiers, groups, growing);
        const unitPaise = toPaise(item.price) + extraPaise;
        const line = {
            id: raw.id,
            itemId: item._id,
            name: item.name,
            quantity,
            unitPaise,
            pricePerQuantity: unitPaise / 100,
            price: (unitPaise * quantity) / 100,
        };
        if (modifiers.length) line.modifiers = modifiers;
        if (item.station) line.station = item.station;
        if (item.prepMinutes) line.prepMinutes = item.prepMinutes;
        if (typeof raw.instructions === 'string') line.instructions = raw.instructions.slice(0, 500);
        if (raw.returned) line.returned = Math.min(Number(raw.returned) || 0, quantity);
        if (raw.newlyAdded) line.newlyAdded = true;
        return line;
    });
};

// DB-backed: price a cart against the live menu and current settings.
const priceOrder = async (rawItems, adjustments = {}, prevItems) => {
    const list = Array.isArray(rawItems) ? rawItems : [];
    const ids = list.map((i) => i.itemId).filter((id) => mongoose.isValidObjectId(id));
    const names = list.filter((i) => !i.itemId && typeof i.name === 'string').map((i) => i.name);

    const [menuItems, settings] = await Promise.all([
        list.length ? Item.find({ $or: [{ _id: { $in: ids } }, { name: { $in: names } }] }) : [],
        Settings.load(),
    ]);

    const groupIds = menuItems.flatMap((m) => m.modifierGroups || []);
    const groups = groupIds.length ? await ModifierGroup.find({ _id: { $in: groupIds } }) : [];
    const items = buildLines(rawItems, menuItems, prevItems, groups);
    return { items, bills: computeBills(items, settings, adjustments), settings };
};

module.exports = { toPaise, cleanAdjustments, computeBills, applyModifiers, buildLines, priceOrder };
