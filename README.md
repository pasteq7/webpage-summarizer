# Web Page Summarizer Chrome Extension

A Chrome extension that uses AI to summarize web pages in 2-3 phrases, providing concise telegram-style summaries of any web content.

## Features

- **Instant Summaries**: Summarize any web page with a single click
- **Improved Content Extraction**: Smart algorithms to extract main content while ignoring navigation and ads
- **Custom Prompts**: Ask specific questions about the page content
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Clean, modern UI that works across devices
- **Rate Limiting**: Built-in protection against API abuse

## Architecture

The project consists of two main components:

1. **Chrome Extension**: Frontend interface that extracts content from web pages
2. **Serverless API**: Backend service deployed on Vercel that processes content using OpenAI

## Installation


To install the Web Page Summarizer extension:

1. **Download the Extension**:
   - Download the latest release ZIP file from the [Releases page](https://github.com/pasteq7/webpage-summarizer/releases)

2. **Install in Chrome**:
     - Download the `.zip` file from the latest release
     - Extract the ZIP file to a folder on your computer
     - Open Chrome and navigate to `chrome://extensions/`
     - Enable "Developer mode" by toggling the switch in the top-right corner
     - Click the "Load unpacked" button
     - Select the extracted extension folder
     - The extension icon should appear in your browser toolbar

3. **Start Using the Extension**:
   - Click on the extension icon in your browser toolbar
   - Press the "Summarize" button on any web page you want to summarize


## Technical Details

- **Frontend**: Vanilla JavaScript, HTML, and CSS
- **Backend**: Node.js serverless function
- **AI**: OpenAI GPT-4o-mini model for efficient summarization
- **Deployment**: Vercel for serverless API hosting

## API Rate Limiting

The API implements a simple rate limiting mechanism:
- 5 requests per minute per IP address
- Automatic cleanup of rate limiting data every 5 minutes
