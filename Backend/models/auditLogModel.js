const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    action: { type: String, required: true },   // e.g. "order.create"
    entity: { type: String, required: true },   // e.g. "order"
    entityId: String,
    data: mongoose.Schema.Types.Mixed,          // small snapshot; never passwords or tokens
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
