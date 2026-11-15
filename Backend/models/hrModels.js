const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clockIn: { type: Date, required: true },
    clockOut: Date,
    breakMinutes: { type: Number, default: 0, min: 0, max: 600 },
    note: { type: String, maxlength: 200 },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    open: Boolean, // true while clocked in (removed on clock out)
}, { timestamps: true });
attendanceSchema.index({ user: 1, clockIn: -1 });
attendanceSchema.pre('save', function () {
    if (this.clockOut) this.open = undefined;
});
// At most one open (not clocked out) entry per person.
attendanceSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'one_open_shift' });

const shiftSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, maxlength: 100, default: '' },
}, { timestamps: true });
shiftSchema.index({ start: 1 });

const leaveSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    from: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    to: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    type: { type: String, enum: ['paid', 'unpaid', 'sick'], required: true },
    reason: { type: String, maxlength: 300, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const payProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    type: { type: String, enum: ['hourly', 'monthly'], required: true },
    hourlyRatePaise: { type: Number, min: 0, default: 0 },
    monthlySalaryPaise: { type: Number, min: 0, default: 0 },
    overtimeAfterMinutes: { type: Number, min: 0, max: 1440, default: 0 }, // per day; 0 = no overtime
    overtimeMultiplier: { type: Number, min: 1, max: 3, default: 1.5 },
    tipPool: { type: Boolean, default: true },
}, { timestamps: true });

const payrollRunSchema = new Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, enum: ['Draft', 'Finalized', 'Paid'], default: 'Draft' },
    periodDays: Number,
    tipsPaise: Number,
    totalPaise: Number,
    lines: [{
        _id: false,
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String, payType: String, minutes: Number, overtimeMinutes: Number, unpaidLeaveDays: Number,
        basePaise: Number, overtimePaise: Number, deductionsPaise: Number, tipsPaise: Number, totalPaise: Number,
    }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: Date,
    paidAt: Date,
}, { timestamps: true });

module.exports = {
    Attendance: mongoose.model('Attendance', attendanceSchema),
    Shift: mongoose.model('Shift', shiftSchema),
    Leave: mongoose.model('Leave', leaveSchema),
    PayProfile: mongoose.model('PayProfile', payProfileSchema),
    PayrollRun: mongoose.model('PayrollRun', payrollRunSchema),
};
