import React from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // Check if user is logged in
  if (!token || !user) {
    toast.error('Please login to access this page');
    return <Navigate to="/" replace />;
  }

  // If no allowedRoles specified, allow all authenticated users
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user's role is in the allowed roles
  if (!allowedRoles.includes(user.role)) {
    // friendly error message
    let message = '';
    if (allowedRoles.length === 1) {
      message = `Access denied! This page is only for ${allowedRoles[0]}s.`;
    } else {
      const rolesList = allowedRoles.join(', ').replace(/,([^,]*)$/, ' and$1');
      message = `Access denied! This page is only for ${rolesList}s.`;
    }
    
    toast.error(message);
    return <Navigate to="/dashboard" replace />;
  }

  // User is authorized, render the page
  return children;
};

export default ProtectedRoute;