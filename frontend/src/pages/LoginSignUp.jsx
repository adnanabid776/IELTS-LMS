import React from "react";
import { useState } from "react";
import { toast } from "react-toastify";
import { loginUser, registerUser } from "../services/api";

function LoginSignUp() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
  });
  const [loginRole, setLoginRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin && !loginRole) {
      setError("Please select your role");
      toast.error("Please select your role");
      setLoading(false);
      return;
    }

    try {
      const response = isLogin
        ? await loginUser(formData.email, formData.password)
        : await registerUser(formData);

      if (isLogin && response.user.role !== loginRole) {
        setError(
          `Invalid credentials. You selected ${loginRole} but this account is registered as ${response.user.role}.`,
        );
        toast.error(
          `This account is registered as ${response.user.role}, not ${loginRole}`,
        );
        setLoading(false);
        return;
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      toast.success(
        isLogin
          ? `Welcome back, ${response.user.firstName}!`
          : "Registration successful!",
      );

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Something went wrong";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setLoginRole("");
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
    });
  };
 return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600 p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex flex-col md:flex-row h-138">
          
          {/* LEFT SIDE - Login Form */}
          <div 
            className={`absolute md:relative w-full md:w-1/2 h-full p-6 bg-white transition-all duration-500 ease-in-out ${
              isLogin 
                ? 'translate-x-0 opacity-100 z-10' 
                : 'translate-x-full opacity-0 z-0 pointer-events-none'
            }`}
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome Back! 👋
            </h2>
            <p className="text-gray-600 text-base mb-5">
              Login to continue your IELTS preparation
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Role Selection */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Login as <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-sm">
                    <input
                      type="radio"
                      name="loginRole"
                      value="student"
                      checked={loginRole === "student"}
                      onChange={(e) => setLoginRole(e.target.value)}
                      className="mr-1.5"
                    />
                    <span>👨‍🎓 Student</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-sm">
                    <input
                      type="radio"
                      name="loginRole"
                      value="teacher"
                      checked={loginRole === "teacher"}
                      onChange={(e) => setLoginRole(e.target.value)}
                      className="mr-1.5"
                    />
                    <span>👨‍🏫 Teacher</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-sm">
                    <input
                      type="radio"
                      name="loginRole"
                      value="admin"
                      checked={loginRole === "admin"}
                      onChange={(e) => setLoginRole(e.target.value)}
                      className="mr-1.5"
                    />
                    <span>👑 Admin</span>
                  </label>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  placeholder="your@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  placeholder="••••••••"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transform hover:scale-105 transition duration-200 shadow-lg text-base"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="text-center text-gray-600 text-sm mt-4">
              Don't have an account?{" "}
              <button
                onClick={toggleMode}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>

          {/* RIGHT SIDE - Signup Form */}
          <div 
            className={`absolute md:relative w-full md:w-1/2 h-full p-6 bg-white transition-all duration-500 ease-in-out ${
              !isLogin 
                ? 'translate-x-0 opacity-100 z-10' 
                : '-translate-x-full opacity-0 z-0 pointer-events-none'
            }`}
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Create Account 🚀
            </h2>
            <p className="text-gray-600 text-base mb-5">
              Sign up to start your IELTS journey
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name Fields */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required={!isLogin}
                    placeholder="John"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required={!isLogin}
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="student">👨‍🎓 Student</option>
                  <option value="teacher">👨‍🏫 Teacher</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  placeholder="your@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  placeholder="••••••••"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transform hover:scale-105 transition duration-200 shadow-lg text-base"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            <p className="text-center text-gray-600 text-sm mt-4">
              Already have an account?{" "}
              <button
                onClick={toggleMode}
                className="text-blue-600 font-semibold hover:underline"
              >
                Login
              </button>
            </p>
          </div>

          {/* SLIDING PANEL - Moves smoothly between forms */}
          <div
            className={`absolute top-0 w-full md:w-1/2 h-full bg-linear-to-br from-blue-600 to-purple-600 text-white flex flex-col justify-center items-center transition-all duration-500 ease-in-out ${
              isLogin 
                ? 'left-0 md:left-1/2' 
                : 'left-0 md:left-0'
            } hidden md:flex z-20`}
          >
            <div className="text-center px-8">
              <div className="text-5xl mb-4">
                {isLogin ? '📚' : '🎓'}
              </div>
              <h2 className="text-3xl font-bold mb-3">
                {isLogin ? "New Here?" : "Welcome Back!"}
              </h2>
              <p className="text-base mb-6 opacity-90">
                {isLogin
                  ? "Sign up and start your journey to IELTS success!"
                  : "Login to continue your IELTS preparation!"}
              </p>
              <button
                onClick={toggleMode}
                className="px-6 py-2 border-2 border-white rounded-full font-semibold text-base hover:bg-white hover:text-blue-600 transition duration-300 transform hover:scale-110"
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginSignUp;