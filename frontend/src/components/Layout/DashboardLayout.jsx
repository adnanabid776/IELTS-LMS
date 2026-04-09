import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import SideBar from "./SideBar";
import Header from "./Header";
import { getCurrUser } from "../../services/authApi";
const DashboardLayout = ({ children, title, hideHeader = false, collapseSidebar = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Get user from localStorage
      const userData = localStorage.getItem("user");

      if (!userData) {
        // No user data, redirect to login
        navigate("/");
        return;
      }

      // Parse and set user instantly for UI
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Background sync to catch changes (e.g., admin updating student's track)
      // This runs quietly every time the path changes.
      getCurrUser().then(profileData => {
        if (profileData && profileData.user) {
          // If the profile data differs significantly, state will update globally locally
          setUser(profileData.user);
          localStorage.setItem("user", JSON.stringify(profileData.user));
        }
      }).catch(err => console.error("Global background sync failed:", err));

    } catch (error) {
      console.error("Error loading user:", error);
      // Clear corrupted data
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  // Show loading while checking user
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if no user (shouldn't happen due to redirect, but safe)
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <SideBar user={user} forceCollapsed={collapseSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Conditionally Rendered */}
        {!hideHeader && <Header user={user} title={title} />}

        {/* Page Content */}
        <main
          id="dashboard-main-content"
          className="flex-1 overflow-y-auto p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
