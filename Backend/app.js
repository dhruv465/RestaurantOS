require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/database');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const config = require('./config/config');
const cookieParser = require('cookie-parser');


//Port
const PORT = config.port;
connectDB();

//Middleware
app.use(express.json());
app.use(cookieParser());

//Endpoint Root
app.get('/', (req, res) => {

    res.json({ message: 'Hello World' });
});

//Routes
app.use("/api/user", require('./routes/userRoute'));
app.use("/api/order", require('./routes/orderRoute'));
app.use("/api/table", require('./routes/tableRoute'));

//Error Handler
app.use(globalErrorHandler);


//server listening
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}
);