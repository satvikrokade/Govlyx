import { LogOut, Shield, Bell, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../api/queryClient";

const Settings = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear all token and cache keys from storage
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("access_token");
    localStorage.removeItem("REACT_QUERY_OFFLINE_CACHE");
    // Clear the in-memory React Query cache completely
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm opacity-70">
          Manage your privacy and preferences
        </p>
      </div>

      {/* PRIVACY SETTINGS */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-blue-700" />
          <h2 className="font-semibold">Privacy</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Anonymous by default</p>
            <p className="text-xs opacity-70">
              Your identity is never shown publicly
            </p>
          </div>
          <input type="checkbox" checked disabled className="toggle toggle-sm" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Hide online status</p>
            <p className="text-xs opacity-70">
              Prevent others from seeing when you are online
            </p>
          </div>
          <input type="checkbox" className="toggle toggle-sm" />
        </div>
      </div>

      {/* NOTIFICATION SETTINGS */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-blue-700" />
          <h2 className="font-semibold">Notifications</h2>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm">New messages</p>
          <input type="checkbox" className="toggle toggle-sm" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm">Replies to your posts</p>
          <input type="checkbox" className="toggle toggle-sm" />
        </div>
      </div>

      {/* VISIBILITY */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Eye size={18} className="text-blue-700" />
          <h2 className="font-semibold">Visibility</h2>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm">Show profile in communities</p>
          <input type="checkbox" className="toggle toggle-sm" />
        </div>
      </div>

      {/* LOGOUT */}
      <div className="rounded-xl border border-base-300 bg-base-200 p-4">
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

    </div>
  );
};

export default Settings;