
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { Provider } from 'react-redux'; 
import { ThemeProvider } from './utils/ThemeContext';
import Body from './Body';
import Profile from './components/Profile';
import Login from './components/Login';
import Signup from './components/Signup';
import Feed from './components/Feed';
import Requests from './components/Requests';
import Connections from './components/Connections';
import Messages from './components/Messages';
import MessageHub from './components/MessageHub';
import ProtectedRoute from './components/ProtectedRoute';
import appStore from './utils/appStore';

function App() {
  return (
     <Provider store={appStore}>
      <ThemeProvider>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/" element={<Body />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="profile" element={<Profile />} />
            <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><MessageHub /></ProtectedRoute>} />
            <Route path="messages/:userId" element={<ProtectedRoute><MessageHub /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
     </Provider>
  );
}

export default App;





 