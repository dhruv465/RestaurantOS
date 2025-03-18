# RestaurantOS 2

A modern Restaurant POS (Point Of Sale) system designed to streamline restaurant operations, manage orders efficiently, and enhance customer dining experience.

---

## 📚 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Contribution](#contribution)
- [License](#license)

---

## 🎯 Project Overview

RestaurantOS is a full-stack application featuring a responsive digital menu, robust order management, a billing system, and payment integrations to optimize restaurant workflows.

---

## 🛠️ Tech Stack

### Frontend:
- React: For building the user interface and user experience.
- Vite
- Tailwind CSS
- Vanilla JavaScript

### Backend:
- Node.js
- Express
- MongoDB
- Mongoose
- Razorpay API
- JWT Authentication

---

## 🏗️ Project Structure

```
RestaurantOS_2/
└── RestaurantOS/
    ├── Frontend/
    │   ├── index.html
    │   ├── tailwind.config.js
    │   ├── vite.config.js
    │   ├── package.json
    │   ├── .env
    │   └── dist/ (Production build)
    └── Backend/
        ├── app.js
        ├── package.json
        ├── .env
        ├── routes/
        ├── controllers/
        ├── models/
        ├── middlewares/
        └── config/
```

---

## ⚡ Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd RestaurantOS/Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 🚀 Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd RestaurantOS/Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/restaurantOS
   JWT_SECRET=your_secret_key
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

---

## 🔗 API Endpoints

### User APIs
- `POST /api/user/register` - Register user
- `POST /api/user/login` - Login user

### Order APIs
- `POST /api/order` - Create new order
- `GET /api/order/:id` - Get order by ID
- `PUT /api/order/:id` - Update order status
- `DELETE /api/order/:id` - Cancel order

### Table APIs
- `POST /api/table` - Add table
- `GET /api/table` - List tables

### Payment APIs
- `POST /api/payment` - Process payment (Razorpay integration)

### Category & Item APIs
- `POST /api/categories` - Create food category
- `GET /api/categories` - List categories
- `POST /api/items` - Add menu item
- `GET /api/items` - List menu items

---

## 🌟 Features

- Role-based authentication (manager & staff)
- Digital restaurant menu
- Order management with table assignments
- Bill generation
- Razorpay payment gateway integration
- Centralized error handling
- CORS configured for local and production URLs

---

## 🤝 Contribution

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes.
4. Push to your branch.
5. Open a pull request.

---

## 📄 License

This project is open-source and licensed under the MIT License.
---

> Built with ❤️ for restaurant efficiency.

