const createHttpError = require('http-errors');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/userModel');


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

        req.user = user;
        next();


    } catch (error) {
        const errorMessage = createHttpError(401, "Invalid token");
        next(errorMessage);
    }
}

module.exports = {
    isVerifiedUser
};