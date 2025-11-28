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
        self.model_name = "gemini-2.5-flash"  
        
    def _initialize_client(self) -> genai.Client:
        """Initialize Gemini client with API key"""
        try:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            return client
        except Exception as e:
            print(f"Error initializing Gemini client: {e}")
            raise RuntimeError(f"Failed to initialize Gemini: {e}")
    
    
    def generate_answer(self, query: str, context: str) -> str:
        """
        Generate answer using RAG context (non-streaming)
        
        Args:
            query: User's question
            context: Retrieved context from RAG
            
        Returns:
            Generated answer as string
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        
        # Build prompt with context
        system_prompt = """You are Selfish AI, a helpful assistant for the Selfish project management app.

You have access to the user's projects, canvas slides, todos, and calendar data.
Use the provided context to answer questions accurately and helpfully.

Key capabilities:
- Understand user's current projects and their progress
- Provide insights on todos and deadlines
- Analyze canvas drawings and visual planning
- Help with project organization and planning

Be concise, friendly, and actionable in your responses."""

        prompt = f"""{system_prompt}

CONTEXT FROM USER'S DATA:
{context}

USER QUESTION: {query}

ANSWER:"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_HATE_SPEECH",
                            threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_HARASSMENT",
                            threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold="BLOCK_NONE"
                        ),
                    ]
                )
            )
            return response.text
        except Exception as e:
            print(f"Error generating answer: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    
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
                    temperature=0.5,
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
    
    
    async def analyze_canvas_image(
        self, 
        image_data: str,
        query: Optional[str] = None
    ) -> str:
        """
        Analyze canvas screenshot using Gemini Vision
        
        Args:
            image_data: Base64 encoded image or file path
            query: Optional specific question about the image
            
        Returns:
            Analysis of the canvas/image
        """
        if not self.client:
            raise RuntimeError("Gemini client not initialized")
        
        try:
            # Prepare image
            if image_data.startswith('data:image'):
                # Base64 data URL
                image_data = image_data.split(',')[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(image_data)
            
            # Default query if none provided
            if not query:
                query = """Analyze this canvas drawing from a project management tool. 
Describe what you see:
- What visual elements are present (shapes, text, drawings)?
- What seems to be the purpose or goal?
- Any patterns, workflows, or connections you notice?
- Suggestions for improvement?"""
            
            # Create content with image
            messages = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=query),
                        types.Part(data=image_bytes, mime_type="image/png")
                    ]
                )
            ]
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=messages,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                )
            )
            
            return response.text
            
        except Exception as e:
            print(f"Error analyzing image: {e}")
            return f"I couldn't analyze the image: {str(e)}"
    
    
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
