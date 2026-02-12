"""
RAG (Retrieval Augmented Generation) Module
Handles fetching user data, creating embeddings, and building context for AI chatbot
"""
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from google import genai
from datetime import datetime
from dotenv import load_dotenv

# Load .env file explicitly
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)


class RAGService:
    """
    RAG Service for Selfish AI Chatbot
    - Fetches user data from Supabase
    - Creates embeddings using Gemini
    - Stores slide embeddings in Supabase pgvector
    - Sends projects/todos as direct context
    - Retrieves relevant context for queries
    """
    
    def __init__(self):
        """Initialize RAG service with Supabase client"""
        # Validate environment variables
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        if not supabase_url:
            raise ValueError("SUPABASE_URL environment variable is not set. Check your .env file.")
        if not supabase_key:
            raise ValueError("SUPABASE_SERVICE_KEY environment variable is not set. Check your .env file.")
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set. Check your .env file.")
        
        # Initialize Supabase client
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Initialize Gemini client for embeddings
        self.genai_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        print("✅ RAG Service initialized with Supabase pgvector")
    
    
    def fetch_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch all user data from Supabase
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Dictionary containing projects, slides, todos, and calendar tokens
        """
        try:
            # Fetch projects
            projects_response = self.supabase.table("projects").select("*").eq("user_id", user_id).execute()
            projects = projects_response.data if projects_response.data else []
            
            # Fetch slides for all user projects
            slides = []
            for project in projects:
                slides_response = self.supabase.table("slides").select("*").eq("project_id", project["id"]).execute()
                if slides_response.data:
                    slides.extend(slides_response.data)
            
            # Fetch todos
            todos_response = self.supabase.table("todos").select("*").eq("user_id", user_id).execute()
            todos = todos_response.data if todos_response.data else []
            
            # Fetch calendar tokens (just to check if connected)
            calendar_response = self.supabase.table("calendar_tokens").select("*").eq("user_id", user_id).execute()
            has_calendar = len(calendar_response.data) > 0 if calendar_response.data else False
            
            return {
                "projects": projects,
                "slides": slides,
                "todos": todos,
                "has_calendar": has_calendar,
                "fetched_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error fetching user data: {e}")
            return {
                "projects": [],
                "slides": [],
                "todos": [],
                "has_calendar": False,
                "error": str(e)
            }
    
    
    def create_embedding(self, text: str) -> List[float]:
        """
        Create embedding for a given text using Gemini embedding model
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            result = self.genai_client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
                config={
                    "output_dimensionality": 768   # IMPORTANT: match old model
                }
            )
            
            embedding = result.embeddings[0].values
            return embedding
        except Exception as e:
            print(f"Error creating embedding: {e}")
            # Return a default zero vector if embedding fails
            return [0.0] * 768  # text-embedding-004 dimension
    
    
    def update_single_embedding(self, user_id: str, slide_id: str, slide_name: str, project_id: str, description: str) -> Dict[str, Any]:
        """
        Update embedding for a single slide.
        Called after description is generated.
        
        Args:
            user_id: UUID of the user
            slide_id: UUID of the slide
            slide_name: Name of the slide
            project_id: UUID of the project this slide belongs to
            description: AI-generated description of the slide
            
        Returns:
            Dictionary with success status and message
        """
        try:
            # Build document text (same format as full indexing)
            doc_text = f"Slide: {slide_name}\nDescription: {description}"
            
            # Create embedding
            embedding = self.create_embedding(doc_text)
            
            if not embedding or embedding == [0.0] * 768:
                return {"success": False, "message": "Embedding creation failed"}
            
            # Upsert to Supabase (replaces existing if present)
            self.supabase.rpc('upsert_embedding', {
                'p_user_id': user_id,
                'p_document_type': 'slide',
                'p_document_id': slide_id,
                'p_text_content': doc_text,
                'p_embedding': embedding,
                'p_metadata': {
                    'slide_name': slide_name,
                    'project_id': project_id,
                    'type': 'slide'
                }
            }).execute()
            
            print(f"📊 Updated embedding for slide {slide_id} (project: {project_id})")
            return {"success": True, "message": f"Embedding updated for {slide_name}"}
            
        except Exception as e:
            print(f"❌ Failed to update embedding: {e}")
            return {"success": False, "message": str(e)}
    
    
    def fetch_direct_context(self, user_id: str) -> str:
        """
        Fetch projects and todos directly as formatted text context (no embeddings)
        
        This is part of the hybrid approach:
        - Slides: Use semantic search with embeddings (complex visual content)
        - Projects/Todos: Send directly as context (small structured data)
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Formatted string with all projects and todos
        """
        try:
            context_parts = []
            
            # Fetch ALL projects for this user
            projects_response = self.supabase.table("projects").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            projects = projects_response.data if projects_response.data else []
            
            # Fetch ALL todos for this user
            todos_response = self.supabase.table("todos").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            todos = todos_response.data if todos_response.data else []
            
            # Format projects
            if projects:
                context_parts.append("=== USER'S PROJECTS ===")
                for project in projects:
                    project_text = f"Project: {project.get('title', 'Untitled')}\n"
                    project_text += f"Created: {project.get('created_at', 'Unknown')}\n"
                    project_text += f"ID: {project.get('id', '')}\n"
                    context_parts.append(project_text)
            
            # Format todos
            if todos:
                context_parts.append("=== USER'S TODOS ===")
                for todo in todos:
                    todo_text = f"Todo: {todo.get('title', 'Untitled')}\n"
                    if todo.get('description'):
                        todo_text += f"Description: {todo.get('description')}\n"
                    todo_text += f"Priority: {todo.get('priority', 'medium')}\n"
                    todo_text += f"Status: {todo.get('status', 'pending')}\n"
                    if todo.get('due_date'):
                        todo_text += f"Due Date: {todo.get('due_date')}\n"
                    if todo.get('calendar_event_id'):
                        todo_text += "Calendar: Synced\n"
                    context_parts.append(todo_text)
            
            # Combine all context
            full_context = "\n".join(context_parts)
            
            print(f"📊 Fetched direct context: {len(projects)} projects, {len(todos)} todos")
            return full_context
            
        except Exception as e:
            print(f"Error fetching direct context: {e}")
            return ""
    
    
    def prepare_documents_for_embedding(self, user_data: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
        """
        Convert slides into documents ready for embedding
        
        Hybrid Approach:
        - Slides: Create embeddings for semantic search (rich visual content)
        - Projects/Todos: Sent as direct context (handled by fetch_direct_context)
        
        Args:
            user_data: Dictionary from fetch_user_data()
            user_id: User UUID to add to metadata for filtering
            
        Returns:
            List of slide documents with text, metadata, and IDs
        """
        documents = []
        
        # Process ONLY slides (projects/todos handled by fetch_direct_context)
        for slide in user_data.get("slides", []):
            # Prefer AI-generated description (stored when slide was saved)
            ai_description = slide.get('description', '')
            content_type = slide.get('content_type', '')
                
            doc_text = f"Slide: {slide.get('name', 'Untitled Slide')}\n"
                
            if ai_description:
                # Use the rich AI description
                if content_type:
                    doc_text += f"Type: {content_type}\n"
                doc_text += f"Description: {ai_description}\n"
            else:
                # Fallback: just note that visual content exists
                doc_text += "Content: Visual canvas content (no description available)\n"
                
            # Metadata for filtering and context
            metadata = {
                "type": "slide",
                "user_id": user_id,  # CRITICAL: For user-scoped queries
                "slide_id": str(slide.get("id", "")),
                "name": str(slide.get("name", "Untitled Slide")),
            }
            if slide.get("screenshot_url"):
                metadata["screenshot_url"] = str(slide.get("screenshot_url"))
            metadata["has_description"] = bool(ai_description)
            # Add project_id to enable project-level filtering
            if slide.get("project_id"):
                metadata["project_id"] = str(slide.get("project_id"))
                
            documents.append({
                "id": f"slide_{slide.get('id')}",
                "text": doc_text,
                "metadata": metadata
            })
        
        return documents
    
    
    def index_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user data and create slide embeddings in Supabase pgvector
        
        Hybrid Approach:
        - Slides: Indexed with embeddings for semantic search
        - Projects/Todos: Sent as direct context (no indexing needed)
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Dictionary with indexing results
        """
        try:
            print(f"📊 Starting indexing for user: {user_id}")
            
            # Fetch user data from Supabase
            user_data = self.fetch_user_data(user_id)
            
            # Prepare slide documents with user_id in metadata
            documents = self.prepare_documents_for_embedding(user_data, user_id)
            
            if not documents:
                return {
                    "success": True,
                    "message": "No slides to index",
                    "indexed_count": 0,
                    "breakdown": {
                        "slides": 0
                    }
                }
            
            print(f"📄 Prepared {len(documents)} slides for embedding")
            
            # Process each slide: create embedding and upsert to Supabase
            indexed_count = 0
            skipped_count = 0
            
            for doc in documents:
                try:
                    # Parse slide ID (format: "slide_uuid")
                    doc_type, doc_id = doc["id"].split("_", 1)
                    
                    # Create embedding for slide description
                    embedding = self.create_embedding(doc["text"])
                    
                    # Skip if embedding failed
                    if not embedding or embedding == [0.0] * 768:
                        print(f"⚠️  Skipping {doc['id']}: embedding creation failed")
                        skipped_count += 1
                        continue
                    
                    # Upsert to Supabase using RPC function
                    self.supabase.rpc('upsert_embedding', {
                        'p_user_id': user_id,
                        'p_document_type': doc_type,
                        'p_document_id': doc_id,
                        'p_text_content': doc["text"],
                        'p_embedding': embedding,
                        'p_metadata': doc["metadata"]
                    }).execute()
                    
                    indexed_count += 1
                    
                except Exception as e:
                    print(f"❌ Error indexing {doc.get('id', 'unknown')}: {e}")
                    skipped_count += 1
                    continue
            
            print(f"✅ Indexed {indexed_count}/{len(documents)} slides (skipped {skipped_count})")
            
            return {
                "success": True,
                "message": f"Indexed {indexed_count} slides",
                "indexed_count": indexed_count,
                "breakdown": {
                    "slides": indexed_count,
                    "skipped": skipped_count
                }
            }
            
        except Exception as e:
            print(f"❌ Error indexing user data: {e}")
            return {
                "success": False,
                "message": f"Error indexing data: {str(e)}",
                "indexed_count": 0
            }
    
    
    def query_context(
        self, 
        query: str, 
        user_id: str, 
        n_results: int = 5,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Query Supabase pgvector for relevant slide context based on user query
        
        Hybrid Approach:
        - Searches ONLY slides using semantic embeddings
        - Projects/Todos fetched separately via fetch_direct_context()
        
        Args:
            query: User's question/query
            user_id: UUID of the user (enforces user isolation)
            n_results: Number of relevant slides to retrieve
            project_id: Optional project UUID to filter slides by project
            
        Returns:
            Dictionary with relevant slide documents and metadata
        """
        try:
            # Create embedding for query
            query_embedding = self.create_embedding(query)
            
            if not query_embedding or query_embedding == [0.0] * 768:
                return {
                    "success": False,
                    "message": "Failed to create query embedding",
                    "documents": [],
                    "context": ""
                }
            
            # Query Supabase pgvector using RPC function
            response = self.supabase.rpc('search_embeddings', {
                'query_embedding': query_embedding,
                'query_user_id': user_id,
                'match_count': n_results,
                'filter_project_id': project_id if project_id else None
            }).execute()
            
            # Build context string from results
            context_parts = []
            retrieved_docs = []
            
            if response.data:
                for i, result in enumerate(response.data):
                    doc_type = result.get('document_type', 'unknown')
                    text_content = result.get('text_content', '')
                    metadata = result.get('metadata', {})
                    similarity = result.get('similarity', 0)
                    
                    context_parts.append(f"--- Slide {i+1} ({metadata.get('name', 'Unknown')}) ---\n{text_content}\n")
                    retrieved_docs.append({
                        "text": text_content,
                        "metadata": metadata,
                        "relevance_score": similarity
                    })
            
            context = "\n".join(context_parts)
            
            print(f"🔍 Query: '{query[:50]}...' → Found {len(retrieved_docs)} relevant slides")
            
            return {
                "success": True,
                "documents": retrieved_docs,
                "context": context,
                "query": query,
                "n_results": len(retrieved_docs)
            }
            
        except Exception as e:
            print(f"❌ Error querying context: {e}")
            return {
                "success": False,
                "message": f"Error querying: {str(e)}",
                "documents": [],
                "context": ""
            }
    
    
    def fetch_slide_screenshot(self, screenshot_url: str) -> str:
        """
        Fetch slide screenshot from Supabase Storage
        
        Args:
            screenshot_url: Public URL of the screenshot
        
        Returns:
            Base64 encoded image data (without data URI prefix)
        """
        try:
            import requests
            import base64
            
            response = requests.get(screenshot_url, timeout=10)
            if response.status_code == 200:
                # Return base64 encoded image data (without data URI prefix)
                return base64.b64encode(response.content).decode('utf-8')
            else:
                print(f"Failed to fetch screenshot: HTTP {response.status_code}")
                return ""
        except Exception as e:
            print(f"Error fetching screenshot: {e}")
            return ""


# Create singleton instance
rag_service = RAGService()
