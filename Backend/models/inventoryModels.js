const mongoose = require('mongoose');
const { Schema } = mongoose;

// Stock is kept in one base unit per ingredient: grams, millilitres or pieces.
const UNITS = ['g', 'ml', 'pcs'];

const ingredientSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    unit: { type: String, enum: UNITS, required: true },
    stock: { type: Number, default: 0 },
    parLevel: { type: Number, default: 0, min: 0 }, // at or below this = low stock, and the shopping list tops up to 2× this
    avgCostPaise: { type: Number, default: 0, min: 0 }, // weighted average cost of one unit (may be a fraction of a paisa)
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    active: { type: Boolean, default: true },
}, { timestamps: true });

// The stock ledger: every change to an ingredient's stock, so the number can be explained.
const MOVEMENT_TYPES = ['purchase', 'consumption', 'waste', 'adjust', 'count'];
const WASTE_REASONS = ['expired', 'spoiled', 'dropped', 'overcooked', 'returned', 'other'];
const stockMovementSchema = new Schema({
    ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    qty: { type: Number, required: true }, // + in, − out
    unitCostPaise: Number,
    balanceAfter: Number,
    reason: { type: String, enum: WASTE_REASONS },
    note: { type: String, maxlength: 200 },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    orderNo: String,
    dishes: { type: [{ _id: false, name: String, quantity: Number, qty: Number }], default: undefined }, // consumption: which dishes used it
    purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
stockMovementSchema.index({ ingredient: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });

const supplierSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: '' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    active: { type: Boolean, default: true },
}, { timestamps: true });

const PO_STATUSES = ['Draft', 'Ordered', 'Partly received', 'Received', 'Cancelled'];
const purchaseOrderSchema = new Schema({
    poNo: { type: String, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    status: { type: String, enum: PO_STATUSES, default: 'Draft' },
    lines: [{
        ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        qty: { type: Number, required: true, min: 0.001 },
        unitCostPaise: { type: Number, required: true, min: 0 },
        receivedQty: { type: Number, default: 0 },
    }],
    expectedAt: Date,
    notes: { type: String, maxlength: 500, default: '' },
    receipts: [{ _id: false, at: Date, by: { type: Schema.Types.ObjectId, ref: 'User' }, requestId: String, invoiceNo: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
    UNITS, MOVEMENT_TYPES, WASTE_REASONS, PO_STATUSES,
    Ingredient: mongoose.model('Ingredient', ingredientSchema),
    StockMovement: mongoose.model('StockMovement', stockMovementSchema),
    Supplier: mongoose.model('Supplier', supplierSchema),
    PurchaseOrder: mongoose.model('PurchaseOrder', purchaseOrderSchema),
};
