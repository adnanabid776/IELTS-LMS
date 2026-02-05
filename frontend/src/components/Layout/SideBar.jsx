import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SideBar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Initialize based on screen width
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get menu items based on the user's role
  const getMenuItems = () => {
    const commonItems = [
      { id: "dashboard", icon: "📊", label: "Dashboard", path: "/dashboard" },
      { id: "profile", icon: "👤", label: "Profile", path: "/profile" },
    ];

    // STUDENT MENU ITEMS
    if (user.role === "student") {
      return [
        ...commonItems.slice(0, 1), // Dashboard
        { id: "tests", icon: "📝", label: "Online Tests", path: "/tests" },
        {
          id: "assigned",
          icon: "📋",
          label: "Assigned Tests",
          path: "/assigned-tests",
        },
        {
          id: "test_history",
          icon: "📈",
          label: "Test History",
          path: "/history",
        },
        ...commonItems.slice(1), // Profile
      ];
    }

    // TEACHER MENU ITEMS
    if (user.role === "teacher") {
      return [
        ...commonItems.slice(0, 1), // Dashboard
        {
          id: "students",
          icon: "👥",
          label: "My Students",
          path: "/teacher/students",
        },
        {
          id: "assignments",
          icon: "📋",
          label: "My Assignments",
          path: "/teacher/assignments",
        },
        {
          id: "assign",
          icon: "✅",
          label: "Create Assignment",
          path: "/teacher/create-assignment",
        },
        {
          id: "pending",
          icon: "⏳",
          label: "Pending Reviews",
          path: "/pending-reviews",
        },
        ...commonItems.slice(1), // Profile
      ];
    }

    // ADMIN MENU ITEMS
    if (user.role === "admin") {
      return [
        ...commonItems.slice(0, 1), // Dashboard
        {
          id: "users",
          icon: "👥",
          label: "User Management",
          path: "/admin/users",
        },
        {
          id: "questions",
          icon: "❓",
          label: "Question Bank",
          path: "/admin/questions",
        },
        {
          id: "tests-manage",
          icon: "📝",
          label: "Manage Tests",
          path: "/admin/tests",
        },
        ...commonItems.slice(1), // Profile
      ];
    }

    // Default: just common items
    return commonItems;
  };

  const menuItems = getMenuItems();

  // Check if current path matches the menu item path
  const isActive = (path) => location.pathname === path;

  // Handle menu item click
  const handleMenuClick = (path) => {
    navigate(path);
    // Auto-collapse on mobile/tablet
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  return (
    <aside
      className={`${
        !isOpen ? "w-18" : "w-64"
      } bg-gray-800 text-white transition-all duration-300 flex flex-col h-screen`}
    >
      {/* Logo and Toggle */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className={`font-bold text-xl ${!isOpen && "hidden"}`}>
            IELTS LMS
          </h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-200 cursor-pointer hover:text-white text-2xl font-bold"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            ☰
          </button>
        </div>
        {isOpen && (
          <p className="text-xs text-gray-400 mt-1">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal
          </p>
        )}
      </div>

      {/* Menu Items */}
      <nav className="mt-4 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item.path)}
            className={`flex items-center w-full px-4 py-3 hover:bg-gray-700 transition ${
              isActive(item.path) ? "bg-blue-600" : ""
            }`}
            title={item.label}
          >
            <span className="text-xl">{item.icon}</span>
            {isOpen && <span className="ml-3">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Profile Section at Bottom */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center mb-3">
          {/* Avatar with initials */}
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user.firstName[0].toUpperCase()}
            {user.lastName[0].toUpperCase()}
          </div>

          {/* User info (only show when sidebar is open) */}
          {isOpen && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        {isOpen && (
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-700 hover:bg-red-900 rounded-lg text-white text-sm font-semibold transition flex items-center justify-center"
          >
            <span className="mr-2">🚪</span>
            Logout
          </button>
        )}
        {!isOpen && (
          <button
            onClick={handleLogout}
            className="w-full px-2 py-2 bg-red-700 hover:bg-red-900 rounded-lg text-white text-sm font-semibold transition flex items-center justify-center"
            title="Logout"
          >
            🚪
          </button>
        )}
      </div>
    </aside>
  );
};

export default SideBar;
