import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { removeUser } from '../utils/userSlice';
import axios from 'axios';
import { BASE_URL } from '../utils/constants';
import { useTheme } from '../utils/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { getImageUrl } from '../utils/imageUtils';

const Navbar = () => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isDark, bg, text, border } = useTheme();

  const handleLogout = async () => {
    try {
      await axios.post(BASE_URL + "/logout", {}, { withCredentials: true });
      dispatch(removeUser());
      navigate('/login');
    } catch (err) {
      console.error("Logout error:", err);
      dispatch(removeUser());
      navigate('/login');
    }
  };

  return (
    <nav className={`${isDark ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-lg shadow-lg sticky top-0 z-50 ${border.primary} border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              DevTinder
            </div>
            <span className={`text-xs ${text.muted} hidden sm:inline`}>💻</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className={`${text.secondary} hover:text-pink-500 font-medium transition-colors`}
              >
                Discover
              </Link>
              <Link
                to="/requests"
                className={`${text.secondary} hover:text-pink-500 font-medium transition-colors relative`}
              >
                Requests
              </Link>
              <Link
                to="/connections"
                className={`${text.secondary} hover:text-pink-500 font-medium transition-colors`}
              >
                Connections
              </Link>
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-4 relative">
                <div className="hidden md:block text-right">
                  <p className={`text-sm font-semibold ${text.primary}`}>
                    {user.firstName}
                  </p>
                </div>

                {/* Avatar with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500 ring-2 ring-pink-500/30">
                      <img
                        alt="User Avatar"
                        src={getImageUrl(user.photourl)}
                        key={user.photourl} // Force re-render when photo changes
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40'
                        }}
                      />
                    </div>
                    <svg
                      className={`w-4 h-4 ${text.muted} transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      ></div>
                      <div className={`absolute right-0 mt-2 w-48 ${bg.secondary} rounded-xl shadow-2xl ${border.primary} border py-2 z-50 animate-fadeIn`}>
                        <Link
                          to="/messages"
                          onClick={() => setDropdownOpen(false)}
                          className={`block px-4 py-2 text-sm ${text.secondary} hover:bg-pink-500/10 hover:text-pink-500 transition-colors`}
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5m-7 6l2-2h10a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11l2-2z" />
                            </svg>
                            <span>Messages</span>
                          </div>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className={`block px-4 py-2 text-sm ${text.secondary} hover:bg-pink-500/10 hover:text-pink-500 transition-colors`}
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>My Profile</span>
                          </div>
                        </Link>
                        <div className={`${border.primary} border-t my-1`}></div>
                        <button
                          onClick={() => {
                            handleLogout();
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Logout</span>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className={`px-4 py-2 ${text.secondary} hover:text-pink-500 font-medium transition-colors`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
