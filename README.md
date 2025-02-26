# Web Page Summarizer Chrome Extension

A Chrome extension that uses AI to summarize web pages in 2-3 phrases, providing concise telegram-style summaries of any web content.

## Features

- **Instant Summaries**: Summarize any web page with a single click
- **Custom Prompts**: Ask specific questions about the page content
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Clean, modern UI that works across devices
- **Rate Limiting**: Built-in protection against API abuse

## Architecture

The project consists of two main components:

1. **Chrome Extension**: Frontend interface that extracts content from web pages
2. **Serverless API**: Backend service deployed on Vercel that processes content using OpenAI

## Installation

### For Users

To install the Web Page Summarizer extension:

1. **Download the Extension**:
   - Download the latest release ZIP file from the [Releases page](https://github.com/pasteq7/webpage-summarizer/releases)

2. **Install in Chrome**:
   - If downloading from Chrome Web Store:
     - Click the "Add to Chrome" button
     - Click "Add extension" in the confirmation dialog
   
   - If installing manually from GitHub:
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

### Local Development

1. Clone this repository:
   ```
   git clone https://github.com/pasteq7/webpage-summarizer.git
   cd webpage-summarizer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `extension` folder from this repository

### Deployment

The API is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Add your `OPENAI_API_KEY` as an environment variable in the Vercel project settings
3. Deploy the project

## Usage

1. Click on the extension icon in your browser toolbar
2. Press the "Summarize" button to get a quick summary of the current page
3. For specific questions, toggle the settings panel and enter a custom prompt
4. Switch between dark and light themes using the theme toggle button

## Technical Details

- **Frontend**: Vanilla JavaScript, HTML, and CSS
- **Backend**: Node.js serverless function
- **AI**: OpenAI GPT-4o-mini model for efficient summarization
- **Deployment**: Vercel for serverless API hosting

## API Rate Limiting

The API implements a simple rate limiting mechanism:
- 5 requests per minute per IP address
- Automatic cleanup of rate limiting data every 5 minutes

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.