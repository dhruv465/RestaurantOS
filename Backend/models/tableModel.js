const mongoose = require('mongoose');
const { Schema } = mongoose;


const tableSchema = new mongoose.Schema({
    tableNo: {
        type: Number,
        required: true,
        unique: true
    },
    status: {
        type: String,
        default: "available"
    },
    seats: {
        type: Number,
        required: true
    },
    currentOrder: {
        type: Schema.Types.ObjectId,
        ref: "Order"
    }
}, { timestamps: true });

const Table = mongoose.model("Table", tableSchema);

module.exports = Table;