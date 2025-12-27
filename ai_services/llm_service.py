"""
LLM Service
Handles chat, streaming responses, and image analysis for Selfish AI chatbot
Now using Groq API (OpenAI-compatible format)
"""
from groq import AsyncGroq
import os
from dotenv import load_dotenv
from typing import AsyncGenerator, List, Dict, Optional
from typing import Tuple

load_dotenv()


class LLMChatService:
    """
    LLM Chat Service for Selfish AI (using Groq)
    - Support for RAG context integration
    - Streaming responses for real-time chat
    - Multi-turn conversation history
    - Vision support via Llama-4 Scout model for image analysis
    """
    
    def __init__(self):
        """Initialize Groq client"""
        self.client = self._initialize_client()
        self.model_name = "llama-3.3-70b-versatile"
        self.vision_model = "meta-llama/llama-4-scout-17b-16e-instruct"
        
    def _initialize_client(self) -> AsyncGroq:
        """Initialize Groq client with API key"""
        try:
            client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
            return client
        except Exception as e:
            print(f"Error initializing Groq client: {e}")
            raise RuntimeError(f"Failed to initialize Groq: {e}")
      
    async def stream_chat_response(
        self, 
        query: str, 
        context: str,
        history: Optional[List[Dict[str, str]]] = None,
        images: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming chat response with context
        
        Args:
            query: User's current question
            context: RAG context from user's data
            history: Previous conversation messages [{"role": "user"/"model", "content": "..."}]
            images: Optional list of base64 encoded images (uses vision model when provided)
            
        Yields:
            Chunks of generated text
        """
        if not self.client:
            raise RuntimeError("Groq client not initialized")
        
        # Build system prompt with context
        system_message = f"""You are Selfish AI, a helpful assistant for the Selfish project management app.

CONTEXT FROM USER'S DATA:
{context}

Instructions:
- Use the context above to answer questions about the user's projects, todos, and work
- Be concise and actionable
- If you find project names but no details, acknowledge what you know (like project names, IDs, dates) and suggest the user can check the project directly in the app for more details
- Don't say "no information" if you have partial data - share what you do have
- For project-specific questions, if only basic info exists (name, ID), mention that and offer to help with what's available
- Help users understand their work patterns and suggest improvements
- Be conversational and friendly"""
        # Build messages list (OpenAI format)
        messages = [
            {"role": "system", "content": system_message}
        ]
        
        # Add conversation history
        if history:
            for msg in history:
                # Map "model" to "assistant" for OpenAI format
                role = "user" if msg["role"] == "user" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg["content"]
                })
        if images:
            user_content = [
                {"type": "text", "text": query}
            ]
            for img_data in images[:5]:  # Max 5 images
                user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{img_data}"
                }
            })
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": query})
        
        model_to_use = self.vision_model if images else self.model_name
        try:
            # Generate streaming response
            stream = await self.client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=0.4,
                top_p=0.95,
                max_completion_tokens=2048,
                stream=True,
            )
            
            # Stream chunks
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"Error in streaming response: {e}")
            yield f"I encountered an error: {str(e)}"
    

    async def optimize_query(
        self,
        query: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, bool, bool]:
        """
        Optimize user query for RAG and determine if visual context is needed.
        Uses conversation history to understand contextual references.
        
        Args:
            query: Current user query
            history: Previous conversation messages for context
        
        Returns:
            Tuple of (optimized_query, needs_image, needs_context)
        """
        if not self.client:
            raise RuntimeError("Groq client not initialized")
        
        try:
            # Build conversation context from history (last 3 messages for efficiency)
            history_context = ""
            if history and len(history) > 0:
                recent_history = history[-3:] if len(history) > 3 else history
                history_context = "\n\nCONVERSATION HISTORY (for context):\n"
                for msg in recent_history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    history_context += f"{role.upper()}: {content}\n"
            
            prompt = f"""You are a query analyzer for a project management AI assistant.
{history_context}
TASK 1: Determine if user data context is needed
Answer YES if the query is about:
- Projects, todos, tasks, slides, canvas, deadlines
- User's specific work or data
- User is talking about his work , or just checking if context is working or not , or just anything about user 
- Summaries, lists, or info about their content

Answer NO if the query is:
- A greeting (hi, hello, how are you)
- General knowledge question
- About the AI itself
- Chitchat or small talk

TASK 2: Optimize the query for semantic search (only if context needed)
- Extract key concepts and entities from CURRENT query
- Use conversation history to resolve references like "that project", "the second one", "it"
- If history mentions specific projects/slides, include them in optimized query
- Remove filler words but keep project-related context
- Example: If history discussed "Website Redesign" and query is "What about the brainstorm one?", 
  optimize to "brainstorm slides website redesign"

TASK 3: Decide if visual context (canvas screenshots) would help
Answer YES only if query specifically asks about visual content.
Try to Say Yes more often for visual context if unsure.

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

With History:
HISTORY: USER: Show me website project slides
QUERY: What about the brainstorm one?
NEEDS_CONTEXT: YES
OPTIMIZED: brainstorm slides website project
NEEDS_IMAGE: YES

Current Query: {query}
"""
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_completion_tokens=200,
            )
            
            result = response.choices[0].message.content.strip()
            
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
    
    async def generate_slide_description(self, image_data: str) -> str:
        if not self.client:
            raise RuntimeError("Groq client not initialized")
    
        try:
        # Strip data URL prefix if present
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
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

            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}}
                    ]
                }],
                temperature=0.3,
                max_completion_tokens=200,
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"Error generating description: {e}")
            return ""
    async def stream_canvas_analysis(
    self, image_data: str, query: str, context: str
) -> AsyncGenerator[str, None]:
        if not self.client:
            raise RuntimeError("Groq client not initialized")
        
        try:
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            full_query = f"""CONTEXT ABOUT THIS PROJECT:
    {context}

    USER QUESTION: {query}

    Please analyze the canvas image and answer the question using both the visual content and the context provided."""

            stream = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": full_query},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_data}"}}
                    ]
                }],
                temperature=0.7,
                max_completion_tokens=1536,
                stream=True,
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"Error in canvas analysis stream: {e}")
            yield f"Error analyzing canvas: {str(e)}"


# Create singleton instance
llm_service = LLMChatService()
