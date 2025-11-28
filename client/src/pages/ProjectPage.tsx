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
  screenshotUrl?: string; // URL of canvas screenshot
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

  // Helper function to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle saving the current canvas state to the backend
  const handleSave = async () => {
    if (!currentSlideId || !editorRef.current) return;

    try {
      // 1. Get canvas JSON snapshot
      const { document, session } = getSnapshot(editorRef.current.store);
      const snapshotString = JSON.stringify({ document, session });

      // 2. Capture canvas screenshot
      let screenshotData: string | undefined;
      try {
        const result = await editorRef.current.toImage(
          Array.from(editorRef.current.getCurrentPageShapeIds()),
          {
            format: 'png',
            background: true,
            scale: 1
          }
        );

        if (result && result.blob) {
          screenshotData = await blobToBase64(result.blob);
        }
      } catch (imgErr) {
        console.warn('Screenshot capture failed, continuing with save:', imgErr);
      }

      // 3. Call API to update specific slide
      await updateSlide(currentSlideId, snapshotString, undefined, screenshotData);
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(""), 2000);

      // 4. Update local state to match DB (prevents data loss on switch)
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
  const handleRenameSlide = async (e: React.MouseEvent, slideId: string) => {
    e.stopPropagation();
    const slide = slides.find(s => s._id === slideId);
    if (!slide) return;
    const newName = window.prompt("Enter new slide name:", slide.name);
    if (!newName || newName.trim() === "") return;
    if (newName === slide.name) return;
    try {
      await updateSlide(slideId, undefined, newName.trim());
      setSlides(prev => prev.map(s => s._id === slideId ? { ...s, name: newName.trim() } : s));
    } catch (error) {
      console.error("Failed to rename slide:", error);
      alert("Failed to rename slide");
    }
  };

  // Show loading state while fetching project
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-900"
        style={{
          backgroundImage: "url(/background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="text-gray-300 text-lg">Loading slides...</div>
      </div>
    );
  }

  // Show error if project not found
  if (!project) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-900"
        style={{
          backgroundImage: "url(/background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="text-center">
          <p className="text-gray-300 text-lg mb-4">Project not found</p>
          <Link to="/dashboard" className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors font-medium inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  const currentSlide = getCurrentSlide();

  return (
    <div
      className="h-screen flex flex-col bg-gray-900"
      style={{
        backgroundImage: "url(/background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Floating Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Link */}
              <Link
                to="/dashboard"
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                ← Back
              </Link>
              {/* Title */}
              <h2 className="text-xl font-bold text-white">{project.title}</h2>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-extralight tracking-wider text-white">Selfish</h1>
              <Link
                to="/calendar"
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all font-medium"
              >
                📅 Calendar
              </Link>
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
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden pt-24">
        {/* Glassmorphic Sidebar */}
        <aside className="w-64 bg-white/5 backdrop-blur-sm border-r border-white/10 flex flex-col m-4 mr-0 rounded-2xl">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">
              Slides
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide._id}
                onClick={() => handleSwitchSlide(slide._id)}
                className={`w-full px-4 py-3 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${currentSlideId === slide._id
                  ? "bg-orange-500 text-white shadow-lg"
                  : "text-gray-300 hover:bg-white/10 hover:border-orange-500/50"
                  }`}
              >
                <span className="font-medium">{slide.name}</span>
                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Rename Button */}
                  <button
                    onClick={(e) => handleRenameSlide(e, slide._id)}
                    className={`p-1 rounded hover:bg-blue-500/20 hover:text-blue-400 transition-all ${currentSlideId === slide._id
                      ? "text-white/70"
                      : "text-gray-500 opacity-0 group-hover:opacity-100"
                      }`}
                    title="Rename Slide"
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
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                      <path d="m15 5 4 4"></path>
                    </svg>
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteSlide(e, slide._id)}
                    className={`p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all ${currentSlideId === slide._id
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
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => projectId && handleCreateNewSlide(projectId)}
              className="w-full py-2 border-2 border-dashed border-white/20 text-gray-300 rounded-xl hover:border-orange-500/50 hover:text-white transition-colors"
            >
              + New Slide
            </button>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-white/5 backdrop-blur-sm m-4 ml-2 rounded-2xl border border-white/10 overflow-hidden">
          {currentSlide && (
            <Tldraw
              // CRITICAL: Changing key forces remount on slide switch
              key={currentSlideId}
              snapshot={getSnapshotFromSlide(currentSlide)}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.user.updateUserPreferences({ colorScheme: "light" });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
