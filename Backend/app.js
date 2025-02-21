require('dotenv').config();
const express = require('express');
const app = express();
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;
connectDB();
app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}
);