"""
FastAPI Server for Selfish AI Chatbot
Handles AI chatbot requests from Node.js backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from dotenv import load_dotenv
import json

# Import our services
from rag import rag_service
from gemini import gemini_service

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Selfish AI Service",
    description="RAG-based AI chatbot for Selfish project management",
    version="1.0.0"
)

# CORS middleware to allow requests from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# REQUEST/RESPONSE MODELS
class ChatRequest(BaseModel):
    user_id: str
    query: str
    history: Optional[List[Dict[str, str]]] = None
    stream: bool = True


class IndexRequest(BaseModel):
    user_id: str


class CanvasAnalysisRequest(BaseModel):
    user_id: str
    image_data: str
    query: Optional[str] = None
    project_id: Optional[str] = None
    generate_description: bool = False  # If True, returns description for DB storage
    
class DescriptionRequest(BaseModel):
    image_data: str  # Base64 encoded image
    
class DescriptionResponse(BaseModel):
    success: bool
    description: str
    content_type: str

class ChatResponse(BaseModel):
    success: bool
    answer: str
    context_used: bool


class IndexResponse(BaseModel):
    success: bool
    message: str
    indexed_count: int
    breakdown: Optional[Dict[str, int]] = None


# HEALTH CHECK
@app.get("/")
async def root():
    return {
        "service": "Selfish AI Service",
        "status": "running",
        "version": "1.0.0",
        "endpoints": ["/chat", "/index-user-data", "/analyze-canvas"]
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "rag_service": "initialized",
        "gemini_service": "initialized"
    }


# RAG INDEXING ENDPOINT
@app.post("/index-user-data", response_model=IndexResponse)
async def index_user_data(request: IndexRequest):
    try:
        result = rag_service.index_user_data(request.user_id)
        return IndexResponse(
            success=result.get("success", False),
            message=result.get("message", "Unknown error"),
            indexed_count=result.get("indexed_count", 0),
            breakdown=result.get("breakdown")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index user data: {str(e)}")


# CHAT ENDPOINT - WITH MULTIMODAL SUPPORT
@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Pass to small LLM to check if image is needed or not and also get optimized query for RAG 
        optimized_query, needs_image, needs_context = await gemini_service.optimize_query(request.query)
        
        # Only query RAG if context is needed
        context = ""
        if needs_context:
            context_result = rag_service.query_context(
                query=optimized_query,
                user_id=request.user_id,
                n_results=5
            )
            context = context_result.get("context", "")
            if not context:
                context = "No relevant data found in user's projects."
            print(f"📄 Found {len(context_result.get('documents', []))} docs")
        else:
            context_result = {"documents": []}
            print("📄 Skipping RAG (no context needed)")
        
        # Trigger visual if we found slides OR if we need image
        needs_visual = needs_image
        
        print(f"📊 Query: '{request.query}'")
        print(f"🔍 Needs image: {needs_image}")
        print(f"📄 Found {len(context_result.get('documents', []))} docs")
        
        # Fetch screenshots
        images = []
        if needs_visual:
            try:
                for doc in context_result.get("documents", [])[:3]:
                    url = doc.get("metadata", {}).get("screenshot_url")
                    name = doc.get("metadata", {}).get("name", "Unknown")
                    print(f"   Doc: {name}, URL: {url}")
                    if url:
                        img_data = rag_service.fetch_slide_screenshot(url)
                        if img_data:
                            images.append(img_data)
                            print(f"   ✅ Fetched ({len(img_data)} chars)")
                if images:
                    print(f"🖼️  Total: {len(images)} screenshot(s)")
                else:
                    print("⚠️  No screenshots")
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Stream response
 
        async def event_generator():
            try:
                async for chunk in gemini_service.stream_chat_response(
                    query=request.query,
                    context=context,
                    history=request.history,
                    images=images if images else None
                    ):
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
        return StreamingResponse(
                event_generator(),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
            )

            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# CANVAS ANALYSIS ENDPOINT - supports both streaming analysis and description generation
@app.post("/analyze-canvas")
async def analyze_canvas(request: CanvasAnalysisRequest):
    try:
        # MODE 1: Generate description for DB storage (non-streaming)
        if request.generate_description:
            result = await gemini_service.generate_slide_description(request.image_data)
            
            # Parse TYPE and SUMMARY from response
            content_type = "unknown"
            description = result
            
            for line in result.split('\n'):
                if line.startswith('TYPE:'):
                    content_type = line.replace('TYPE:', '').strip().lower()
                elif line.startswith('SUMMARY:'):
                    description = line.replace('SUMMARY:', '').strip()
            
            print(f"📝 Generated description: {description[:50]}... | Type: {content_type}")
            return DescriptionResponse(
                success=True,
                description=description,
                content_type=content_type
            )
        
        # MODE 2: Streaming canvas analysis (existing behavior)
        context = ""
        if request.project_id:
            user_data = rag_service.fetch_user_data(request.user_id)
            for project in user_data.get("projects", []):
                if project.get("id") == request.project_id:
                    context += f"Project: {project.get('title')}\n"
            for slide in user_data.get("slides", []):
                if slide.get("project_id") == request.project_id:
                    context += f"Slide: {slide.get('name')}\n"
        
        query = request.query or "Analyze this canvas"
        
        async def event_generator():
            try:
                async for chunk in gemini_service.stream_canvas_analysis(
                    image_data=request.image_data, query=query, context=context
                ):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Canvas analysis failed: {str(e)}")


# CONTEXT QUERY ENDPOINT (for debugging)
@app.post("/query-context")
async def query_context(request: ChatRequest):
    try:
        result = rag_service.query_context(
            query=request.query,
            user_id=request.user_id,
            n_results=5
        )
        return {
            "success": result.get("success", False),
            "query": result.get("query"),
            "n_results": result.get("n_results", 0),
            "documents": result.get("documents", []),
            "context": result.get("context", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Context query failed: {str(e)}")


# RUN SERVER
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )