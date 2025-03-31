import { marked } from 'marked';
import html2pdf from 'html2pdf.js';

// Create a hidden container for PDF content
const createPDFContainer = () => {
  let container = document.getElementById('pdf-content');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pdf-content';
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  return container;
};

// Add styles to the document
const addStyles = () => {
  const styleId = 'pdf-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #pdf-content {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
        color: #333;
        max-width: 210mm;
        margin: 0 auto;
        padding: 8mm;
        background: white;
      }
      
      #pdf-content .pdf-wrapper {
        margin-top: 0;
      }
      
      #pdf-content h1 {
        font-size: 24px;
        color: #90caf9;
        margin: 0 0 4px 0;
        padding-top: 0;
      }
      
      #pdf-content h2 {
        font-size: 18px;
        color: #90caf9;
        margin: 12px 0 6px 0;
      }
      
      #pdf-content h3 {
        font-size: 16px;
        color: #90caf9;
        margin: 10px 0 6px 0;
      }
      
      #pdf-content p {
        font-size: 14px;
        margin: 6px 0;
      }
      
      #pdf-content ul, #pdf-content ol {
        margin: 6px 0;
        padding-left: 24px;
      }
      
      #pdf-content li {
        margin: 3px 0;
        font-size: 14px;
      }
      
      #pdf-content strong {
        font-weight: 600;
      }
      
      #pdf-content .subtitle {
        font-size: 14px;
        color: #666;
        margin: 0 0 16px 0;
      }
      
      @media print {
        #pdf-content {
          padding: 0;
          margin: 0;
          max-width: none;
        }
        
        @page {
          size: A4;
          margin: 8mm;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

export const generatePDF = async (content, options = {}) => {
  const {
    title = 'Your PathPilot Plan',
    subtitle = new Date().toLocaleDateString()
  } = options;

  // Add styles to the document
  addStyles();

  // Create or get the PDF container
  const container = createPDFContainer();

  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });

  // Convert markdown to HTML
  const htmlContent = marked(content);

  // Create the full HTML content with title and subtitle
  const fullContent = `
    <div class="pdf-wrapper">
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
      <div class="content">
        ${htmlContent}
      </div>
    </div>
  `;

  // Set the content
  container.innerHTML = fullContent;

  // Make container visible temporarily for rendering
  container.style.display = 'block';
  
  // Wait for content to be rendered
  await new Promise(resolve => setTimeout(resolve, 100));

  // Configure PDF options
  const pdfOptions = {
    margin: [8, 8],
    filename: 'pathpilot-plan.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: true,
      windowWidth: 1024,
      windowHeight: 768,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.getElementById('pdf-content');
        if (clonedContainer) {
          clonedContainer.style.display = 'block';
          clonedContainer.style.position = 'absolute';
          clonedContainer.style.left = '0';
          clonedContainer.style.top = '0';
        }
      }
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    }
  };

  try {
    // Generate and download the PDF
    await html2pdf().set(pdfOptions).from(container).save();
    
    // Clean up
    container.innerHTML = '';
    container.style.display = 'none';
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Clean up on error
    container.innerHTML = '';
    container.style.display = 'none';
    throw error;
  }
};
