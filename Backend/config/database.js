const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB is connected');
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
}

module.exports = connectDB;
// This file is responsible for connecting to the MongoDB database. It uses the mongoose library to connect to the database. The MONGO_URI environment variable is used to specify the connection string for the database. The connectDB function is an asynchronous function that attempts to connect to the database. If the connection is successful, a message is logged to the console. If there is an error, the error is logged to the console and the process is exited with an exit code of 1. The connectDB function is exported so that it can be used in other files.
