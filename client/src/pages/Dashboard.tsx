import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { getProjects, createProject, deleteProject } from "../services/api";
import MiniCalendar from "../components/MiniCalender";
import TodoWidget from "../components/TodoWidget";

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
  // Search state for filtering projects
  const [searchQuery, setSearchQuery] = useState("");
  // Modal state for project creation
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
      setIsCreateModalOpen(false); // Close modal after creation
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

  // Filter projects based on search query (case-insensitive)
  const filteredProjects = searchQuery.trim() === ""
    ? projects
    : projects.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Helper function to highlight matched text in project titles
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="bg-orange-500/30 text-orange-200">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
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
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-extralight tracking-wider bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Selfish</h1>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="flex items-center gap-4">
              <Link
                to="/calendar"
                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-105"
              >
                Calendar
              </Link>
              <Link
                to="/todos"
                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-105"
              >
                Todos
              </Link>
              <Link
                to="/ai-chat"
                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg hover:scale-105"
              >
                AI Chat
              </Link>
              <div className="h-8 w-px bg-white/20"></div>
              <button
                className="px-5 py-2.5 text-gray-300 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-lg"
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

            {/* Todo List Section - Live Widget */}
            <TodoWidget />
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

              {/* Search Bar and New Project Button */}
              <div className="mb-8 flex gap-3">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full px-5 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {/* Clear search button */}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      title="Clear search"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* New Project Button */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all duration-200 font-semibold shadow-sm hover:shadow-lg hover:scale-105 whitespace-nowrap"
                >
                  + New Project
                </button>
              </div>

              {/* Projects List */}
              {projectsLoading ? (
                <div className="text-center text-gray-400 py-12">
                  <p>Loading projects...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  {searchQuery ? (
                    <>
                      <p className="text-lg">No projects found</p>
                      <p className="text-sm mt-2">
                        No projects match "{searchQuery}"
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg">No projects yet</p>
                      <p className="text-sm mt-2">
                        Create your first project to get started!
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="relative group"
                    >
                      <Link
                        to={`/projects/${project.id}`}
                        className="block p-8 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-orange-500/50 transition-all"
                      >
                        <h4 className="text-lg font-semibold text-white">
                          {highlightText(project.title, searchQuery)}
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

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Create New Project</h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewProjectTitle("");
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Enter project title..."
                  autoFocus
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewProjectTitle("");
                  }}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-semibold"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
