import React, { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import axios from 'axios'
import { BASE_URL } from './utils/constants'
import { useDispatch, useSelector } from 'react-redux'
import { addUser } from './utils/userSlice'
import { setAuthChecked } from './utils/authSlice'
import { initSocket, disconnectSocket } from './utils/socket'
import { useTheme } from './utils/ThemeContext'

const Body = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const { isDark, bg } = useTheme();
  const isMessagesPage = location.pathname.startsWith('/messages');

  const fetchUser = async () => {
    try {
      const res = await axios.get(BASE_URL + "/profile/view", {
        withCredentials: true,
      });
      dispatch(addUser(res.data));

      // Initialize socket after user is loaded
      if (res.data) {
        const socket = initSocket()
        if (socket) {
          socket.on('connect', () => {
            console.log('✅ Socket connected')
          })
        }
      }
    } catch (err) {
      // Only handle 401 errors - don't navigate here, let ProtectedRoute handle redirects
      // This prevents redirect loops and ensures proper auth flow
      if (err.response && err.response.status === 401) {
        disconnectSocket();
      }
      // For other errors, don't redirect - let the user stay on current page
    } finally {
      // Always mark auth as checked so ProtectedRoute doesn't need to guess
      dispatch(setAuthChecked());
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <div className={`flex flex-col min-h-screen ${bg.primary} transition-colors duration-300`}>
      {!isMessagesPage && <Navbar />}
      <main className="flex-grow">
        <Outlet />
      </main>
      {!isMessagesPage && <Footer />}
    </div>
  )
}

export default Body
