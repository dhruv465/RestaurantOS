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

// Remembers this device for 90 days (from a manager's password sign-in) so staff can sign in with their PIN after a lock.
// shortcut: no per-device list to revoke; changing JWT_SECRET forgets every device.
const issueDevice = (res) => {
    const isProduction = config.nodeEnv === 'production';
    res.cookie('deviceToken', jwt.sign({}, config.accessTokenSecret, { audience: 'device', expiresIn: '90d' }), {
        maxAge: 1000 * 60 * 60 * 24 * 90,
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
    });
};

// POST /api/user/forget-device — this device stops offering PIN sign-in until someone signs in with a password.
const forgetDevice = (req, res) => {
    const isProduction = config.nodeEnv === 'production';
    res.clearCookie('deviceToken', { httpOnly: true, sameSite: isProduction ? 'none' : 'lax', secure: isProduction });
    res.json({ success: true, message: 'This device no longer offers PIN sign-in' });
};

const PIN_RE = /^\d{4,6}$/;

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

        const isUserPresent = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
        if (!isUserPresent || !isUserPresent.password) {
            return next(createHttpError.Unauthorized('Invalid credentials'));
        }

        const isMatch = await bcrypt.compare(String(password), isUserPresent.password);
        if (!isMatch) {
            return next(createHttpError.Unauthorized('Invalid credentials'));
        }

        if (isUserPresent.active === false) {
            return next(createHttpError(403, 'Account is deactivated. Contact your admin.'));
        }

        issueSession(res, isUserPresent);
        // Only a manager or owner signing in makes this a shared restaurant device; a waiter's own phone stays untrusted.
        if (['Admin', 'Manager'].includes(isUserPresent.role)) issueDevice(res);

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
        const users = await User.find().select('+pinHash').sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: users.map((u) => ({ ...publicUser(u), hasPin: !!u.pinHash })), roles: Object.keys(ROLES) });
    } catch (error) {
        next(error);
    }
}

const createStaff = async (req, res, next) => {
    try {
        const { name, phone, password, role, pin } = req.body;
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
        if (!name || !phone || !role) return next(createHttpError(400, 'Please provide name, phone and role'));
        if (!ROLES[role]) return next(createHttpError(400, 'Unknown role'));
        // Either an email + password login, or a PIN for the restaurant's devices (or both).
        if (!email && !pin) return next(createHttpError(400, 'Give an email and password, or a PIN'));
        if (email && String(password || '').length < 6) return next(createHttpError(400, 'Password must be at least 6 characters'));
        if (pin && !PIN_RE.test(String(pin))) return next(createHttpError(400, 'PIN must be 4 to 6 digits'));
        if (email && (await User.exists({ email }))) return next(createHttpError(400, 'User already exists'));

        const user = await User.create({
            name, phone, role,
            ...(email && { email, password: String(password) }),
            ...(pin && { pinHash: await bcrypt.hash(String(pin), 10) }),
        });
        record(req.user, 'staff.create', 'user', user._id, { name, email: user.email, role, pin: !!pin });
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

        const { name, phone, role, active, password, pin } = req.body;
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
        // A manager setting a new PIN also clears a lockout.
        if (pin) {
            if (!PIN_RE.test(String(pin))) return next(createHttpError(400, 'PIN must be 4 to 6 digits'));
            user.pinHash = await bcrypt.hash(String(pin), 10);
            user.pinFailures = 0;
        }
        await user.save();

        record(req.user, 'staff.update', 'user', user._id, {
            name: user.name, role: user.role, active: user.active, passwordReset: !!password, pinReset: !!pin,
        });
        res.status(200).json({ success: true, message: 'Staff member updated', data: publicUser(user) });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    issueSession,
    issueDevice,
    forgetDevice,
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
