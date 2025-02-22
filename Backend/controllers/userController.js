const createHttpError = require('http-errors');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');



const register = async (req, res, next) => {
    const { name, email, phone, password, role } = req.body;

    try {
        if (!name || !email || !phone || !password || !role) {
            return next(createHttpError.BadRequest(400, 'Please provide all the required fields'));
        }

        const isUserPresent = await User.findOne({ email });
        if (isUserPresent) {
            return next(createHttpError(400, 'User already exists'));
        }

        const user = await User.create({ name, email, phone, password, role });

        res.status(201).json({
            status: 'success',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            },
            message: 'User created successfully'
        });
    } catch (error) {
        next(error);
    }
}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(createHttpError.BadRequest(400, 'Please provide email and password'));
        }

        const isUserPresent = await User.findOne({ email });
        if (!isUserPresent) {
            return next(createHttpError.NotFound('User not found'));
        }

        const isMatch = await bcrypt.compare(password, isUserPresent.password);
        if (!isMatch) {
            return next(createHttpError.Unauthorized('Invalid credentials'));
        }

        const accessToken = jwt.sign({ _id: isUserPresent._id }, config.accessTokenSecret, {
            expiresIn: '24h'
        });

        res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true,
            sameSite: 'none',
            secure: true
        })



        res.status(200).json({
            success: true,
            data: isUserPresent,
            message: 'User logged in successfully'
        });
    } catch (error) {
        next(error);
    }
}

const getUserData = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            data: user,
            message: 'User data fetched successfully'
        });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    register,
    login,
    getUserData
};
