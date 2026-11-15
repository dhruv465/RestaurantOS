const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../config/permissions');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    // Optional: kitchen and floor staff without email sign in with a PIN on a trusted device.
    email: {
        type: String,
        unique: true,
        sparse: true,
        set: (v) => (v ? String(v).trim().toLowerCase() : undefined),
        validate: {
            validator: function (v) {
                return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    password: {
        type: String,
        required: [function () { return !!this.email; }, 'Password is required'],
        select: false
    },
    role: {
        type: String,
        required: true,
        enum: Object.keys(ROLES)
    },
    active: {
        type: Boolean,
        default: true
    },
    // Quick switch on a shared till: 4–6 digit PIN, stored hashed.
    pinHash: { type: String, select: false },
    pinFailures: { type: Number, default: 0, select: false }, // wrong PINs in a row; PIN is removed at PIN_MAX_FAILURES
}, {
    timestamps: true
})

userSchema.pre('save', async function () {
    // Without this early return every save re-hashed the existing hash and locked the user out.
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
