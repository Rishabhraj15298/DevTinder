import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { BASE_URL } from '../utils/constants';
import { useTheme } from '../utils/ThemeContext';

const ProtectedRoute = ({ children }) => {
  const user = useSelector((state) => state.user);
  const authChecked = useSelector((state) => state.auth.authChecked);
  const [isProfileComplete, setIsProfileComplete] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isDark, bg, text } = useTheme();

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/profile/completion`, {
          withCredentials: true,
        });
        setIsProfileComplete(res.data.isProfileComplete);
        setProfileCompletion(res.data.profileCompletion || 0);
      } catch (err) {
        console.error('Error checking profile completion:', err);
        setIsProfileComplete(false);
      } finally {
        setLoading(false);
      }
    };

    if (authChecked) {
      checkProfileCompletion();
    }
  }, [user, authChecked]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg.primary}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto"></div>
          <p className={`mt-4 ${text.secondary}`}>Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If profile is not complete, redirect to profile with message
  if (!isProfileComplete) {
    return (
      <div className={`min-h-screen ${bg.primary} flex items-center justify-center py-6 px-4`}>
        <div className={`max-w-md w-full ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8 ${isDark ? 'border-gray-700' : 'border-gray-200'} border-2`}>
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold ${text.primary} mb-2`}>
                Profile Incomplete
              </h2>
              <p className={`${text.secondary} mb-4`}>
                Complete your profile to access this feature
              </p>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-semibold ${text.primary}`}>Profile Completion</span>
                  <span className={`text-lg font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {profileCompletion}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${profileCompletion === 100 ? 'bg-green-500' : 'bg-yellow-500'} transition-all duration-300`}
                    style={{ width: `${profileCompletion}%` }}
                  ></div>
                </div>
              </div>

              <div className={`mb-6 p-4 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg text-left`}>
                <p className={`text-sm font-semibold ${text.primary} mb-2`}>Required Fields:</p>
                <ul className={`text-sm ${text.secondary} space-y-1 list-disc list-inside`}>
                  <li>College Name</li>
                  <li>Course</li>
                  <li>Branch</li>
                  <li>Skills (at least 1)</li>
                  <li>Age</li>
                  <li>Gender</li>
                </ul>
                <p className={`text-sm font-semibold ${text.primary} mt-3 mb-2`}>Optional Fields:</p>
                <ul className={`text-sm ${text.secondary} space-y-1 list-disc list-inside`}>
                  <li>About</li>
                  <li>Profile Photo</li>
                  <li>City</li>
                  <li>State</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.href = '/profile'}
                className={`w-full ${isDark ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gradient-to-r from-pink-500 to-purple-600'} text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
              >
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Profile is complete, allow access
  return children;
};

export default ProtectedRoute;

