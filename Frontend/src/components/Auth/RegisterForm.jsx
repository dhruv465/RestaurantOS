import React, { useState } from "react";
import {
  FaUser,
  FaLock,
  FaPhone,
  FaEnvelope,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { useMutation } from "@tanstack/react-query";
import { register } from "../../https";
import { enqueueSnackbar } from "notistack";

const hotelQuotes = [
  "Join our team of hospitality excellence.",
  "Where passion for service meets professional growth.",
  "Be part of creating unforgettable guest experiences.",
  "Excellence in hospitality begins with our team.",
];

const Input = ({ icon: Icon, label, ...props }) => (
  <div className="space-y-2">
    <label className="block text-[#ababab] text-sm font-medium">{label}</label>
    <div className="relative">
      <Icon
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ababab]"
        size={16}
      />
      <input
        {...props}
        className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all"
      />
    </div>
  </div>
);

const RegisterForm = ({ onToggleForm }) => {
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "",
  });
  const [randomQuote] = useState(
    () => hotelQuotes[Math.floor(Math.random() * hotelQuotes.length)]
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const hadleRoleSelection = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const registerMutation = useMutation({
    mutationFn: (reqData) => register(reqData),
    onSuccess: (res) => {
      const { data } = res;
      enqueueSnackbar(data.message, { variant: "success" });
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "",
      });

      setTimeout(() => {}, 1500);
    },
    onError: (error) => {
      const { response } = error;
      enqueueSnackbar(response.data.message, { variant: "error" });
    },
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--main-bg)" }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-color)] rounded-full opacity-5 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--primary-color)] rounded-full opacity-5 transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="backdrop-blur-xl bg-[var(--card-bg)] rounded-2xl shadow-xl p-8 relative border border-[var(--border-color)]">
          <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--input-bg)] transition-colors"
            style={{ color: "var(--text-color)" }}
          >
            {theme === "dark" ? <FaSun size={20} /> : <FaMoon size={20} />}
          </button>

          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: "var(--text-color)" }}
            >
              RestOS
            </h1>
            <p className="text-[#ababab] text-sm mb-4">Create your account</p>
            <p className="text-sm italic text-[var(--text-color)] opacity-75 px-4">
              {randomQuote}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              icon={FaUser}
              label="Employee Name"
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
            />
            <Input
              icon={FaPhone}
              label="Phone Number"
              type="tel"
              name="phone"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
            />
            <Input
              icon={FaEnvelope}
              label="Email Address"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
            <Input
              icon={FaLock}
              label="Password"
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />

            <div className="space-y-2">
              <label className="block text-[#ababab] text-sm font-medium">
                Role
              </label>
              <div className="flex item-center gap-3 mt-4">
                {["Waiter", "Cashier", "Admin"].map((role) => {
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => hadleRoleSelection(role)}
                      className="bg-[var(--main-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)]"
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-medium bg-[#F6b100] text-white hover:bg-[#F6b100]/90 transition-colors duration-200"
            >
              Sign up
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onToggleForm}
              className="text-sm text-[#ababab] hover:text-[var(--text-color)] transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
