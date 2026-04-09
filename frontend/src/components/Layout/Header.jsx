import React from 'react'

const Header = ({user, title}) => {
   

  return (
    <header className="bg-white shadow-sm">
      <div className="flex max-sm:flex-col items-center justify-between max-sm:justify-center max-sm:gap-2 px-6 py-2 max-lg:px-18 max-lg:py-4">
        {/* Left side - Title */}
        <div className='max-sm:flex-col max-sm:text-center items-center justify-center'>
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
          {/* Student Category Badge */}
          {user.role === "student" && (
            <span className={`px-3 py-1 rounded-full text-sm font-bold tracking-tight ${
              user.studentType === "general" ? "bg-teal-100 text-teal-800" : "bg-indigo-100 text-indigo-800"
            }`}>
              {(user.studentType || "academic").toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header