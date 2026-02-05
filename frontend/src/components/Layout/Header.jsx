import React from 'react'

const Header = ({user, title}) => {
   

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Title */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {title || 'Dashboard'}
          </h2>
          <p className="text-sm text-gray-600">
            Welcome back, {user.firstName}!
          </p>
        </div>

        {/* Right side - User info + Logout */}
        <div className="flex items-center gap-4">
          {/* Role badge */}
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            {user.role.toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Header