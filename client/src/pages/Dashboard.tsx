import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Selfish</h1>
          <button
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard content here */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-gray-600">Ready to track your progress today?</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Your Projects
          </h3>

          <div className="text-center text-gray-500 py-8">
            <p>No projects yet</p>
            <p className="text-sm mt-2">
              Create your first project to get started!
            </p>
          </div>
          <div style={{ width: "50%", height: "600px" }}>
            <Tldraw />
          </div>

          {/* Later: Add "Create Project" button here */}
        </div>
      </main>
    </div>
  );
}
