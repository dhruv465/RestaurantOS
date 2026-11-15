const mongoose = require('mongoose');
const { Schema } = mongoose;

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Repairs', 'Marketing', 'Fees & bank charges', 'Other'];
// Paid stock is written by Inventory → Stock received. It counts for the till, not in P&L (food cost = stock used).
const STOCK_CATEGORY = 'Stock purchase';
const EXPENSE_METHODS = ['Cash', 'Card', 'UPI', 'Bank'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const expenseSchema = new Schema({
    day: { type: String, required: true, match: DAY }, // restaurant's local date
    category: { type: String, enum: [...EXPENSE_CATEGORIES, STOCK_CATEGORY], required: true },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    method: { type: String, enum: EXPENSE_METHODS, required: true },
    fromTill: { type: Boolean, default: false }, // cash taken out of the till; counts in the cash close
    note: { type: String, trim: true, maxlength: 200 },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
expenseSchema.index({ day: -1 });

const cashClosingSchema = new Schema({
    day: { type: String, required: true, match: DAY, unique: true },
    openingFloatPaise: { type: Number, required: true, min: 0 },
    cashInPaise: Number,
    cashOutPaise: Number,
    tillExpensesPaise: Number,
    expectedPaise: Number,
    countedPaise: { type: Number, required: true, min: 0 },
    variancePaise: Number, // counted − expected; negative = short
    note: { type: String, trim: true, maxlength: 300 },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = { STOCK_CATEGORY,
    Expense: mongoose.model('Expense', expenseSchema),
    CashClosing: mongoose.model('CashClosing', cashClosingSchema),
    EXPENSE_CATEGORIES,
    EXPENSE_METHODS,
};
