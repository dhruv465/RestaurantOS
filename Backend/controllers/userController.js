const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const { ROLES, permissionsFor } = require('../config/permissions');
const { record } = require('../utils/audit');

// Never send the password hash to the client.
const publicUser = (u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    active: u.active !== false,
    permissions: permissionsFor(u.role),
    createdAt: u.createdAt,
});

// Sets the staff login cookie. Shared by password login and PIN switch.
const issueSession = (res, user) => {
    const accessToken = jwt.sign({ _id: user._id }, config.accessTokenSecret, { expiresIn: '24h' });
    const isProduction = config.nodeEnv === 'production';
    res.cookie('accessToken', accessToken, {
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction
    });
};

const getSetupStatus = async (req, res, next) => {
    try {
        const needsOwner = (await User.countDocuments()) === 0;
        res.status(200).json({ success: true, data: { needsOwner } });
    } catch (error) {
        next(error);
    }
}

// First-run only: creates the owner (Admin). After that, staff are created by an admin.
const register = async (req, res, next) => {
    const { name, email, phone, password } = req.body;

    try {
        if (!name || !email || !phone || !password) {
            return next(createHttpError(400, 'Please provide all the required fields'));
        }

        // shortcut: two simultaneous first-run sign-ups could both become Admin; acceptable for a single restaurant.
        if ((await User.countDocuments()) > 0) {
            return next(createHttpError(403, 'Registration is closed. Ask your admin to create your account.'));
        }

        const user = await User.create({ name, email: String(email), phone, password, role: 'Admin' });
        record(user, 'user.register_owner', 'user', user._id, { email: user.email });

        res.status(201).json({
            status: 'success',
            data: publicUser(user),
            message: 'Owner account created. Please sign in.'
        });
    } catch (error) {
        next(error);
    }
}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(createHttpError(400, 'Please provide email and password'));
        }

        const isUserPresent = await User.findOne({ email: String(email) }).select('+password');
        if (!isUserPresent) {
            return next(createHttpError.NotFound('User not found'));
        }

        const isMatch = await bcrypt.compare(String(password), isUserPresent.password);
        if (!isMatch) {
            return next(createHttpError.Unauthorized('Invalid credentials'));
        }

        if (isUserPresent.active === false) {
            return next(createHttpError(403, 'Account is deactivated. Contact your admin.'));
        }

        issueSession(res, isUserPresent);

        record(isUserPresent, 'user.login', 'user', isUserPresent._id);

        res.status(200).json({
            success: true,
            data: publicUser(isUserPresent),
            message: 'User logged in successfully'
        });
    } catch (error) {
        next(error);
    }
}

const getUserData = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: publicUser(req.user),
            message: 'User data fetched successfully'
        });
    } catch (error) {
        next(error);
    }
}

const logout = async (req, res, next) => {

    try {
        const isProduction = config.nodeEnv === 'production';
        res.clearCookie('accessToken', {
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction
        });
        res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        });
    }
    catch (error) {
        next(error);
    }
}

// ---- Staff management (staff.manage) ----

const listStaff = async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: users.map(publicUser), roles: Object.keys(ROLES) });
    } catch (error) {
        next(error);
    }
}

const createStaff = async (req, res, next) => {
    try {
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !phone || !password || !role) {
            return next(createHttpError(400, 'Please provide name, email, phone, password and role'));
        }
        if (!ROLES[role]) return next(createHttpError(400, 'Unknown role'));
        if (String(password).length < 6) return next(createHttpError(400, 'Password must be at least 6 characters'));
        if (await User.exists({ email: String(email) })) return next(createHttpError(400, 'User already exists'));

        const user = await User.create({ name, email: String(email), phone, password: String(password), role });
        record(req.user, 'staff.create', 'user', user._id, { name, email: user.email, role });
        res.status(201).json({ success: true, message: 'Staff member created', data: publicUser(user) });
    } catch (error) {
        next(error);
    }
}

const updateStaff = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return next(createHttpError(404, 'Invalid id'));

        const user = await User.findById(id);
        if (!user) return next(createHttpError(404, 'User not found'));

        const { name, phone, role, active, password } = req.body;
        if (role !== undefined && !ROLES[role]) return next(createHttpError(400, 'Unknown role'));

        const isSelf = String(user._id) === String(req.user._id);
        if (isSelf && (active === false || (role !== undefined && role !== user.role))) {
            return next(createHttpError(400, 'You cannot deactivate yourself or change your own role'));
        }

        // Keep at least one active Admin, or nobody can manage staff or settings again.
        const losesAdmin = user.role === 'Admin' && ((role !== undefined && role !== 'Admin') || active === false);
        if (losesAdmin) {
            const otherAdmins = await User.countDocuments({ _id: { $ne: user._id }, role: 'Admin', active: { $ne: false } });
            if (otherAdmins === 0) return next(createHttpError(400, 'There must be at least one active Admin'));
        }

        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (role !== undefined) user.role = role;
        if (active !== undefined) user.active = !!active;
        if (password) {
            if (String(password).length < 6) return next(createHttpError(400, 'Password must be at least 6 characters'));
            user.password = String(password);
        }
        await user.save();

        record(req.user, 'staff.update', 'user', user._id, {
            name: user.name, role: user.role, active: user.active, passwordReset: !!password,
        });
        res.status(200).json({ success: true, message: 'Staff member updated', data: publicUser(user) });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    issueSession,
    publicUser,
    register,
    login,
    getUserData,
    logout,
    getSetupStatus,
    listStaff,
    createStaff,
    updateStaff
};
