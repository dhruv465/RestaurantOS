const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    itemCategory: {
        type: String,
        enum: ['veg', 'non-veg', 'none'],
        default: 'none', // Setting default to 'none'
    },
    // Which kitchen screen gets this item's tickets. Empty = the first station in settings.
    station: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    image: { type: String, default: '' }, // "/uploads/items/<file>" served by app.js
    available: { type: Boolean, default: true }, // false = sold out: can't be added to orders
    prepMinutes: { type: Number, min: 0, max: 240 },
    allergens: [{ type: String, enum: ['gluten', 'dairy', 'nuts', 'egg', 'soy', 'fish', 'shellfish', 'sesame'] }],
    spiceLevel: { type: Number, min: 0, max: 3, default: 0 },
    sortOrder: { type: Number, default: 0 },
    modifierGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup' }],
    // What one portion uses, in each ingredient's base unit. Stock comes off when the order is paid.
    recipe: [{ _id: false, ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true }, qty: { type: Number, required: true, min: 0 } }],
}, {
    timestamps: true,
});

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;