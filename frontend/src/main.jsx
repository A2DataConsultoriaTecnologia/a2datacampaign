// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

ReactDOM.render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Todas as outras rotas ficam protegidas */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <App />
            </PrivateRoute>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
  document.getElementById('root')
);
