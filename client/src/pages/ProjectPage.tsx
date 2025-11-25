// Tldraw component and styles for the canvas editor
import { Tldraw, Editor, getSnapshot } from "tldraw";
import "tldraw/tldraw.css";
// React Router hooks and components for URL params and navigation
import { useParams, Link } from "react-router-dom";
// React hooks for state and side effects
import { useEffect, useState, useRef } from "react";
// API functions to fetch and update project data
import { getProjectById } from "../services/api";
import {
  createSlide,
  getSlidesByProjectId,
  updateSlide,
  deleteSlide,
} from "../services/api";

// Define a shape of Slide object
interface Slide {
  _id: string;
  project: string;
  name: string;
  slideData?: string; // JSON string from backend
  createdAt: string;
}
// Define the shape of a Project object
interface Project {
  _id: string;
  title: string;
  userId: string;
}

export default function ProjectPage() {
  // State for project
  const [project, setProject] = useState<Project | null>(null);
  // Extract projectId from the URL parameters (e.g., /projects/:projectId)
  const { projectId } = useParams<{ projectId: string }>();
  
  // State to show save confirmation message
  const [saveMessage, setSaveMessage] = useState("");
  // State to show loading status
  const [loading, setLoading] = useState(true);
  // State to show slides
  const [slides, setSlides] = useState<Slide[]>([]);
  // State to save Current slide Id
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);

  // Ref to hold the Tldraw editor instance
  const editorRef = useRef<Editor | null>(null);

  // Fetch project slides data when component mounts or projectId changes
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;

      try {
        // Fetch Metadata
        const projectData = await getProjectById(projectId);
        setProject(projectData);

        // Fetch Slides
        const slidesData = await getSlidesByProjectId(projectId);
        setSlides(slidesData);
        // Determine Initial Slide
        if (slidesData.length > 0) {
          setCurrentSlideId(slidesData[0]._id);
        } else {
          setCurrentSlideId(null);
          // If no slides exist, create a default slide
          const newSlide = await createSlide(projectId, "Slide 1");
          setSlides([newSlide]);
          setCurrentSlideId(newSlide._id);
        }
      } catch (error) {
        console.error("Failed to fetch project:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  //get current slide data
  const getCurrentSlide = () => slides.find((s) => s._id === currentSlideId);

  // Safely parse the JSON string from MongoDB into a Tldraw snapshot object
  const getSnapshotFromSlide = (slide: Slide | undefined) => {
    if (!slide || !slide.slideData) return undefined;
    try {
      if (typeof slide.slideData === "string") {
        return JSON.parse(slide.slideData);
      }
      return slide.slideData;
    } catch (e) {
      console.error("Error parsing slide data", e);
      return undefined;
    }
  };

  // Handle CreateNewSlide
  const handleCreateNewSlide = async (pId: string, isFirstLoad = false) => {
    try {
      // Auto-save current work before creating new (unless it's the very first load)
      if (!isFirstLoad && currentSlideId) {
        await handleSave();
      }
      const newSlide = await createSlide(pId, `new slide`);
      // Update local state: Add to list and switch to it
      setSlides((prev) => [...prev, newSlide]);
      setCurrentSlideId(newSlide._id);
    } catch (error) {
      console.error("Failed to create slide:", error);
    }
  };

  // Handle SwitchSlide
  const handleSwitchSlide = async (targetSlideId: string) => {
    if (targetSlideId === currentSlideId) return;
    // Auto-save before leaving current slide
    await handleSave();
    setCurrentSlideId(targetSlideId);
  };

  // Handle saving the current canvas state to the backend
  const handleSave = async () => {
    if (!currentSlideId || !editorRef.current) return;

    try {
      const { document, session } = getSnapshot(editorRef.current.store);
      const snapshotString = JSON.stringify({ document, session });
      // Call API to update specific slide
      await updateSlide(currentSlideId, snapshotString);
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(""), 2000);
      // Update local state to match DB (prevents data loss on switch)
      setSlides((prev) =>
        prev.map((s) =>
          s._id === currentSlideId ? { ...s, slideData: snapshotString } : s
        )
      );
    } catch (error) {
      console.error("Failed to save slide:", error);
      setSaveMessage("Error");
    }
  };
  // Handle deleting a slide
  const handleDeleteSlide = async (
    e: React.MouseEvent,
    slideIdToDelete: string
  ) => {
    e.stopPropagation(); // Stop click from triggering slide switch
    if (!window.confirm("Are you sure you want to delete this slide?")) return;
    try {
      await deleteSlide(slideIdToDelete);

      // Remove from local list
      const remainingSlides = slides.filter((s) => s._id !== slideIdToDelete);
      setSlides(remainingSlides);

      // If we deleted the active slide, move to another one
      if (slideIdToDelete === currentSlideId) {
        if (remainingSlides.length > 0) {
          // Go to the last available slide
          setCurrentSlideId(remainingSlides[remainingSlides.length - 1]._id);
        } else {
          // If we deleted everything, create a new blank slide
          if (projectId) await handleCreateNewSlide(projectId, true);
        }
      }
    } catch (error) {
      console.error("Failed to delete slide:", error);
      alert("Failed to delete slide");
    }
  };

  // Show loading state while fetching project
  if (loading) {
    return (
      // DARK THEME: Loading Screen
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-gray-400 text-lg">Loading slides...</div>
      </div>
    );
  }

  // Show error if project not found
  if (!project) {
    return (
      // DARK THEME: Error Screen
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">Project not found</p>
          <Link to="/dashboard" className="text-blue-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  const currentSlide = getCurrentSlide();

  return (
    // DARK THEME: Main Container
    <div className="h-screen flex flex-col bg-zinc-900">
      {/* Header - Dark Zinc Background */}
      <nav className="bg-zinc-800 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Back Link */}
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-white font-medium transition-colors"
          >
            ← Back
          </Link>
          {/* Title - White Text */}
          <h1 className="text-xl font-bold text-white">{project.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          {saveMessage && (
            <span className="text-sm text-green-400 font-medium">
              {saveMessage}
            </span>
          )}
          {/* Save button */}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Dark Zinc Background */}
        {/* 3. Sidebar (Slide List) */}
        <aside className="w-64 bg-zinc-800 border-r border-zinc-700 flex flex-col">
          <div className="p-4 border-b border-zinc-700">
            <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
              Slides
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide._id}
                onClick={() => handleSwitchSlide(slide._id)}
                className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center justify-between cursor-pointer group ${
                  currentSlideId === slide._id
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-zinc-700"
                }`}
              >
                <span className="font-medium">Slide {index + 1}</span>

                {/* Delete Button (Visible on hover or active state) */}
                <button
                  onClick={(e) => handleDeleteSlide(e, slide._id)}
                  className={`p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all ${
                    currentSlideId === slide._id
                      ? "text-white/70"
                      : "text-gray-500 opacity-0 group-hover:opacity-100"
                  }`}
                  title="Delete Slide"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-zinc-700">
            <button
              onClick={() => projectId && handleCreateNewSlide(projectId)}
              className="w-full py-2 border-2 border-dashed border-zinc-600 text-zinc-400 rounded-lg hover:border-zinc-400 hover:text-zinc-200 transition-colors"
            >
              + New Slide
            </button>
          </div>
        </aside>

        {/* 4. Canvas Area */}
        <div className="flex-1 relative bg-zinc-900">
          {currentSlide && (
            <Tldraw
              // CRITICAL: Changing key forces remount on slide switch
              key={currentSlideId}
              snapshot={getSnapshotFromSlide(currentSlide)}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.user.updateUserPreferences({ colorScheme: "dark" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
