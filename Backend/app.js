// Node 26 compatibility polyfill for legacy SlowBuffer in jwa/buffer-equal-constant-time
const buffer = require('buffer');
if (!buffer.SlowBuffer) buffer.SlowBuffer = function () {};
if (!buffer.SlowBuffer.prototype) buffer.SlowBuffer.prototype = {};

require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/database');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const config = require('./config/config');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { isVerifiedUser } = require('./middlewares/tokenVerification');
const { subscribe } = require('./utils/realtime');


//Port
const PORT = config.port;
connectDB();

//Middleware
app.use(express.json());
app.use(cookieParser());
// Extra allowed origins (e.g. the LAN address phones use) come from CORS_ORIGINS, comma separated.
const corsOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://restaurantos.onrender.com',
    ...(process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)];
app.use(cors({ credentials: true, origin: corsOrigins }))

//Endpoint Root
app.get('/', (req, res) => {

    res.json({ message: 'Hello World' });
});

//Routes
app.use("/api/user", require('./routes/userRoute'));
app.use("/api/order", require('./routes/orderRoute'));
app.use("/api/table", require('./routes/tableRoute'));
app.use("/api/payment", require('./routes/paymentRoute'));
app.use("/api/categories", require('./routes/categoryRoutes'));
app.use("/api/items", require('./routes/itemRoutes'));
app.use("/api/settings", require('./routes/settingsRoute'));
app.use("/api/kds", require('./routes/kdsRoute'));
app.use("/api/modifier-groups", require('./routes/modifierGroupRoute'));
app.use("/api/reservations", require('./routes/reservationRoute'));
app.use("/api/public", require('./routes/publicRoute'));
app.use("/api/customers", require('./routes/customerRoute'));
app.use("/api/reports", require('./routes/reportRoute'));
app.use("/api/inventory", require('./routes/inventoryRoute'));
app.use("/api/hr", require('./routes/hrRoute'));
app.use("/api/accounting", require('./routes/accountingRoute'));
app.use("/api/delivery", require('./routes/deliveryRoute'));
// Menu photos. nosniff so an uploaded file is only ever served as the image type we checked.
app.use("/uploads", express.static(require('path').join(__dirname, 'uploads'), {
  setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
}));
app.get("/api/events", isVerifiedUser, subscribe); // live updates (Server-Sent Events)

//Error Handler
app.use(globalErrorHandler);


//server listening
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    require('./utils/scheduler').start();
    // One-time: the users' email index becomes sparse so several PIN-only staff (no email) can exist.
    require('./models/userModel').syncIndexes().catch((error) => console.error('User index sync failed', error));
}
);