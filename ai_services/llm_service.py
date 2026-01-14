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
    - Vision support via Llama-4 Maverick model for image analysis
    """
    
    def __init__(self):
        """Initialize Groq client"""
        self.client = self._initialize_client()
        self.model_name = "openai/gpt-oss-120b"
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
        system_message = f"""You are Selfish AI, an enthusiastic assistant helping users manage their creative projects.

CONTEXT FROM USER'S DATA:
{context}

Your approach:
- Use the context above to provide insightful answers about their projects, todos, and work
- Be direct and confident - share what you know without apologizing for limitations
- When you see project data (names, IDs, creation dates), lead with that information enthusiastically
- For visual content, describe what you observe and ask engaging follow-up questions
- If context is limited, turn it into curiosity: "I see you started Selfish on Nov 28th - what are you building?"
- Keep responses concise (2-4 sentences max) unless user asks for details
- Use markdown formatting: **bold** for emphasis, bullet points for lists, code blocks when relevant
- Show genuine interest in their projects and progress"""
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
    ) -> Tuple[str, bool, bool, List[str]]:
        """
        Optimize user query for RAG and determine if visual context is needed.
        Uses conversation history to understand contextual references.
        
        Args:
            query: Current user query
            history: Previous conversation messages for context
        
        Returns:
            Tuple of (optimized_query, needs_image, needs_context, project_names)
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
- Chitchat or small talk

TASK 2: Optimize the query for semantic search (only if context needed)
- Extract key concepts and entities from CURRENT query
- Use conversation history to resolve references like "that project", "the second one", "it"
- If history mentions specific projects/slides, include them in optimized query
- Remove filler words but keep project-related context
- Example: If history discussed "Website Redesign" and query is "What about the brainstorm one?", 
  optimize to "brainstorm slides website redesign"

TASK 3: Decide if visual context (canvas screenshots) would help
- **DEFAULT TO YES** if the query is about ANY project, work, or user data
- Slides/canvas are the PRIMARY source of project information
- Say YES for: project questions, "what did I do", "explain my work", "tell me about [project]"
- Only say NO for: greetings, general knowledge, todo/task questions (text-only data)

TASK 4: Identify mentioned project names
- If the user mentions specific project name(s), list them
- If user says "that project", "it", "the first one", resolve from conversation history
- If user asks about "all projects" or wants to compare projects, output: ALL
- If no specific project is mentioned, output: NONE

OUTPUT FORMAT (strictly follow this):
NEEDS_CONTEXT: YES or NO
OPTIMIZED: <optimized search query or "none" if no context needed>
NEEDS_IMAGE: YES or NO
PROJECT_NAMES: <comma-separated project names, or ALL, or NONE>

Examples:
Query: "How are you?"
NEEDS_CONTEXT: NO
OPTIMIZED: none
NEEDS_IMAGE: NO
PROJECT_NAMES: NONE

Query: "What are my pending tasks?"
NEEDS_CONTEXT: YES
OPTIMIZED: todos pending tasks status
NEEDS_IMAGE: NO
PROJECT_NAMES: NONE

Query: "Tell me about AutoRAG project"
NEEDS_CONTEXT: YES
OPTIMIZED: autorag project content details
NEEDS_IMAGE: YES
PROJECT_NAMES: AutoRAG

Query: "What did I do in my website project?"
NEEDS_CONTEXT: YES
OPTIMIZED: website project work progress
NEEDS_IMAGE: YES
PROJECT_NAMES: website

Query: "Compare AutoRAG and News App projects"
NEEDS_CONTEXT: YES
OPTIMIZED: autorag news app projects comparison
NEEDS_IMAGE: YES
PROJECT_NAMES: AutoRAG, News App

With History:
HISTORY: USER: Show me AutoRAG project slides
QUERY: What about that project?
NEEDS_CONTEXT: YES
OPTIMIZED: autorag project slides
NEEDS_IMAGE: YES
PROJECT_NAMES: AutoRAG

Current Query: {query}
"""
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_completion_tokens=300,
            )
            
            result = response.choices[0].message.content.strip()
            
            # Parse response
            optimized_query = query  # Fallback
            needs_image = False
            needs_context = True
            project_names = []
            
            for line in result.split('\n'):
                if line.startswith('NEEDS_CONTEXT:'):
                    needs_context = 'YES' in line.upper()
                elif line.startswith('OPTIMIZED:'):
                    optimized_query = line.replace('OPTIMIZED:', '').strip()
                    if optimized_query.lower() == 'none':
                        optimized_query = query
                elif line.startswith('NEEDS_IMAGE:'):
                    needs_image = 'YES' in line.upper()
                elif line.startswith('PROJECT_NAMES:'):
                    names_str = line.replace('PROJECT_NAMES:', '').strip()
                    if names_str.upper() == 'ALL':
                        project_names = ['ALL']
                    elif names_str.upper() != 'NONE' and names_str:
                        project_names = [n.strip() for n in names_str.split(',')]
            
            print(f"🔄 Query: '{query}' → '{optimized_query}' | 📄 Context: {needs_context} | 🖼️ Image: {needs_image} | 📁 Projects: {project_names}")
            return optimized_query, needs_image, needs_context, project_names
            
        except Exception as e:
            print(f"Error optimizing query: {e}")
            return query, False, True, []
    
    async def generate_slide_description(self, image_data: str) -> str:
        if not self.client:
            raise RuntimeError("Groq client not initialized")
    
        try:
        # Strip data URL prefix if present
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            prompt = """Analyze this canvas/slide image for a personal productivity app. Your description will be used for semantic search, so extract ALL searchable information.

EXTRACT AND INCLUDE:
1. TYPE: What kind of content? (flowchart, brainstorm, diagram, notes, wireframe, todo-list, mind-map, kanban, timeline, sketch, etc.)

2. TEXT CONTENT: List ALL visible text, labels, titles, bullet points, and written content you can read. Quote important phrases exactly.

3. TOPICS & KEYWORDS: What subjects, projects, or themes are discussed? (e.g., "React setup", "marketing campaign", "user authentication", "budget planning")

4. STRUCTURE: How is the content organized? (numbered list, hierarchical, connected nodes, timeline, grid, etc.)

5. KEY DETAILS: Any specific items like:
   - Names of projects, files, or technologies mentioned
   - Dates, deadlines, or time references
   - Problems/solutions outlined
   - Action items or next steps
   - Any numbers, prices, or metrics

OUTPUT FORMAT:
TYPE: <content type>
CONTENT: <Detailed description including quoted text, topics, structure, and key details. Be thorough - this powers semantic search.>

Be specific and exhaustive about text content. Quote exact text when visible."""

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
                max_completion_tokens=500,
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
