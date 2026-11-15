const createHttpError = require('http-errors');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/userModel');
const { can } = require('../config/permissions');


const isVerifiedUser = async (req, res, next) => {
    try {
        const { accessToken } = req.cookies;

        if (!accessToken) {
            const error = createHttpError(401, "Please provide token");
            return next(error);
        }

        const decoded = jwt.verify(accessToken, config.accessTokenSecret);

        const user = await User.findById(decoded._id);

        if (!user) {
            const error = createHttpError(401, "User not found");
            return next(error);
        }

        if (user.active === false) {
            return next(createHttpError(401, "Account is deactivated"));
        }

        req.user = user;
        next();


    } catch (error) {
        const errorMessage = createHttpError(401, "Invalid token");
        next(errorMessage);
    }
}

// Use after isVerifiedUser.
const requirePermission = (...permissions) => (req, res, next) => {
    if (permissions.every((p) => can(req.user, p))) return next();
    next(createHttpError(403, "You do not have permission to do this"));
};

// Use after isVerifiedUser: passes if the user has at least one of these.
const requireAnyPermission = (...permissions) => (req, res, next) => {
    if (permissions.some((p) => can(req.user, p))) return next();
    next(createHttpError(403, "You do not have permission to do this"));
};

// A device where someone signed in with a password: PIN sign-in and PIN clock-in work only here.
const isTrustedDevice = (req, res, next) => {
    try {
        jwt.verify(req.cookies?.deviceToken || '', config.accessTokenSecret, { audience: 'device' });
        next();
    } catch {
        next(createHttpError(401, 'PIN sign-in is not set up on this device. Sign in once with email and password.'));
    }
};

module.exports = {
    isTrustedDevice,
    isVerifiedUser,
    requirePermission,
    requireAnyPermission
};
