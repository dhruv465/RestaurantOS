const AuditLog = require('../models/auditLogModel');

// Fire-and-forget: a failed audit write must never fail the request that caused it.
const record = (user, action, entity, entityId, data) =>
    AuditLog.create({
        user: user?._id,
        userName: user?.name,
        action,
        entity,
        entityId: entityId ? String(entityId) : undefined,
        data,
    }).catch((err) => console.error('Audit write failed:', err.message));

module.exports = { record };
