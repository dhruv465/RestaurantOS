import { useState } from "react";
import { FaEnvelope, FaLock, FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { useMutation } from "@tanstack/react-query";
import { login } from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";

const hotelQuotes = [
  "Where luxury meets comfort, and service creates memories.",
  "Every guest is a story waiting to be told.",
  "Excellence in hospitality, one guest at a time.",
  "Creating moments of delight, day and night.",
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

const LoginForm = ({ onToggleForm }) => {
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [randomQuote] = useState(
    () => hotelQuotes[Math.floor(Math.random() * hotelQuotes.length)]
  );
const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const loginMutation = useMutation({
    mutationFn: (reqData) => login(reqData),
    onSuccess: (res) => {
      const { data } = res;
      console.log("Login Success:", data);
      const { _id, name, email, phone, role } = data.data;
      dispatch(setUser({ _id, name, email, phone, role }));
      navigate("/");
      dispatch(login());
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
        <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--primary-color)] rounded-full opacity-5 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--primary-color)] rounded-full opacity-5 transform translate-x-1/2 translate-y-1/2"></div>
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
            <p className="text-[#ababab] text-sm mb-4">
              Sign in to your account
            </p>
            <p className="text-sm italic text-[var(--text-color)] opacity-75 px-4">
              {randomQuote}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              icon={FaEnvelope}
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              placeholder="Enter your email"
              onChange={handleChange}
            />
            <Input
              icon={FaLock}
              label="Password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-medium bg-[#F6b100] text-white hover:bg-[#F6b100]/90 transition-colors duration-200"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onToggleForm}
              className="text-sm text-[#ababab] hover:text-[var(--text-color)] transition-colors"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
