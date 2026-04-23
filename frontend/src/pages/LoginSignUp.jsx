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
    studentType: "academic",
  });
  const [loginRole, setLoginRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        <div className="flex flex-col md:flex-row min-h-[440px] max-h-[90vh]">

          {/* LEFT SIDE - Login Form */}
          <div
            className={`absolute md:relative w-full md:w-1/2 h-full p-6 bg-white transition-all duration-500 ease-in-out overflow-y-auto ${isLogin
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 pr-10 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.822 7.822 3 3m-3-3-3.951-3.951m-6.82-6.82L9.75 9.75m4.5 4.5-4.5-4.5m4.5 4.5 3 3m-3-3 1.121-1.121" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
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

            {/* 
            <p className="text-center text-gray-600 text-sm mt-4">
              Don't have an account?{" "}
              <button
                onClick={toggleMode}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
            */}
          </div>

          {/* RIGHT SIDE - Signup Form */}
          <div 
            className={`absolute md:relative w-full md:w-1/2 h-full p-6 bg-white transition-all duration-500 ease-in-out overflow-y-auto ${
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
            
            <form onSubmit={handleSubmit} className="space-y-3 pb-4">
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
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-800"
                >
                  <option value="student">👨‍🎓 Student</option>
                  <option value="teacher">👨‍🏫 Teacher</option>
                </select>
              </div>

              {/* IELTS Category - ONLY for students */}
              {formData.role === "student" && (
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1.5">
                    IELTS Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="studentType"
                    value={formData.studentType}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 text-base border-2 border-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-800 font-medium"
                  >
                    <option value="academic">🎓 Academic IELTS</option>
                    <option value="general">🌏 General IELTS</option>
                  </select>
                </div>
              )}

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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 pr-10 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.822 7.822 3 3m-3-3-3.951-3.951m-6.82-6.82L9.75 9.75m4.5 4.5-4.5-4.5m4.5 4.5 3 3m-3-3 1.121-1.121" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
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
            className={`absolute top-0 w-full md:w-1/2 h-full bg-linear-to-br from-blue-600 to-purple-600 text-white flex flex-col justify-center items-center transition-all duration-500 ease-in-out left-0 md:left-1/2 hidden md:flex z-20`}
          >
            <div className="text-center px-8">
              <div className="text-5xl mb-4">
                📚
              </div>
              <h2 className="text-3xl font-bold mb-3">
                IELTS LMS Portal
              </h2>
              <p className="text-base mb-6 opacity-90 leading-relaxed">
                Welcome! This is an exclusive platform.<br/><br/>
                Please log in with the official credentials provided by your Administrator to access your premium test preparation dashboard.
              </p>
              {/* Sign up button hidden for Admin-provisioned architecture
              <button
                onClick={toggleMode}
                className="px-6 py-2 border-2 border-white rounded-full font-semibold text-base hover:bg-white hover:text-blue-600 transition duration-300 transform hover:scale-110"
              >
                {isLogin ? "Sign Up" : "Login"}
              </button> 
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginSignUp;