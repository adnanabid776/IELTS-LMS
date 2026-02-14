import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import CreateUserModal from "./components/CreateUserModal";
import EditUserModal from "./components/EditUserModal";
import { deleteUserAdmin, getAllUsersAdmin } from "../../services/api";

const UserManagement = () => {
  // const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, roleFilter, statusFilter, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsersAdmin(); //admin getting all users
      setUsers(response.users);
      setFilteredUsers(response.users);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredUsers(filtered);
  };

  const handleDelete = async (userId, userName) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${userName}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteUserAdmin(userId);
      toast.success("User deleted successfully");
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Delete user error:", error);
      const errorMsg = error.response?.data?.error || "Failed to delete user";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "teacher":
        return "bg-green-100 text-green-800";
      case "student":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = {
    total: users.length,
    students: users.filter((u) => u.role === "student").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  };

  return (
    <DashboardLayout title="User Management">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            User Management
          </h2>
          <p className="text-gray-600">Manage all system users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          <span className="text-xl">➕</span>
          Create User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Students</p>
          <p className="text-2xl font-bold text-blue-600">{stats.students}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Teachers</p>
          <p className="text-2xl font-bold text-green-600">{stats.teachers}</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Admins</p>
          <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Users Table */}
      {!loading && filteredUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                          {user.firstName[0].toUpperCase()}
                          {user.lastName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              user._id,
                              `${user.firstName} ${user.lastName}`,
                            )
                          }
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">👥</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            No users found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || roleFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first user to get started"}
          </p>
          {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default UserManagement;
