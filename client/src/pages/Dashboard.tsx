import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { getProjects, createProject, deleteProject } from "../services/api";
import MiniCalendar from "../components/MiniCalender";

// Define the shape of a Project object for TypeScript type safety
interface Project {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const data = await getProjects();
        setProjects(data);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setProjectsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      const newProject = await createProject(newProjectTitle);
      setProjects([newProject, ...projects]);
      setNewProjectTitle("");
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-300 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-900"
      style={{
        backgroundImage: "url(/background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Floating Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl px-6 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-extralight tracking-wider text-white">Selfish</h1>
            <div className="flex items-center gap-4">
              <Link
                to="/calendar"
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium"
              >
                📅 Calendar
              </Link>
              <button
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors font-medium"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Two Column Layout */}
      <main className="pt-28 px-6 pb-6">
        <div className="max-w-[1800px] mx-auto flex gap-6">
          {/* Left Sidebar - Calendar & Todo */}
          <div className="w-[300px] flex-shrink-0 space-y-4">
            {/* Calendar Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <MiniCalendar />
            </div>

            {/* Todo List Section - Placeholder */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <h3 className="text-xl font-bold text-white mb-1">Todo List</h3>
              <div className="text-center py-4 text-gray-400">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-sm">Coming soon...</p>
              </div>
            </div>
            {/* AI Chatbot Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <h3 className="text-xl font-bold text-white mb-1">AI Chatbot</h3>
              <div className="text-center py-1 text-gray-400">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm">Coming soon...</p>
              </div>
            </div>
          </div>

          {/* Right Content - Welcome & Projects */}
          <div className="flex-1 space-y-6">
            {/* Welcome Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.username}!
              </h2>
              <p className="text-gray-300">Ready to track your progress today?</p>
            </div>

            {/* Projects Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Your Projects</h3>

              {/* Create Project Form */}
              <form onSubmit={handleCreateProject} className="mb-8">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="Enter project title..."
                    className="flex-1 px-5 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-semibold"
                  >
                    Create
                  </button>
                </div>
              </form>

              {/* Projects List */}
              {projectsLoading ? (
                <div className="text-center text-gray-400 py-12">
                  <p>Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-lg">No projects yet</p>
                  <p className="text-sm mt-2">
                    Create your first project to get started!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="relative group"
                    >
                      <Link
                        to={`/projects/${project.id}`}
                        className="block p-8 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-orange-500/50 transition-all"
                      >
                        <h4 className="text-lg font-semibold text-white">
                          {project.title}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Created: {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </Link>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="absolute top-3 right-3 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete project"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
