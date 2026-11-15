// Stock changes. Every change goes through move(), which updates the ingredient and writes the ledger row.
const createHttpError = require('http-errors');
const { Ingredient, StockMovement } = require('../models/inventoryModels');
const Item = require('../models/itemModel');
const Order = require('../models/orderModel');

const round3 = (n) => Math.round(n * 1000) / 1000;

// Pure: weighted average unit cost after receiving qty at unitCostPaise. Negative stock counts as none.
const newAverageCost = (stock, avgCostPaise, qty, unitCostPaise) => {
    const have = Math.max(0, stock);
    if (have + qty <= 0) return unitCostPaise;
    return (have * avgCostPaise + qty * unitCostPaise) / (have + qty);
};

// Pure: what a list of order lines uses, per ingredient id. recipes: { itemId: [{ ingredient, qty }] }.
const usageFor = (lines, recipes) => {
    const use = new Map();
    for (const l of lines) {
        for (const r of recipes[String(l.itemId)] || []) {
            const key = String(r.ingredient);
            use.set(key, round3((use.get(key) || 0) + r.qty * l.quantity));
        }
    }
    return use;
};

// Pure: cost of one portion and food cost % of the menu price.
const recipeCost = (recipe, ingredientsById, pricePaise) => {
    const costPaise = Math.round(recipe.reduce((s, r) => s + r.qty * (ingredientsById[String(r.ingredient)]?.avgCostPaise || 0), 0));
    return { costPaise, foodCostPercent: pricePaise > 0 ? Math.round((costPaise / pricePaise) * 1000) / 10 : null };
};

// Pure: per ingredient, which dishes used how much. -> Map(ingredientId -> [{ name, quantity, qty }])
const dishesFor = (lines, recipes) => {
    const out = new Map();
    for (const l of lines) {
        for (const r of recipes[String(l.itemId)] || []) {
            const key = String(r.ingredient);
            const list = out.get(key) || [];
            const row = list.find((d) => d.name === l.name);
            if (row) {
                row.quantity += l.quantity;
                row.qty = round3(row.qty + r.qty * l.quantity);
            } else list.push({ name: l.name, quantity: l.quantity, qty: round3(r.qty * l.quantity) });
            out.set(key, list);
        }
    }
    return out;
};

// Pure: one ingredient's story over a period. startBalance = balance before the period; movements oldest first.
const usageSummary = (startBalance, movements) => {
    const s = { start: round3(startBalance), bought: 0, used: 0, wasted: 0, corrected: 0, usedCostPaise: 0, wastedCostPaise: 0, dishes: {} };
    for (const m of movements) {
        const cost = Math.round(-m.qty * (m.unitCostPaise || 0));
        if (m.type === 'purchase') s.bought += m.qty;
        else if (m.type === 'consumption') {
            s.used -= m.qty;
            s.usedCostPaise += cost;
            for (const d of m.dishes || []) {
                const row = (s.dishes[d.name] ||= { quantity: 0, qty: 0 });
                row.quantity += d.quantity;
                row.qty = round3(row.qty + d.qty);
            }
        } else if (m.type === 'waste') {
            s.wasted -= m.qty;
            s.wastedCostPaise += cost;
        } else s.corrected += m.qty; // adjust / count
    }
    for (const k of ['bought', 'used', 'wasted', 'corrected']) s[k] = round3(s[k]);
    s.left = round3(s.start + s.bought - s.used - s.wasted + s.corrected);
    return s;
};

const move = async (ingredientId, qty, entry) => {
    const update = { $inc: { stock: round3(qty) } };
    if (entry.type === 'purchase') {
        const before = await Ingredient.findById(ingredientId).select('stock avgCostPaise');
        if (!before) throw createHttpError(404, 'Ingredient not found');
        update.$set = { avgCostPaise: newAverageCost(before.stock, before.avgCostPaise, qty, entry.unitCostPaise) };
    }
    const ingredient = await Ingredient.findByIdAndUpdate(ingredientId, update, { new: true });
    if (!ingredient) throw createHttpError(404, 'Ingredient not found');
    await StockMovement.create({
        ingredient: ingredientId,
        qty: round3(qty),
        unitCostPaise: entry.unitCostPaise ?? ingredient.avgCostPaise,
        balanceAfter: round3(ingredient.stock),
        ...entry,
    });
    return ingredient;
};

// Paid order: take its recipes' ingredients out of stock once. Never blocks the sale; stock may go negative.
const deductForOrder = async (orderId) => {
    const claimed = await Order.findOneAndUpdate({ _id: orderId, stockDeducted: { $ne: true } }, { stockDeducted: true }, { new: true });
    if (!claimed) return;
    const ids = [...new Set(claimed.items.map((l) => String(l.itemId)).filter(Boolean))];
    const items = await Item.find({ _id: { $in: ids }, 'recipe.0': { $exists: true } }).select('recipe');
    const recipes = Object.fromEntries(items.map((i) => [String(i._id), i.recipe]));
    const dishes = dishesFor(claimed.items, recipes);
    for (const [ingredient, qty] of usageFor(claimed.items, recipes)) {
        await move(ingredient, -qty, { type: 'consumption', order: claimed._id, orderNo: claimed.orderNo, dishes: dishes.get(ingredient) });
    }
};

module.exports = { newAverageCost, usageFor, dishesFor, usageSummary, recipeCost, move, deductForOrder, round3 };
