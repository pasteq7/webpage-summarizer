const { OpenAI } = require('openai');
const cors = require('cors');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory rate limiting (simple implementation)
const rateLimiter = {
  requests: {},
  
  // Check if a request from a specific IP should be allowed
  isAllowed: function(ip) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 5; // Max requests per minute
    
    // Initialize or clean up old entries
    if (!this.requests[ip]) {
      this.requests[ip] = [];
    }
    
    // Remove timestamps outside the current window
    this.requests[ip] = this.requests[ip].filter(
      timestamp => now - timestamp < windowMs
    );
    
    // Check if the IP has exceeded the limit
    if (this.requests[ip].length < maxRequests) {
      this.requests[ip].push(now);
      return true;
    }
    
    return false;
  },
  
  // Clean up old entries periodically
  cleanup: function() {
    const now = Date.now();
    const windowMs = 60 * 1000;
    
    Object.keys(this.requests).forEach(ip => {
      this.requests[ip] = this.requests[ip].filter(
        timestamp => now - timestamp < windowMs
      );
      
      // Remove empty arrays
      if (this.requests[ip].length === 0) {
        delete this.requests[ip];
      }
    });
  }
};

// Clean up rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

// CORS options
const corsOptions = {
  origin: '*', // Be more restrictive in production
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400 // 24 hours
};

// Helper function to handle CORS preflight requests
const handleCors = async (req, res) => {
  await new Promise((resolve, reject) => {
    cors(corsOptions)(req, res, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

// Helper to extract the client IP address
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.socket.remoteAddress;
};

// Helper to validate URL format
const isValidUrl = (url) => {
  if (!url) return true; // URL is optional now
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Helper to validate the request body
const validateRequest = (body) => {
  // Check if body exists
  if (!body) {
    return 'Request body is required';
  }

  // Check URL if provided
  if (body.url && !isValidUrl(body.url)) {
    return 'Invalid URL format';
  }

  // Check content
  if (!body.content || typeof body.content !== 'string') {
    return 'Content is required and must be a string';
  }

  if (body.content.length < 10) {
    return 'Content is too short to summarize';
  }

  if (body.content.length > 50000) {
    return 'Content is too long. Please provide a shorter text';
  }

  // Check title if provided
  if (body.title && typeof body.title !== 'string') {
    return 'Title must be a string';
  }

  // Check custom prompt if provided
  if (body.customPrompt && typeof body.customPrompt !== 'string') {
    return 'Custom prompt must be a string';
  }

  return null;
};

// Main handler function
module.exports = async (req, res) => {
  // Handle CORS
  await handleCors(req, res);
  
  // Return early for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(req);
    
    // Check rate limiting
    if (!rateLimiter.isAllowed(clientIp)) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.' 
      });
    }
    
    // Validate request body
    const error = validateRequest(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    
    // Extract data from request
    const { url, title, content, customPrompt } = req.body;
    
    // Prepare content for summarization
    let textToSummarize = '';
    
    if (title) {
      textToSummarize += `Title: ${title}\n\n`;
    }
    
    if (content) {
      // Limit content length to avoid token limits
      textToSummarize += `Content: ${content.substring(0, 15000)}`;
    }

    // Prepare system message based on whether there's a custom prompt
    const systemMessage = customPrompt ? 
      `You are a helpful AI assistant. Please analyze the provided web content and answer the following specific question or follow the given instruction: "${customPrompt}". Format your response like a classic telegram - extremely brief, direct, formal tone, and urgent. Use as few words as possible. No "STOP" markers. If the question cannot be answered based on the content provided, just say so briefly.` :
      `You are a telegram-style content summarizer. Extract only the absolutely essential information in an extremely brief format.

RULES:
1. Response must be extremely short - max 1-2 sentences or bullet points.
2. Use a direct, urgent tone like a telegram.
3. Use the same language as the analyzed content.
4. NEVER repeat information that's already in the title.

CONTENT TYPE GUIDELINES:
- For articles: Focus only on the key insight beyond the title.
- For news: Extract only the most critical fact or development.
- For social media: Identify if it's a post with comments and summarize the MAIN OPINION TREND in the comments (positive/negative, agreement/disagreement, top concerns, etc).
- For product pages: Focus only on unique selling points.
- For documentation: Extract only the core functionality or purpose.

Prioritize brevity above all else. No explanations or context.`;
    
    // Use OpenAI to generate summary
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: `Please analyze this web content:\n\n${textToSummarize}`
        }
      ],
      max_tokens: 75,
      temperature: 0.2,
    });
    
    // Extract and return the summary
    const summary = completion.choices[0].message.content.trim();
    
    // Return the summary
    return res.status(200).json({ summary });
    
  } catch (error) {
    console.error('Error in summarize API:', error);
    
    // Handle different types of errors
    if (error.response) {
      // OpenAI API error
      return res.status(error.response.status || 500).json({
        error: `OpenAI API error: ${error.response.data.error.message || 'Unknown error'}`
      });
    } else {
      // Generic error
      return res.status(500).json({
        error: `Internal server error: ${error.message}`
      });
    }
  }
};
