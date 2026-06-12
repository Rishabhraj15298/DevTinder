import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../utils/ThemeContext'

const Footer = () => {
  const { isDark, bg, text, border } = useTheme()

  return (
    <footer className={`${isDark ? 'bg-gray-900' : 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600'} ${isDark ? text.primary : 'text-white'} mt-auto transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <h3 className={`text-2xl font-bold ${isDark ? 'bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent' : ''}`}>DevTinder</h3>
              <span className="text-xl">💻</span>
            </div>
            <p className={`${isDark ? text.secondary : 'text-white/90'} text-sm`}>
              Connect with developers, collaborate on projects, and build amazing things together.
            </p>
            <p className={`${isDark ? text.muted : 'text-white/80'} text-xs`}>
              Copyright © {new Date().getFullYear()} DevTinder. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className={`${isDark ? text.secondary + ' hover:text-pink-500' : 'text-white/90 hover:text-white'} transition-colors text-sm`}>
                  Discover
                </Link>
              </li>
              <li>
                <Link to="/profile" className={`${isDark ? text.secondary + ' hover:text-pink-500' : 'text-white/90 hover:text-white'} transition-colors text-sm`}>
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/connections" className={`${isDark ? text.secondary + ' hover:text-pink-500' : 'text-white/90 hover:text-white'} transition-colors text-sm`}>
                  Connections
                </Link>
              </li>
              <li>
                <Link to="/messages" className={`${isDark ? text.secondary + ' hover:text-pink-500' : 'text-white/90 hover:text-white'} transition-colors text-sm`}>
                  Messages
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Connect With Us</h4>
            <div className="flex space-x-4">
              <a
                href="#"
                className={`w-10 h-10 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white/20 hover:bg-white/30'} rounded-full flex items-center justify-center transition-all hover:scale-110`}
                aria-label="Twitter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  className="fill-current"
                >
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
              <a
                href="#"
                className={`w-10 h-10 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white/20 hover:bg-white/30'} rounded-full flex items-center justify-center transition-all hover:scale-110`}
                aria-label="YouTube"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  className="fill-current"
                >
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"></path>
                </svg>
              </a>
              <a
                href="#"
                className={`w-10 h-10 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white/20 hover:bg-white/30'} rounded-full flex items-center justify-center transition-all hover:scale-110`}
                aria-label="GitHub"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  className="fill-current"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
