import React, { useState } from 'react'
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { addUser } from '../utils/userSlice';
import { useNavigate, Link } from 'react-router-dom';
import { BASE_URL } from '../utils/constants';
import { useTheme } from '../utils/ThemeContext';

const Login = () => {
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isDark, bg, text, border, button } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await axios.post(
        BASE_URL + "/login",
        {
          emailId,
          password,
        },
        { withCredentials: true }
      );
      
      dispatch(addUser(res.data));
      return navigate("/");
    } catch (err) {
      console.error("Login error details:", err);
      // Show more detailed error message
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 404) {
        setError("Server not found. Please check if the backend is running.");
      } else if (err.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else if (err.request) {
        setError("Unable to connect to server. Please check your connection and ensure the backend is running.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600'} relative overflow-hidden py-8 transition-colors duration-300`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 ${isDark ? 'bg-pink-600' : 'bg-purple-300'} rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${isDark ? 'bg-purple-600' : 'bg-pink-300'} rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${isDark ? 'bg-indigo-600' : 'bg-indigo-300'} rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-4000`}></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className={`${isDark ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-all hover:scale-[1.02] ${border.primary} border`}>
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
              DevTinder
            </h1>
            <p className={`${text.muted} text-sm`}>Connect. Code. Collaborate.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border-l-4 border-red-500 text-red-500 rounded-lg animate-shake">
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className={`block text-sm font-semibold ${text.primary}`}>
                Email
              </label>
              <input
                type="email"
                placeholder="developer@example.com"
                value={emailId}
                onChange={(e) => setEmailId(e.target.value)}
                className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className={`block text-sm font-semibold ${text.primary}`}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none placeholder-gray-400`}
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className={`w-full ${button.primary} py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
            >
              Login
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full ${border.primary} border-t`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${isDark ? 'bg-gray-800' : 'bg-white'} ${text.muted}`}>New to DevTinder?</span>
              </div>
            </div>

            {/* Link to Signup */}
            <Link
              to="/signup"
              className={`block w-full text-center py-3 border-2 border-pink-500 text-pink-500 rounded-xl font-semibold hover:bg-pink-500/10 transition-all duration-200`}
            >
              Create Account
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login;
