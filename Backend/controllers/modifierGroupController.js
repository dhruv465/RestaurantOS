const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const ModifierGroup = require('../models/modifierGroupModel');
const Item = require('../models/itemModel');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');

const pick = ({ name, minSelect, maxSelect, options }) => ({ name, minSelect, maxSelect, options });

const listGroups = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: await ModifierGroup.find().sort({ name: 1 }) });
    } catch (error) {
        next(error);
    }
};

const createGroup = async (req, res, next) => {
    try {
        const group = await ModifierGroup.create(pick(req.body));
        record(req.user, 'modifiers.create', 'modifiers', group._id, { name: group.name });
        emit('menu');
        res.status(201).json({ success: true, data: group });
    } catch (error) {
        next(error);
    }
};

const updateGroup = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Add-on group not found'));
        const group = await ModifierGroup.findById(req.params.id);
        if (!group) return next(createHttpError(404, 'Add-on group not found'));
        // save(), not findByIdAndUpdate, so the min/max check in pre('validate') runs.
        Object.entries(pick(req.body)).forEach(([k, v]) => v !== undefined && group.set(k, v));
        await group.save();
        record(req.user, 'modifiers.update', 'modifiers', group._id, { name: group.name });
        emit('menu');
        res.status(200).json({ success: true, data: group });
    } catch (error) {
        next(error);
    }
};

const deleteGroup = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Add-on group not found'));
        const group = await ModifierGroup.findByIdAndDelete(req.params.id);
        if (!group) return next(createHttpError(404, 'Add-on group not found'));
        await Item.updateMany({ modifierGroups: group._id }, { $pull: { modifierGroups: group._id } });
        record(req.user, 'modifiers.delete', 'modifiers', group._id, { name: group.name });
        emit('menu');
        res.status(200).json({ success: true, data: group });
    } catch (error) {
        next(error);
    }
};

module.exports = { listGroups, createGroup, updateGroup, deleteGroup };
