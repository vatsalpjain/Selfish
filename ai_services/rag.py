"""
RAG (Retrieval Augmented Generation) Module
Handles fetching user data, creating embeddings, and building context for AI chatbot
"""
import os
from pathlib import Path
from typing import List, Dict, Any
from supabase import create_client, Client
from google import genai
import chromadb
from chromadb.config import Settings
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
    - Stores embeddings in ChromaDB
    - Retrieves relevant context for queries
    """
    
    def __init__(self):
        """Initialize RAG service with Supabase and ChromaDB clients"""
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
        
        # Initialize ChromaDB (in-memory for now, will persist later)
        self.chroma_client = chromadb.Client(Settings(
            anonymized_telemetry=False,
            allow_reset=True
        ))
        
        # Create collection for user data embeddings
        try:
            self.collection = self.chroma_client.get_or_create_collection(
                name="selfish_user_data",
                metadata={"description": "User projects, slides, todos, and calendar data"}
            )
        except Exception as e:
            print(f"Error creating ChromaDB collection: {e}")
            # Reset and try again
            self.chroma_client.reset()
            self.collection = self.chroma_client.create_collection(
                name="selfish_user_data",
                metadata={"description": "User projects, slides, todos, and calendar data"}
            )
    
    
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
            # Use google-generativeai for embeddings (google-genai doesn't support embedding API yet)
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=os.getenv("GEMINI_API_KEY"))
            
            result = genai_legacy.embed_content(
                model="models/text-embedding-004",
                content=text
            )
            return result['embedding']
        except Exception as e:
            print(f"Error creating embedding: {e}")
            # Return a default zero vector if embedding fails
            return [0.0] * 768  # text-embedding-004 dimension
    
    
    def prepare_documents_for_embedding(self, user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Convert user data into documents ready for embedding
        
        Args:
            user_data: Dictionary from fetch_user_data()
            
        Returns:
            List of documents with text, metadata, and IDs
        """
        documents = []
        
        # Process projects
        for project in user_data.get("projects", []):
            doc_text = f"Project: {project.get('title', 'Untitled')}\n"
            doc_text += f"Created: {project.get('created_at', 'Unknown')}\n"
            doc_text += f"Project ID: {project.get('id', 'Unknown')}"
            
            # Filter out None values from metadata
            metadata = {
                "type": "project",
                "project_id": str(project.get("id", "")),
                "title": str(project.get("title", "Untitled")),
            }
            if project.get("created_at"):
                metadata["created_at"] = str(project.get("created_at"))
            
            documents.append({
                "id": f"project_{project.get('id')}",
                "text": doc_text,
                "metadata": metadata
            })
        
        # Process slides
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
                
            # Minimal metadata
            metadata = {
                "type": "slide",
                "slide_id": str(slide.get("id", "")),
                "name": str(slide.get("name", "Untitled Slide")),
            }
            if slide.get("screenshot_url"):
                metadata["screenshot_url"] = str(slide.get("screenshot_url"))
            metadata["has_description"] = bool(ai_description)
                
            documents.append({
                "id": f"slide_{slide.get('id')}",
                "text": doc_text,
                "metadata": metadata
            })
        # Process todos
        for todo in user_data.get("todos", []):
            doc_text = f"Todo: {todo.get('title', 'Untitled Todo')}\n"
            if todo.get('description'):
                doc_text += f"Description: {todo.get('description')}\n"
            doc_text += f"Priority: {todo.get('priority', 'medium')}\n"
            doc_text += f"Status: {todo.get('status', 'pending')}\n"
            if todo.get('due_date'):
                doc_text += f"Due Date: {todo.get('due_date')}\n"
            doc_text += f"Created: {todo.get('created_at', 'Unknown')}"
            
            # Filter out None values from metadata
            metadata = {
                "type": "todo",
                "todo_id": str(todo.get("id", "")),
                "title": str(todo.get("title", "Untitled Todo")),
                "priority": str(todo.get("priority", "medium")),
                "status": str(todo.get("status", "pending")),
            }
            if todo.get("due_date"):
                metadata["due_date"] = str(todo.get("due_date"))
            if todo.get("created_at"):
                metadata["created_at"] = str(todo.get("created_at"))
            
            documents.append({
                "id": f"todo_{todo.get('id')}",
                "text": doc_text,
                "metadata": metadata
            })
        
        return documents
    
    
    def index_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user data and create embeddings in ChromaDB
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Dictionary with indexing results
        """
        try:
            # Fetch user data
            user_data = self.fetch_user_data(user_id)
            
            # Prepare documents
            documents = self.prepare_documents_for_embedding(user_data)
            
            if not documents:
                return {
                    "success": True,
                    "message": "No data to index",
                    "indexed_count": 0
                }
            
            # Create embeddings and add to ChromaDB
            texts = [doc["text"] for doc in documents]
            ids = [doc["id"] for doc in documents]
            metadatas = [doc["metadata"] for doc in documents]
            
            # Create embeddings for all documents
            embeddings = []
            for text in texts:
                embedding = self.create_embedding(text)
                if embedding:
                    embeddings.append(embedding)
                else:
                    # Use zero vector if embedding fails
                    embeddings.append([0.0] * 768)  # text-embedding-004 dimension
            
            # Add to ChromaDB
            self.collection.add(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas
            )
            
            return {
                "success": True,
                "message": f"Indexed {len(documents)} documents",
                "indexed_count": len(documents),
                "breakdown": {
                    "projects": len(user_data.get("projects", [])),
                    "slides": len(user_data.get("slides", [])),
                    "todos": len(user_data.get("todos", []))
                }
            }
            
        except Exception as e:
            print(f"Error indexing user data: {e}")
            return {
                "success": False,
                "message": f"Error indexing data: {str(e)}",
                "indexed_count": 0
            }
    
    
    def query_context(self, query: str, user_id: str, n_results: int = 5) -> Dict[str, Any]:
        """
        Query ChromaDB for relevant context based on user query
        
        Args:
            query: User's question/query
            user_id: UUID of the user (for filtering)
            n_results: Number of relevant documents to retrieve
            
        Returns:
            Dictionary with relevant documents and metadata
        """
        try:
            # Create embedding for query
            query_embedding = self.create_embedding(query)
            
            if not query_embedding:
                return {
                    "success": False,
                    "message": "Failed to create query embedding",
                    "documents": [],
                    "context": ""
                }
            
            # Query ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )
            
            # Build context string from results
            context_parts = []
            retrieved_docs = []
            
            if results and results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                    distance = results["distances"][0][i] if results["distances"] else 0
                    
                    context_parts.append(f"--- Document {i+1} ({metadata.get('type', 'unknown')}) ---\n{doc}\n")
                    retrieved_docs.append({
                        "text": doc,
                        "metadata": metadata,
                        "relevance_score": 1 - distance  # Convert distance to similarity
                    })
            
            context = "\n".join(context_parts)
            
            return {
                "success": True,
                "documents": retrieved_docs,
                "context": context,
                "query": query,
                "n_results": len(retrieved_docs)
            }
            
        except Exception as e:
            print(f"Error querying context: {e}")
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
