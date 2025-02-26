document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const summarizeBtn = document.getElementById('summarize-btn');
  const retryBtn = document.getElementById('retry-btn');
  const summaryContent = document.getElementById('summary-content');
  const loadingContainer = document.getElementById('loading');
  const contentContainer = document.getElementById('content');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  const loadingText = document.getElementById('loading-text');
  const themeToggle = document.getElementById('theme-toggle');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const customPrompt = document.getElementById('custom-prompt');

  // Ensure loading is hidden by default (in case CSS fails)
  loadingContainer.style.display = 'none';
  loadingContainer.classList.add('hidden');
  
  // Ensure content is visible by default
  contentContainer.classList.remove('hidden');
  errorContainer.classList.add('hidden');

  // Theme handling
  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  const toggleTheme = () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Initialize theme
  const savedTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(savedTheme);

  // Settings panel handling
  const toggleSettings = () => {
    settingsPanel.classList.toggle('hidden');
    settingsToggle.setAttribute('aria-expanded', 
      settingsPanel.classList.contains('hidden') ? 'false' : 'true'
    );
  };

  // Theme toggle event listener
  themeToggle.addEventListener('click', toggleTheme);
  settingsToggle.addEventListener('click', toggleSettings);

  // API endpoints configuration
  const config = {
    development: 'http://localhost:3000/api/summarize',
    production: 'https://summarize-api-two.vercel.app/api/summarize'
  };

  // Check if we can connect to local development server
  const checkLocalServer = async () => {
    try {
      const response = await fetch('http://localhost:3000/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Initialize API endpoint
  let API_ENDPOINT = config.production;

  // Function to format content size in relevant units
  const formatContentSize = (content) => {
    const charCount = content.length;
    
    // Estimate words (rough approximation)
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Estimate reading time (average reading speed: 200-250 words per minute)
    const readingTimeMinutes = wordCount / 225;
    
    if (charCount < 1000) {
      return `${charCount} chars (${wordCount} words)`;
    } else if (charCount < 10000) {
      return `${(charCount / 1000).toFixed(1)}K chars (${wordCount} words, ~${Math.ceil(readingTimeMinutes)} min read)`;
    } else {
      return `${(charCount / 1000).toFixed(0)}K chars (${Math.round(wordCount / 100) * 100} words, ~${Math.ceil(readingTimeMinutes)} min read)`;
    }
  };

  // Function to show loading state
  const showLoading = (content = null) => {
    loadingContainer.style.display = 'flex';
    loadingContainer.classList.remove('hidden');
    contentContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    summarizeBtn.disabled = true;
    
    if (content) {
      const sizeInfo = formatContentSize(content);
      loadingText.innerHTML = `Summarizing...<br><span class="size-info">${sizeInfo}</span>`;
    } else {
      loadingText.textContent = 'Summarizing...';
    }
  };

  // Function to show content
  const showContent = () => {
    loadingContainer.style.display = 'none';
    loadingContainer.classList.add('hidden');
    contentContainer.classList.remove('hidden');
    errorContainer.classList.add('hidden');
    summarizeBtn.disabled = false;
  };

  // Function to show error
  const showError = (error) => {
    loadingContainer.style.display = 'none';
    loadingContainer.classList.add('hidden');
    contentContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = error;
    summarizeBtn.disabled = false;
  };

  // Function to format summary text
  const formatSummary = (text) => {
    // Clean up the text by removing extra spaces and newlines
    text = text.trim().replace(/\n{3,}/g, '\n\n');
    
    // Check if text contains bullet points (lines starting with - or •)
    const hasBulletPoints = /^[-•*]\s/m.test(text);
    
    if (hasBulletPoints) {
      // Format bullet points as a list with telegram style
      return `<div class="telegram-style">` + 
        text.split('\n')
          .filter(line => line.trim())
          .map(line => {
            if (line.trim().match(/^[-•*]\s/)) {
              // This is a bullet point, format as list item
              return `<li>${line.trim().replace(/^[-•*]\s/, '')}</li>`;
            } else {
              // This is a regular paragraph
              return `<p>${line}</p>`;
            }
          })
          .join('')
          .replace(/<li>/g, '<ul><li>')
          .replace(/<\/li><li>/g, '</li><li>')
          .replace(/<\/li><p>/g, '</li></ul><p>')
          .replace(/<\/p><li>/g, '</p><ul><li>')
          .replace(/<\/li>$/, '</li></ul>') +
        `</div>`;
    } else {
      // For very short summaries, make them stand out with telegram style
      if (text.length < 100 && !text.includes('\n')) {
        return `<p class="highlight telegram-style">${text}</p>`;
      }
      
      // Regular paragraph formatting with telegram style
      return `<div class="telegram-style">` +
        text.split('\n')
          .filter(para => para.trim())
          .map(para => `<p>${para}</p>`)
          .join('') +
        `</div>`;
    }
  };

  // Function to summarize the current page
  const summarizePage = async () => {
    try {
      showLoading();

      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Get the custom prompt if provided
      const prompt = customPrompt.value.trim();

      // Execute content script to get page content
      const [{ result: pageContent }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Get all text content from the page
          const textContent = document.body.innerText;
          const title = document.title;
          return { title, content: textContent };
        }
      });
      
      // Update loading text with content size information
      showLoading(pageContent.content);

      // Check if local server is available
      const isLocalAvailable = await checkLocalServer();
      API_ENDPOINT = isLocalAvailable ? config.development : config.production;

      // Prepare the request body
      const requestBody = {
        title: pageContent.title,
        content: pageContent.content,
        customPrompt: prompt
      };

      // Send request to API
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to get summary');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Show the content container before updating the summary
      showContent();
      summaryContent.innerHTML = formatSummary(data.summary);

    } catch (error) {
      console.error('Error:', error);
      showError(error.message || 'An error occurred while summarizing the page');
    }
  };
  
  // Event listeners
  summarizeBtn.addEventListener('click', summarizePage);
  retryBtn.addEventListener('click', summarizePage);
});
