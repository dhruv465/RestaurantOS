require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/database');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const config = require('./config/config');
const cookieParser = require('cookie-parser');
const cors = require('cors');


//Port
const PORT = config.port;
connectDB();

//Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true ,
    origin: ['http://localhost:5173']
}))

//Endpoint Root
app.get('/', (req, res) => {

    res.json({ message: 'Hello World' });
});

//Routes
app.use("/api/user", require('./routes/userRoute'));
app.use("/api/order", require('./routes/orderRoute'));
app.use("/api/table", require('./routes/tableRoute'));
app.use("/api/payment", require('./routes/paymentRoute'));

//Error Handler
app.use(globalErrorHandler);


//server listening
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}
);