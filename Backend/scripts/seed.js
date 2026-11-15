const buffer = require('buffer');
if (!buffer.SlowBuffer) buffer.SlowBuffer = function () {};
if (!buffer.SlowBuffer.prototype) buffer.SlowBuffer.prototype = {};

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Item = require('../models/itemModel');
const Table = require('../models/tableModel');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurantOS');
        console.log('Connected to MongoDB for seeding...');

        // Check if admin user exists
        let admin = await User.findOne({ email: 'admin@restaurantos.com' });
        if (!admin) {
            admin = await User.create({
                name: 'Admin Manager',
                email: 'admin@restaurantos.com',
                phone: '9876543210',
                password: 'Password123',
                role: 'Admin'
            });
            console.log('Admin user created: admin@restaurantos.com / Password123');
        } else {
            console.log('Admin user already exists');
        }

        // Seed Categories if empty
        const categoryCount = await Category.countDocuments();
        let catMap = {};
        if (categoryCount === 0) {
            const categories = ['Starters', 'Main Course', 'Beverages', 'Desserts'];
            for (const name of categories) {
                const cat = await Category.create({ name });
                catMap[name] = cat._id;
            }
            console.log('Categories created:', Object.keys(catMap));
        } else {
            const cats = await Category.find();
            cats.forEach(c => { catMap[c.name] = c._id; });
        }

        // Seed Items if empty
        const itemCount = await Item.countDocuments();
        if (itemCount === 0 && catMap['Starters']) {
            const items = [
                { name: 'Paneer Tikka', price: 220, category: catMap['Starters'], itemCategory: 'veg' },
                { name: 'Chicken Tikka', price: 280, category: catMap['Starters'], itemCategory: 'non-veg' },
                { name: 'Butter Chicken', price: 350, category: catMap['Main Course'], itemCategory: 'non-veg' },
                { name: 'Dal Makhani', price: 240, category: catMap['Main Course'], itemCategory: 'veg' },
                { name: 'Paneer Butter Masala', price: 260, category: catMap['Main Course'], itemCategory: 'veg' },
                { name: 'Fresh Lime Soda', price: 80, category: catMap['Beverages'], itemCategory: 'veg' },
                { name: 'Masala Chai', price: 40, category: catMap['Beverages'], itemCategory: 'veg' },
                { name: 'Gulab Jamun', price: 90, category: catMap['Desserts'], itemCategory: 'veg' }
            ];
            await Item.insertMany(items);
            console.log(`Seeded ${items.length} menu items`);
        }

        // Seed Tables if empty
        const tableCount = await Table.countDocuments();
        if (tableCount === 0) {
            const tables = [
                { tableNo: 1, seats: 4, status: 'Available' },
                { tableNo: 2, seats: 2, status: 'Available' },
                { tableNo: 3, seats: 6, status: 'Available' },
                { tableNo: 4, seats: 4, status: 'Available' },
                { tableNo: 5, seats: 8, status: 'Available' }
            ];
            await Table.insertMany(tables);
            console.log(`Seeded ${tables.length} tables`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
