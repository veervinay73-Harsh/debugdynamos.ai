import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// POST /api/chat/stream - Stream Groq AI response
app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;
  
  console.log('[Backend] Request received');

  if (!process.env.GROQ_API_KEY) {
    console.error('[Backend ERROR] Missing GROQ_API_KEY configuration.');
    return res.status(500).json({ error: 'Server configuration error: Missing Groq API key.' });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const MODEL_NAME = 'llama-3.3-70b-versatile';
  console.log(`[Backend] Using model: ${MODEL_NAME}`);

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Format history to be compatible with Groq chat completions format
    const formattedHistory = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    }));

    const maxRetries = 3;
    const backoffTimes = [2000, 4000, 8000];
    let result = null;
    let attempt = 0;
    let lastError = null;

    // Retry Loop logic
    while (attempt <= maxRetries) {
      try {
        console.log(`[Backend] Groq request started (Attempt ${attempt + 1}/${maxRetries + 1})`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Groq API request timed out after 30 seconds')), 30000);
        });

        // Use Groq SDK to create chat completions stream
        const chatStream = await groq.chat.completions.create({
          messages: formattedHistory,
          model: MODEL_NAME,
          stream: true,
        });

        result = await Promise.race([
          Promise.resolve(chatStream),
          timeoutPromise
        ]);
        
        break; // Request succeeded
      } catch (err) {
        lastError = err;
        const errorMessage = err.message || '';
        const is503 = errorMessage.includes('503');
        const isOverloaded = errorMessage.includes('overloaded') || errorMessage.includes('temporarily unavailable');
        
        if ((is503 || isOverloaded) && attempt < maxRetries) {
          const delay = backoffTimes[attempt];
          console.warn(`[Backend WARNING] Groq API overloaded (503). Retrying in ${delay}ms... (Retry ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
        } else {
          break; // Exit retry loop on non-retriable errors (like 401s or 429s)
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Unknown error during Groq request');
    }

    let accumulatedContent = '';
    let isFirstChunk = true;

    // Groq stream consumption (Async Iterable standard)
    for await (const chunk of result) {
      if (isFirstChunk) {
        console.log('[Backend] First chunk received successfully');
        isFirstChunk = false;
      }
      
      // Extract delta from Groq chunk structure
      const chunkText = chunk.choices[0]?.delta?.content || '';
      
      if (chunkText) {
        accumulatedContent += chunkText;
        
        // Write SSE data packet
        res.write(`data: ${JSON.stringify({ 
          content: accumulatedContent,
          done: false 
        })}\n\n`);
        
        if (typeof res.flush === 'function') {
          res.flush();
        }
      }
    }

    console.log('[Backend] Stream completed successfully');
    
    // Send final done signal
    res.write(`data: ${JSON.stringify({ 
      content: accumulatedContent,
      done: true 
    })}\n\n`);
    res.end();
    
  } catch (aiErr) {
    console.error('[Backend ERROR] Stream failed:', aiErr.message || aiErr);
    
    let clientErrorMessage = 'Failed to generate AI response.';
    const errorMsg = aiErr.message || '';
    
    // Preserved error handling, but adapted to Groq's error messages
    if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('temporarily unavailable')) {
      clientErrorMessage = 'AI service is temporarily busy. Please try again in a moment.';
    } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      clientErrorMessage = 'API quota exceeded.';
    } else if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('key is invalid') || errorMsg.includes('invalid api key') || errorMsg.includes('401')) {
      clientErrorMessage = 'Server configuration error: Invalid API key.';
    } else if (errorMsg.includes('timeout')) {
      clientErrorMessage = 'Network timeout communicating with the AI service.';
    }

    res.write(`data: ${JSON.stringify({ error: clientErrorMessage, done: true })}\n\n`);
    res.end();
  }
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`[Backend] chatwithdd.AI server successfully running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Backend ERROR] Port ${port} is already in use.`);
      console.error(`[Hint] You can find the PID using: netstat -ano | findstr :${port}`);
      console.log(`[Backend] Attempting to start on port ${port + 1}...`);
      startServer(port + 1);
    } else if (err.code === 'EACCES') {
      console.error(`[Backend ERROR] Port ${port} requires elevated privileges.`);
      console.log(`[Backend] Attempting to start on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(`[Backend FATAL] Server error:`, err);
      process.exit(1);
    }
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[Backend] Gracefully shutting down server...');
    server.close(() => {
      console.log('[Backend] Server closed cleanly.');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('[Backend ERROR] Forced shutdown due to lingering connections.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('[Backend FATAL] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer(Number(PORT));

app.get("/", (req, res) => {
  res.send("Backend is running!");
});
