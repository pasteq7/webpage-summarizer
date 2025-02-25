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

// Configure CORS middleware
const corsMiddleware = cors({
  origin: '*', // Configure appropriately for production
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
});

// Helper function to handle CORS preflight requests
const handleCors = (req, res) => {
  return new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Helper to extract the client IP address
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         '0.0.0.0';
};

// Helper to validate the request body
const validateRequest = (body) => {
  if (!body) {
    return 'Request body is missing';
  }
  
  if (!body.url) {
    return 'URL is required';
  }
  
  if (!body.content && !body.title) {
    return 'At least one of content or title is required';
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
    const { url, title, content, description } = req.body;
    
    // Prepare content for summarization
    let textToSummarize = '';
    
    if (title) {
      textToSummarize += `Title: ${title}\n\n`;
    }
    
    if (description) {
      textToSummarize += `Description: ${description}\n\n`;
    }
    
    if (content) {
      // Limit content length to avoid token limits
      textToSummarize += `Content: ${content.substring(0, 15000)}`;
    }
    
    // Use OpenAI to generate summary
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the standard model
      messages: [
        {
          role: "system",
          content: `You are an intelligent content analyzer specializing in extracting opinions and sentiment from social media and discussion pages. Your task is to:

For social media and discussion content:
- Focus on identifying the predominant opinions and viewpoints in the comments
- Analyze the overall sentiment (positive, negative, mixed, neutral)
- Highlight the main arguments or perspectives that are getting the most engagement
- Note any significant counter-arguments or minority opinions
- Quantify the consensus when possible (e.g., "majority supports X", "evenly split between Y and Z")
- Ignore off-topic or irrelevant comments

For regular web pages:
- Focus on the main factual information and key points
- Identify the primary purpose or message
- Extract the most relevant details

Keep the summary concise (2-3 sentences) and focus on what people think/feel about the topic rather than just what they're discussing. Format for easy reading in a browser extension popup.`
        },
        {
          role: "user",
          content: `Please analyze and summarize this web content:\n\nURL: ${url}\n\n${textToSummarize}`
        }
      ],
      max_tokens: 150,
      temperature: 0.4, // Slightly increased for better handling of diverse content
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
