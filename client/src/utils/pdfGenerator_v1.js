import { jsPDF } from 'jspdf';

// Constants for styling
const COLORS = {
  primary: '#90caf9',
  text: '#333333',
  code: '#1e1e1e',
  codeText: '#e0e0e0'
};

const FONTS = {
  title: 24,
  subtitle: 16,
  header: 18,
  body: 12,
  code: 10
};

const MARGINS = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20
};

const LINE_HEIGHT = {
  title: 20,
  subtitle: 15,
  header: 15,
  body: 8,
  code: 8,
  empty: 8
};

// Helper function to detect if a line is a header
const isHeader = (line) => {
  // Match lines that start with # followed by a space or any number of #s
  return /^#+\s/.test(line);
};

// Helper function to get header level and text
const parseHeader = (line) => {
  const match = line.match(/^(#+)\s(.+)$/);
  if (match) {
    return {
      level: match[1].length,
      text: match[2]
    };
  }
  return null;
};

// Helper function to parse text with formatting
const parseFormattedText = (text) => {
  const segments = [];
  let currentIndex = 0;
  let currentText = '';
  let currentStyle = 'normal';

  while (currentIndex < text.length) {
    const char = text[currentIndex];
    
    if (char === '*' && text[currentIndex + 1] === '*') {
      // Bold text
      if (currentText) {
        segments.push({ text: currentText, style: currentStyle });
        currentText = '';
      }
      currentStyle = currentStyle === 'bold' ? 'normal' : 'bold';
      currentIndex += 2;
      continue;
    }
    
    if (char === '*' && text[currentIndex - 1] !== '*') {
      // Italic text
      if (currentText) {
        segments.push({ text: currentText, style: currentStyle });
        currentText = '';
      }
      currentStyle = currentStyle === 'italic' ? 'normal' : 'italic';
      currentIndex += 1;
      continue;
    }
    
    currentText += char;
    currentIndex += 1;
  }
  
  if (currentText) {
    segments.push({ text: currentText, style: currentStyle });
  }
  
  return segments;
};

// Helper function to split text into lines that fit the page width
const splitTextIntoLines = (text, doc, maxWidth, fontSize) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(testLine);
    
    if (textWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

// Helper function to add a new page if needed
const addNewPageIfNeeded = (doc, yPos) => {
  if (yPos > doc.internal.pageSize.height - MARGINS.bottom) {
    doc.addPage();
    return MARGINS.top;
  }
  return yPos;
};

export const generatePDF = (content, options = {}) => {
  const {
    title = '🧭 Your PathPilot Plan',
    subtitle = new Date().toLocaleDateString()
  } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set default font
  doc.setFont('helvetica');
  doc.setTextColor(COLORS.text);

  // Add title
  doc.setFontSize(FONTS.title);
  doc.setTextColor(COLORS.primary);
  doc.text(title, MARGINS.left, MARGINS.top + LINE_HEIGHT.title);

  // Add subtitle
  let yPos = MARGINS.top + LINE_HEIGHT.title + LINE_HEIGHT.subtitle;
  doc.setFontSize(FONTS.subtitle);
  doc.setTextColor(COLORS.text);
  doc.text(subtitle, MARGINS.left, yPos);

  // Process content
  yPos += LINE_HEIGHT.subtitle;
  const maxWidth = doc.internal.pageSize.width - (MARGINS.left + MARGINS.right);
  const lines = content.split('\n');

  lines.forEach(line => {
    yPos = addNewPageIfNeeded(doc, yPos);

    if (!line.trim()) {
      yPos += LINE_HEIGHT.empty;
      return;
    }

    // Handle headers
    if (isHeader(line)) {
      const header = parseHeader(line);
      if (header) {
        const fontSize = FONTS.header - (header.level - 1) * 2; // Decrease size for each level
        doc.setFontSize(fontSize);
        doc.setTextColor(COLORS.primary);
        doc.setFont('helvetica', 'bold');
        const headerLines = splitTextIntoLines(header.text, doc, maxWidth, fontSize);
        headerLines.forEach(headerLine => {
          doc.text(headerLine, MARGINS.left, yPos);
          yPos += LINE_HEIGHT.header;
        });
        return;
      }
    }

    // Handle code blocks
    if (line.startsWith('```')) {
      doc.setFillColor(COLORS.code);
      doc.rect(MARGINS.left, yPos - 2, maxWidth, LINE_HEIGHT.code + 4, 'F');
      doc.setTextColor(COLORS.codeText);
      doc.setFont('courier');
      doc.setFontSize(FONTS.code);
      yPos += LINE_HEIGHT.code;
      return;
    }

    // Handle bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFontSize(FONTS.body);
      doc.setTextColor(COLORS.text);
      doc.setFont('helvetica', 'normal');
      const bulletText = line.substring(2);
      const segments = parseFormattedText(bulletText);
      let xPos = MARGINS.left;
      
      segments.forEach((segment, index) => {
        doc.setFont('helvetica', segment.style);
        const bulletLines = splitTextIntoLines(segment.text, doc, maxWidth - xPos + MARGINS.left, FONTS.body);
        bulletLines.forEach((bulletLine, lineIndex) => {
          yPos = addNewPageIfNeeded(doc, yPos);
          if (lineIndex === 0 && index === 0) {
            doc.text('• ' + bulletLine, xPos, yPos);
          } else {
            doc.text('  ' + bulletLine, xPos, yPos);
          }
          yPos += LINE_HEIGHT.body;
        });
      });
      return;
    }

    // Handle regular text with formatting
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text);
    const segments = parseFormattedText(line);
    let xPos = MARGINS.left;
    
    segments.forEach(segment => {
      doc.setFont('helvetica', segment.style);
      const textLines = splitTextIntoLines(segment.text, doc, maxWidth - xPos + MARGINS.left, FONTS.body);
      textLines.forEach(textLine => {
        yPos = addNewPageIfNeeded(doc, yPos);
        doc.text(textLine, xPos, yPos);
        yPos += LINE_HEIGHT.body;
      });
    });
  });

  // Add footer to all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(FONTS.body);
    doc.setTextColor(COLORS.text);
    doc.text(
      `Generated by PathPilot • Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - MARGINS.bottom,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save('pathpilot-plan.pdf');
}; 