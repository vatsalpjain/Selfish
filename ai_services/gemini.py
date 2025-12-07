"""
Gemini LLM Service
Handles chat, streaming responses, and image analysis for Selfish AI chatbot
"""
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
from typing import AsyncGenerator, List, Dict, Optional
import base64
from typing import Tuple

load_dotenv()


class GeminiChatService:
    """
    Gemini Chat Service for Selfish AI
    - Support for RAG context integration
    - Streaming responses for real-time chat
    - Multi-turn conversation history
    - Canvas image analysis using Gemini Vision
    """
    
    def __init__(self):
        """Initialize Gemini client"""
        self.client = self._initialize_client()
        self.model_name = "gemini-2.0-flash"  
        
    def _initialize_client(self) -> genai.Client:
        """Initialize Gemini client with API key"""
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            return client
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
            raise RuntimeError(f"Failed to initialize Gemini: {e}")
      
    async def stream_chat_response(
        self, 
        query: str, 
        context: str,
        history: Optional[List[Dict[str, str]]] = None,
        images: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming chat response with context and optional images
        
        Args:
            query: User's current question
            context: RAG context from user's data
            history: Previous conversation messages [{"role": "user"/"model", "content": "..."}]
            images: Optional list of base64 encoded images (without data URI prefix)
            
        Yields:
            Chunks of generated text
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        
        # Build conversation with system prompt and context
        system_message = f"""You are Selfish AI, a helpful assistant for the Selfish project management app.

CONTEXT FROM USER'S DATA:
{context}

Instructions:
- Use the context above to answer questions about the user's projects, todos, and work
- Be concise and actionable
- If you don't find relevant information in the context, say so
- Help users understand their work patterns and suggest improvements"""

        # Build message history
        messages = []
        
        # Add system context as first user message (Gemini doesn't have system role)
        messages.append(types.Content(
            role="user",
            parts=[types.Part(text=system_message)]
        ))
        messages.append(types.Content(
            role="model",
            parts=[types.Part(text="I understand. I'll help you with your Selfish projects using the provided context.")]
        ))
        
        # Add conversation history
        if history:
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                messages.append(types.Content(
                    role=role,
                    parts=[types.Part(text=msg["content"])]
                ))
        
        # Add current query with optional images
        query_parts = []
        
        # Add images first if provided
        if images:
            for img_data in images:
                try:
                    # Decode base64 to bytes
                    image_bytes = base64.b64decode(img_data)
                    # Use inline_data with Blob format
                    query_parts.append(types.Part(
                        inline_data=types.Blob(
                            mime_type="image/png",
                            data=image_bytes
                        )
                    ))
                except Exception as e:
                    print(f"Error decoding image: {e}")
        
        # Add text query
        if images:
            enhanced_query = f"{query}\n\n(Note: I've included screenshots from your canvas slides above for visual context.)"
            query_parts.append(types.Part(text=enhanced_query))
        else:
            query_parts.append(types.Part(text=query))
        
        messages.append(types.Content(
            role="user",
            parts=query_parts
        ))
        
        try:
            # Generate streaming response
            response = self.client.models.generate_content_stream(
                model=self.model_name,
                contents=messages,
                config=types.GenerateContentConfig(
                    temperature=0.4,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                )
            )
            
            # Stream chunks
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"Error in streaming response: {e}")
            yield f"I encountered an error: {str(e)}"
    

    async def optimize_query(
        self,
        query: str
    ) -> Tuple[str, bool, bool]:
        """
        Optimize user query for RAG and determine if visual context is needed.
        
        Returns:
            Tuple of (optimized_query, needs_image)
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        
        try:
            prompt = f"""You are a query analyzer for a project management AI assistant.

TASK 1: Determine if user data context is needed
Answer YES if the query is about:
- Projects, todos, tasks, slides, canvas, deadlines
- User's specific work or data
- Summaries, lists, or info about their content

Answer NO if the query is:
- A greeting (hi, hello, how are you)
- General knowledge question
- About the AI itself
- Chitchat or small talk

TASK 2: Optimize the query for semantic search (only if context needed)
- Extract key concepts and entities
- Remove filler words
- Keep project-related terms

TASK 3: Decide if visual context (canvas screenshots) would help
Answer YES only if query specifically asks about visual content.

OUTPUT FORMAT (strictly follow this):
NEEDS_CONTEXT: YES or NO
OPTIMIZED: <optimized search query or "none" if no context needed>
NEEDS_IMAGE: YES or NO

Examples:
Query: "How are you?"
NEEDS_CONTEXT: NO
OPTIMIZED: none
NEEDS_IMAGE: NO

Query: "What are my pending tasks?"
NEEDS_CONTEXT: YES
OPTIMIZED: todos pending tasks status
NEEDS_IMAGE: NO

Query: "Show me my brainstorm slides"
NEEDS_CONTEXT: YES
OPTIMIZED: brainstorm slides canvas
NEEDS_IMAGE: YES

User Query: {query}
"""
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=100,
                )
            )
            
            result = response.text.strip()
            
            # Parse response
            optimized_query = query  # Fallback
            needs_image = False
            needs_context = True 
            
            for line in result.split('\n'):
                if line.startswith('NEEDS_CONTEXT:'):
                    needs_context = 'YES' in line.upper()
                elif line.startswith('OPTIMIZED:'):
                    optimized_query = line.replace('OPTIMIZED:', '').strip()
                    if optimized_query.lower() == 'none':
                        optimized_query = query
                elif line.startswith('NEEDS_IMAGE:'):
                    needs_image = 'YES' in line.upper()
            print(f"🔄 Query: '{query}' → '{optimized_query}' | 📄 Context: {needs_context} | 🖼️ Image: {needs_image}")
            return optimized_query, needs_image, needs_context
            
        except Exception as e:
            print(f"Error optimizing query: {e}")
            return query, False, True
    
    async def generate_slide_description(
        self,
        image_data: str
    ) -> str:
        """
        Generate a concise description of a canvas screenshot.
        Called once when slide is saved, stored in DB for RAG context.
        
        Args:
            image_data: Base64 encoded PNG image
            
        Returns:
            Text description of the visual content
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
    
        try:
            # Strip data URL prefix if present
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
        
            image_bytes = base64.b64decode(image_data)
        
            prompt = """Analyze this canvas/slide image and provide a concise description.
Focus on:
1. What type of content is this? (flowchart, brainstorm, diagram, notes, wireframe, etc.)
2. What are the main elements or concepts shown?
3. What relationships or connections exist between elements?
4. What is the overall purpose or topic?
Output format:
TYPE: <content type>
SUMMARY: <2-3 sentence description of the visual content and its meaning>
Keep the summary under 100 words. Be specific about what you see."""
            response = self.client.models.generate_content(
                model="gemini-2.0-flash", 
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                        types.Part(text=prompt),
                        types.Part(
                            inline_data=types.Blob(
                                mime_type="image/png",
                                data=image_bytes
                            )
                        )
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=200,
            )
        )
        
            return response.text.strip()
        
        except Exception as e:
            print(f"Error generating description: {e}")
            return ""
    
    async def stream_canvas_analysis(
        self,
        image_data: str,
        query: str,
        context: str
    ) -> AsyncGenerator[str, None]:
        """
        Stream analysis of canvas image with RAG context
        
        Args:
            image_data: Base64 encoded canvas screenshot
            query: User's question about the canvas
            context: RAG context about the project/slides
            
        Yields:
            Chunks of analysis text
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        
        try:
            # Prepare image
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            
            # Build prompt with context
            full_query = f"""CONTEXT ABOUT THIS PROJECT:
{context}

USER QUESTION: {query}

Please analyze the canvas image and answer the question using both the visual content and the context provided."""
            
            # Create multimodal message
            messages = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=full_query),
                        types.Part(data=image_bytes, mime_type="image/png")
                    ]
                )
            ]
            
            # Stream response
            response = self.client.models.generate_content_stream(
                model=self.model_name,
                contents=messages,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1536,
                )
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            print(f"Error in canvas analysis stream: {e}")
            yield f"Error analyzing canvas: {str(e)}"


# Create singleton instance
gemini_service = GeminiChatService()
