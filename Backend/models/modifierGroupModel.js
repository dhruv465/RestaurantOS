const mongoose = require('mongoose');

// A choice attached to menu items, e.g. "Size" (pick 1) or "Extras" (pick 0-3). Option prices add to the item price.
const modifierGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 60 },
    minSelect: { type: Number, default: 0, min: 0, max: 20 },
    maxSelect: { type: Number, default: 1, min: 1, max: 20 },
    options: [{
        name: { type: String, required: true, trim: true, maxlength: 60 },
        pricePaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    }],
}, { timestamps: true });

modifierGroupSchema.pre('validate', function () {
    if (this.maxSelect < this.minSelect) this.invalidate('maxSelect', 'Max choices must be at least the min');
    if (this.options.length < this.minSelect) this.invalidate('options', 'Add at least as many options as the min choices');
});

module.exports = mongoose.model('ModifierGroup', modifierGroupSchema);
