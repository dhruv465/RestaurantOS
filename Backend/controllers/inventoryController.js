const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const { Ingredient, StockMovement, Supplier, PurchaseOrder, UNITS, WASTE_REASONS, MOVEMENT_TYPES } = require('../models/inventoryModels');
const Item = require('../models/itemModel');
const Counter = require('../models/counterModel');
const { move, recipeCost, round3, usageSummary } = require('../utils/stock');
const Settings = require('../models/settingsModel');
const { dayRange } = require('./reservationController');
const { Expense, CashClosing, EXPENSE_METHODS, STOCK_CATEGORY } = require('../models/accountingModels');
const { localParts } = require('../utils/reports');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');

const idOk = (id, what) => {
    if (!mongoose.isValidObjectId(id)) throw createHttpError(404, `${what} not found`);
};
const qtyOk = (n, what = 'Quantity') => {
    const q = Number(n);
    if (!Number.isFinite(q) || Math.abs(q) > 1e7) throw createHttpError(400, `${what} must be a number`);
    return round3(q);
};
const note = (v) => (typeof v === 'string' ? v.trim().slice(0, 200) : '');
const handle = (fn) => (req, res, next) => fn(req, res).catch(next);

// ---------- Ingredients ----------
const pickIngredient = (b) => {
    const out = {};
    if (typeof b.name === 'string') out.name = b.name;
    if (b.unit !== undefined) {
        if (!UNITS.includes(b.unit)) throw createHttpError(400, 'Unit must be g, ml or pcs');
        out.unit = b.unit;
    }
    if (b.parLevel !== undefined) out.parLevel = Math.max(0, qtyOk(b.parLevel, 'Low-stock level'));
    if (b.supplier !== undefined) out.supplier = b.supplier || null;
    if (b.active !== undefined) out.active = !!b.active;
    return out;
};

const listIngredients = handle(async (req, res) => {
    const list = await Ingredient.find().sort({ name: 1 }).populate('supplier', 'name').lean();
    res.json({ success: true, data: list.map((i) => ({ ...i, low: i.active && i.stock <= i.parLevel })) });
});

const createIngredient = handle(async (req, res) => {
    const fields = pickIngredient(req.body);
    if (!fields.name || !fields.unit) throw createHttpError(400, 'Name and unit are required');
    let ingredient;
    try {
        ingredient = await Ingredient.create(fields);
    } catch (error) {
        if (error.code === 11000) throw createHttpError(409, 'An ingredient with this name exists');
        throw error;
    }
    // Opening stock is a purchase at the given cost, so the average cost starts right.
    const opening = req.body.openingStock !== undefined ? qtyOk(req.body.openingStock, 'Opening stock') : 0;
    if (opening > 0) {
        ingredient = await move(ingredient._id, opening, { type: 'purchase', unitCostPaise: Math.max(0, Number(req.body.unitCostPaise) || 0), note: 'Opening stock', by: req.user._id });
    }
    record(req.user, 'inventory.ingredient.create', 'ingredient', ingredient._id, { name: ingredient.name });
    emit('inventory');
    res.status(201).json({ success: true, data: ingredient });
});

const updateIngredient = handle(async (req, res) => {
    idOk(req.params.id, 'Ingredient');
    const fields = pickIngredient(req.body);
    // The unit can't change once stock or recipes use it: every number would mean something else.
    if (fields.unit) {
        const current = await Ingredient.findById(req.params.id);
        if (current && current.unit !== fields.unit && (current.stock !== 0 || (await StockMovement.exists({ ingredient: current._id })))) {
            throw createHttpError(409, 'Unit cannot change after stock has moved');
        }
    }
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    if (!ingredient) throw createHttpError(404, 'Ingredient not found');
    record(req.user, 'inventory.ingredient.update', 'ingredient', ingredient._id, { fields: Object.keys(fields) });
    emit('inventory');
    res.json({ success: true, data: ingredient });
});

// POST /ingredients/:id/adjust { qty, note } — a correction, + or −, with a reason.
const adjustStock = handle(async (req, res) => {
    idOk(req.params.id, 'Ingredient');
    const qty = qtyOk(req.body.qty);
    if (!qty) throw createHttpError(400, 'Quantity cannot be 0');
    if (!note(req.body.note)) throw createHttpError(400, 'Give a reason');
    const ingredient = await move(req.params.id, qty, { type: 'adjust', note: note(req.body.note), by: req.user._id });
    record(req.user, 'inventory.adjust', 'ingredient', ingredient._id, { qty, note: note(req.body.note) });
    emit('inventory');
    res.json({ success: true, data: ingredient });
});

// POST /ingredients/:id/receive { qty, unitCostPaise, method?: Cash|Card|UPI|Bank, fromTill?, note }
// Stock bought outside a purchase order (e.g. the market). With a method it is also written to Expenses as paid.
const receiveStock = handle(async (req, res) => {
    idOk(req.params.id, 'Ingredient');
    const qty = qtyOk(req.body.qty);
    if (qty <= 0) throw createHttpError(400, 'Quantity must be more than 0');
    const unitCostPaise = Number(req.body.unitCostPaise);
    if (!Number.isFinite(unitCostPaise) || unitCostPaise < 0 || unitCostPaise > 1e7) throw createHttpError(400, 'Price must be 0 or more');
    const { method } = req.body;
    const fromTill = req.body.fromTill === true;
    if (method !== undefined && !EXPENSE_METHODS.includes(method)) throw createHttpError(400, `Paid by must be one of: ${EXPENSE_METHODS.join(', ')}`);
    if (fromTill && method !== 'Cash') throw createHttpError(400, 'Only cash can come from the till');
    const amountPaise = Math.round(qty * unitCostPaise);
    const { timezone } = await Settings.load();
    const day = localParts(new Date(), timezone).day;
    // Check before touching stock, so a refused payment leaves nothing half done.
    if (fromTill && (await CashClosing.exists({ day }))) throw createHttpError(409, `Cash for ${day} is already closed`);
    if (method && amountPaise < 1) throw createHttpError(400, 'Enter the price to record a payment');

    const ingredient = await move(req.params.id, qty, { type: 'purchase', unitCostPaise, note: note(req.body.note) || 'Stock received', by: req.user._id });
    if (method) {
        await Expense.create({ day, category: STOCK_CATEGORY, amountPaise, method, fromTill, note: `${ingredient.name} ${qty} ${ingredient.unit}${note(req.body.note) ? ` · ${note(req.body.note)}` : ''}`.slice(0, 200), by: req.user._id });
    }
    record(req.user, 'inventory.receive', 'ingredient', ingredient._id, { qty, unitCostPaise, amountPaise, method: method || 'unpaid' });
    emit('inventory');
    res.json({ success: true, data: ingredient });
});

// POST /waste { ingredient, qty, reason, note }
const logWaste = handle(async (req, res) => {
    idOk(req.body.ingredient, 'Ingredient');
    const qty = qtyOk(req.body.qty);
    if (qty <= 0) throw createHttpError(400, 'Quantity must be more than 0');
    if (!WASTE_REASONS.includes(req.body.reason)) throw createHttpError(400, 'Pick a waste reason');
    const ingredient = await move(req.body.ingredient, -qty, { type: 'waste', reason: req.body.reason, note: note(req.body.note), by: req.user._id });
    record(req.user, 'inventory.waste', 'ingredient', ingredient._id, { qty, reason: req.body.reason });
    emit('inventory');
    res.json({ success: true, data: ingredient });
});

// POST /stock-take { counts: [{ ingredient, counted }], note } — the difference becomes a "count" movement.
const stockTake = handle(async (req, res) => {
    const counts = req.body.counts;
    if (!Array.isArray(counts) || counts.length === 0 || counts.length > 1000) throw createHttpError(400, 'Send the counted items');
    const clean = counts.map((c) => {
        idOk(c.ingredient, 'Ingredient');
        const counted = qtyOk(c.counted, 'Counted amount');
        if (counted < 0) throw createHttpError(400, 'Counted amount cannot be negative');
        return { ingredient: c.ingredient, counted };
    });
    const changes = [];
    for (const { ingredient, counted } of clean) {
        // shortcut: reads then moves; a sale between the read and the move makes the count off by that sale.
        // Do stock takes when the kitchen is closed, or lock per ingredient if that matters.
        const current = await Ingredient.findById(ingredient).select('stock name');
        if (!current) continue;
        const diff = round3(counted - current.stock);
        if (diff !== 0) {
            await move(ingredient, diff, { type: 'count', note: note(req.body.note) || 'Stock take', by: req.user._id });
            changes.push({ ingredient, name: current.name, diff });
        }
    }
    record(req.user, 'inventory.stock_take', 'ingredient', null, { counted: clean.length, changed: changes.length });
    emit('inventory');
    res.json({ success: true, data: { changed: changes } });
});

// GET /movements?ingredient=&type=&limit=
const listMovements = handle(async (req, res) => {
    const filter = {};
    if (req.query.ingredient) {
        idOk(req.query.ingredient, 'Ingredient');
        filter.ingredient = req.query.ingredient;
    }
    if (req.query.type) {
        if (!MOVEMENT_TYPES.includes(req.query.type)) throw createHttpError(400, 'Unknown movement type');
        filter.type = req.query.type;
    }
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const list = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(limit)
        .populate('ingredient', 'name unit').populate('by', 'name').lean();
    res.json({ success: true, data: list });
});

// GET /shopping-list — everything at or below its low-stock level, topped up to twice that level.
const shoppingList = handle(async (req, res) => {
    const low = await Ingredient.find({ active: true, parLevel: { $gt: 0 }, $expr: { $lte: ['$stock', '$parLevel'] } })
        .populate('supplier', 'name phone').sort({ name: 1 }).lean();
    res.json({
        success: true,
        data: low.map((i) => ({ ...i, suggestedQty: round3(i.parLevel * 2 - Math.max(0, i.stock)), estimatedPaise: Math.round((i.parLevel * 2 - Math.max(0, i.stock)) * i.avgCostPaise) })),
    });
});

// ---------- Recipes ----------
const listRecipes = handle(async (req, res) => {
    const [items, ingredients] = await Promise.all([
        Item.find().select('name price recipe').sort({ name: 1 }).lean(),
        Ingredient.find().select('name unit avgCostPaise').lean(),
    ]);
    const byId = Object.fromEntries(ingredients.map((i) => [String(i._id), i]));
    res.json({
        success: true,
        data: items.map((it) => ({ ...it, ...recipeCost(it.recipe || [], byId, Math.round(it.price * 100)) })),
    });
});

// PUT /recipes/:itemId { recipe: [{ ingredient, qty }] }
const saveRecipe = handle(async (req, res) => {
    idOk(req.params.itemId, 'Item');
    const raw = req.body.recipe;
    if (!Array.isArray(raw) || raw.length > 50) throw createHttpError(400, 'recipe must be a list');
    const recipe = raw.map((r) => {
        idOk(r.ingredient, 'Ingredient');
        const qty = qtyOk(r.qty);
        if (qty <= 0) throw createHttpError(400, 'Recipe amounts must be more than 0');
        return { ingredient: r.ingredient, qty };
    });
    if (new Set(recipe.map((r) => String(r.ingredient))).size !== recipe.length) throw createHttpError(400, 'Each ingredient once per recipe');
    if ((await Ingredient.countDocuments({ _id: { $in: recipe.map((r) => r.ingredient) } })) !== recipe.length) {
        throw createHttpError(400, 'Unknown ingredient in recipe');
    }
    const item = await Item.findByIdAndUpdate(req.params.itemId, { recipe }, { new: true });
    if (!item) throw createHttpError(404, 'Item not found');
    record(req.user, 'inventory.recipe', 'item', item._id, { name: item.name, lines: recipe.length });
    res.json({ success: true, data: item });
});

// ---------- Suppliers ----------
const pickSupplier = (b) => {
    const out = {};
    for (const k of ['name', 'phone', 'email', 'gstin', 'notes']) if (typeof b[k] === 'string') out[k] = b[k];
    if (b.active !== undefined) out.active = !!b.active;
    return out;
};
const listSuppliers = handle(async (req, res) => {
    res.json({ success: true, data: await Supplier.find().sort({ name: 1 }) });
});
const createSupplier = handle(async (req, res) => {
    const supplier = await Supplier.create(pickSupplier(req.body));
    record(req.user, 'inventory.supplier.create', 'supplier', supplier._id, { name: supplier.name });
    res.status(201).json({ success: true, data: supplier });
});
const updateSupplier = handle(async (req, res) => {
    idOk(req.params.id, 'Supplier');
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, pickSupplier(req.body), { new: true, runValidators: true });
    if (!supplier) throw createHttpError(404, 'Supplier not found');
    res.json({ success: true, data: supplier });
});

// ---------- Purchase orders ----------
const cleanLines = async (raw) => {
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) throw createHttpError(400, 'Add at least one line');
    const lines = raw.map((l) => {
        idOk(l.ingredient, 'Ingredient');
        const qty = qtyOk(l.qty);
        const unitCostPaise = Number(l.unitCostPaise);
        if (qty <= 0) throw createHttpError(400, 'Quantities must be more than 0');
        if (!Number.isFinite(unitCostPaise) || unitCostPaise < 0) throw createHttpError(400, 'Unit cost must be 0 or more');
        return { ingredient: l.ingredient, qty, unitCostPaise };
    });
    const ids = [...new Set(lines.map((l) => String(l.ingredient)))];
    if ((await Ingredient.countDocuments({ _id: { $in: ids } })) !== ids.length) throw createHttpError(400, 'Unknown ingredient');
    return lines;
};

const listPurchaseOrders = handle(async (req, res) => {
    const list = await PurchaseOrder.find().sort({ createdAt: -1 }).limit(200)
        .populate('supplier', 'name').populate('lines.ingredient', 'name unit');
    res.json({ success: true, data: list });
});

const createPurchaseOrder = handle(async (req, res) => {
    idOk(req.body.supplier, 'Supplier');
    if (!(await Supplier.exists({ _id: req.body.supplier }))) throw createHttpError(404, 'Supplier not found');
    const lines = await cleanLines(req.body.lines); // validate before taking a PO number
    const po = await PurchaseOrder.create({
        poNo: `PO-${String(await Counter.nextSeq('po')).padStart(4, '0')}`,
        supplier: req.body.supplier,
        lines,
        expectedAt: req.body.expectedAt || undefined,
        notes: note(req.body.notes),
        status: req.body.status === 'Ordered' ? 'Ordered' : 'Draft',
        createdBy: req.user._id,
    });
    record(req.user, 'inventory.po.create', 'purchaseOrder', po._id, { poNo: po.poNo });
    res.status(201).json({ success: true, data: po });
});

// PATCH /purchase-orders/:id { status?, lines?, expectedAt?, notes? } — lines only while nothing is received.
const updatePurchaseOrder = handle(async (req, res) => {
    idOk(req.params.id, 'Purchase order');
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) throw createHttpError(404, 'Purchase order not found');
    const received = po.lines.some((l) => l.receivedQty > 0);
    const set = {};
    if (req.body.lines !== undefined) {
        if (received || ['Received', 'Cancelled'].includes(po.status)) throw createHttpError(409, 'Lines are locked once goods arrive');
        set.lines = await cleanLines(req.body.lines);
    }
    if (req.body.status !== undefined) {
        const allowed = { Draft: ['Ordered', 'Cancelled'], Ordered: ['Cancelled', 'Draft'], 'Partly received': ['Received'] };
        if (!(allowed[po.status] || []).includes(req.body.status)) throw createHttpError(409, `Cannot go from ${po.status} to ${req.body.status}`);
        set.status = req.body.status;
    }
    if (req.body.expectedAt !== undefined) set.expectedAt = req.body.expectedAt || null;
    if (req.body.notes !== undefined) set.notes = note(req.body.notes);
    const updated = await PurchaseOrder.findOneAndUpdate({ _id: po._id, status: po.status }, set, { new: true, runValidators: true });
    if (!updated) throw createHttpError(409, 'Purchase order changed; reload');
    record(req.user, 'inventory.po.update', 'purchaseOrder', po._id, { poNo: po.poNo, status: set.status });
    res.json({ success: true, data: updated });
});

// POST /purchase-orders/:id/receive { requestId, invoiceNo, lines: [{ ingredient, qty, unitCostPaise }] }
// Adds stock at the actual cost paid (updates the average cost). The requestId stops a double tap receiving twice.
const receivePurchaseOrder = handle(async (req, res) => {
    idOk(req.params.id, 'Purchase order');
    const requestId = typeof req.body.requestId === 'string' ? req.body.requestId.slice(0, 100) : '';
    if (requestId.length < 8) throw createHttpError(400, 'requestId is required');
    const lines = await cleanLines(req.body.lines);
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) throw createHttpError(404, 'Purchase order not found');
    if (!['Ordered', 'Partly received', 'Draft'].includes(po.status)) throw createHttpError(409, `This order is ${po.status.toLowerCase()}`);
    const onPo = new Set(po.lines.map((l) => String(l.ingredient)));
    if (lines.some((l) => !onPo.has(String(l.ingredient)))) throw createHttpError(400, 'Only items on this purchase order can be received');

    const claimed = await PurchaseOrder.findOneAndUpdate(
        { _id: po._id, 'receipts.requestId': { $ne: requestId } },
        { $push: { receipts: { at: new Date(), by: req.user._id, requestId, invoiceNo: note(req.body.invoiceNo) } } },
        { new: true }
    );
    if (!claimed) return res.json({ success: true, data: po, replay: true });

    for (const l of lines) {
        await move(l.ingredient, l.qty, { type: 'purchase', unitCostPaise: l.unitCostPaise, purchaseOrder: po._id, note: po.poNo, by: req.user._id });
        await PurchaseOrder.updateOne({ _id: po._id, 'lines.ingredient': l.ingredient }, { $inc: { 'lines.$.receivedQty': l.qty } });
    }
    const after = await PurchaseOrder.findById(po._id);
    after.status = after.lines.every((l) => l.receivedQty >= l.qty) ? 'Received' : 'Partly received';
    await after.save();
    record(req.user, 'inventory.po.receive', 'purchaseOrder', po._id, { poNo: po.poNo, lines: lines.length });
    emit('inventory');
    res.json({ success: true, data: after });
});

// GET /usage?from=YYYY-MM-DD&to=YYYY-MM-DD — per ingredient: start, bought, used (and by which dishes), wasted, left.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const usageReport = handle(async (req, res) => {
    const { from, to } = req.query;
    if (!DAY.test(from || '') || !DAY.test(to || '')) throw createHttpError(400, 'from and to must be YYYY-MM-DD');
    const { timezone } = await Settings.load();
    const [start] = dayRange(from, timezone);
    const [, end] = dayRange(to, timezone);
    if (end <= start) throw createHttpError(400, 'to must be on or after from');
    if (end - start > 92 * 86400000) throw createHttpError(400, 'Pick at most 92 days');

    const [ingredients, movements, before] = await Promise.all([
        Ingredient.find().select('name unit active avgCostPaise').lean(),
        StockMovement.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: 1, _id: 1 }).lean(),
        // shortcut: scans all older movements to find each ingredient's last balance; add a daily snapshot if this gets slow.
        StockMovement.aggregate([
            { $match: { createdAt: { $lt: start } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $group: { _id: '$ingredient', balance: { $first: '$balanceAfter' } } },
        ]),
    ]);
    const startOf = Object.fromEntries(before.map((b) => [String(b._id), b.balance || 0]));
    const byIngredient = {};
    for (const m of movements) (byIngredient[String(m.ingredient)] ||= []).push(m);
    const rows = ingredients
        .map((i) => ({ ingredient: { _id: i._id, name: i.name, unit: i.unit }, ...usageSummary(startOf[String(i._id)] || 0, byIngredient[String(i._id)] || []) }))
        .filter((r) => r.start || byIngredient[String(r.ingredient._id)])
        .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
    res.json({ success: true, data: rows });
});

module.exports = {
    usageReport, receiveStock,
    listIngredients, createIngredient, updateIngredient, adjustStock, logWaste, stockTake, listMovements, shoppingList,
    listRecipes, saveRecipe, listSuppliers, createSupplier, updateSupplier,
    listPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder,
};
