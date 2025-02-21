require("dotenv").config();

const config = Object.freeze({
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/test",
    nodeEnv: process.env.NODE_ENV || "development",
    accessTokenSecret: process.env.JWT_SECRET,
});

module.exports = config;
// This file is responsible for exporting the configuration 
// settings for the application. It uses the dotenv library to load environment 
// variables from a .env file. The config object contains the port number, MongoDB
//  connection string, and Node environment settings. These values are read 
// from environment variables, with default values provided if the environment variables 
// are not set. The config object is frozen to prevent modification of its properties. 
// The config object is exported so that it can be used in other files.