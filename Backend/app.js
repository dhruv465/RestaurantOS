require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/database');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const config = require('./config/config');
const createHttpError = require('http-errors');


//Port
const PORT = config.port;
connectDB();

//Middleware
app.use(express.json());

//Endpoint Root
app.get('/', (req, res) => {

    res.json({ message: 'Hello World' });
});

//Routes
app.use("/api/user", require('./routes/userRoute'));

//Error Handler
app.use(globalErrorHandler);


//server listening
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}
);