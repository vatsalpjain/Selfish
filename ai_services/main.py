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
        # Get context from RAG
        context_result = rag_service.query_context(
            query=request.query,
            user_id=request.user_id,
            n_results=5
        )
        
        context = context_result.get("context", "")
        if not context:
            context = "No relevant data found in user's projects."
        
        # Check if we have slide results
        has_slide_results = any(
            doc.get("metadata", {}).get("type") == "slide" 
            for doc in context_result.get("documents", [])
        )
        
        # Visual keywords
        visual_keywords = ["about", "summary", "overview", "visual", "chart", "graph", "slide", "presentation", "content" , "data" , "report" , "statistics"]
        has_visual_keyword = any(kw in request.query.lower() for kw in visual_keywords)
        
        # Trigger visual if keywords OR if we found slides
        needs_visual = has_visual_keyword or has_slide_results
        
        print(f"📊 Query: '{request.query}'")
        print(f"🔍 Needs visual: {needs_visual} (keywords={has_visual_keyword}, slides={has_slide_results})")
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
                    print(f"⚠️  No screenshots")
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Stream response
        if request.stream:
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
        else:
            answer = gemini_service.generate_answer(query=request.query, context=context)
            return ChatResponse(success=True, answer=answer, context_used=bool(context))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


# CANVAS ANALYSIS ENDPOINT
@app.post("/analyze-canvas")
async def analyze_canvas(request: CanvasAnalysisRequest):
    try:
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