/**
 * AI Chat Helper
 * Handles streaming chat responses from the backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Stream chat with AI assistant
 * @param query - User's question
 * @param history - Previous conversation
 * @param onChunk - Callback for each chunk of text
 * @param onEnd - Callback when stream ends
 * @param onError - Callback for errors
 */
export const streamChat = async (
  query: string,
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onEnd: () => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        history: history.map(msg => ({ role: msg.role, content: msg.content }))
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onEnd();
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix
          
          // Debug: log raw data
          console.log('[SSE] Received data:', data);
          
          try {
            const parsed = JSON.parse(data);
            
            console.log('[SSE] Parsed:', parsed);
            
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            } else if (parsed.done) {
              onEnd();
              return;
            } else if (parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch (e) {
            // Skip malformed JSON
            console.warn('Failed to parse SSE data:', data, e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream chat error:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Stream canvas analysis
 * @param imageData - Base64 encoded image
 * @param query - Question about the canvas
 * @param projectId - Optional project ID
 * @param onChunk - Callback for each chunk
 * @param onEnd - Callback when done
 * @param onError - Callback for errors
 */
export const streamCanvasAnalysis = async (
  imageData: string,
  query: string,
  projectId: string | undefined,
  onChunk: (text: string) => void,
  onEnd: () => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/ai/analyze-canvas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image_data: imageData,
        query,
        project_id: projectId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onEnd();
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            } else if (parsed.done) {
              onEnd();
              return;
            } else if (parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream canvas analysis error:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
};
