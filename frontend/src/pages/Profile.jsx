import React, { useState } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { updateUserProfile } from "../services/api";

const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  });
  const [isEdit, setIsEdit] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      const response = await updateUserProfile(
        formData.firstName,
        formData.lastName
      );
      const updatedUser = {
        ...user,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile updated successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 3200);
      setIsEdit(false);
    } catch (error) {
      console.error();
      toast.error(error.response?.data?.error || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
    setIsEdit(false);
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Profile Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-2xl">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-gray-600">{user.email}</p>
                <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            {!isEdit && (
              <button
                onClick={() => setIsEdit(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Profile Form */}
          <div className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEdit}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEdit ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEdit}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEdit ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Role (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <input
                type="text"
                value={formData.role.toUpperCase()}
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Role cannot be changed
              </p>
            </div>

            {/* Action Buttons (Only show when editing) */}
            {isEdit && (
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="border-t border-gray-200 mt-6 pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Account Information
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Account Created:</span>{" "}
                {new Date().toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Last Login:</span>{" "}
                {new Date().toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">User ID:</span>{" "}
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {user._id
                    ? `${user._id.slice(0, 4)}...${user._id.slice(-4)}`
                    : "N/A"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
