# Web Page Summarizer API

This is a Vercel serverless API for summarizing web pages using OpenAI's API. It's designed to work with the Web Page Summarizer Chrome Extension.

## Features

- Summarizes web page content using OpenAI's GPT model
- Rate limiting to prevent API abuse
- CORS configured for Chrome extension access
- Environment variable configuration for API keys

## Deployment

### Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli)
- Node.js and npm/yarn
- OpenAI API key

### Setup

1. Install dependencies:

```bash
npm install
# or
yarn
```

2. Create a `.env` file based on `.env.example` and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

3. Deploy to Vercel:

```bash
vercel
```

4. Set environment variables on Vercel:

```bash
vercel env add OPENAI_API_KEY
```

## API Endpoints

### POST /api/summarize

Summarizes a web page based on its content.

**Request Body:**

```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "content": "The main content of the page...",
  "description": "Optional meta description"
}
```

**Response:**

```json
{
  "summary": "Concise summary of the web page in 2-3 phrases."
}
```

## Rate Limiting

The API implements a simple rate limiting mechanism that allows up to 5 requests per minute per IP address. This helps prevent API abuse and reduces costs.
