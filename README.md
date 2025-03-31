# PathPilot

PathPilot is an AI-powered decision-making assistant that helps users create structured plans for their goals and decisions. Built with React and OpenAI's GPT-4, it provides a clean, modern interface for generating and exporting detailed action plans.

## Features

- 🤖 AI-powered decision planning
- 💬 Interactive chat interface
- 📝 Markdown support for rich text formatting
- 📄 PDF export functionality
- 🌙 Dark mode UI
- ⌨️ Keyboard shortcuts for better UX
- 🔄 Real-time streaming responses

## Tech Stack

- Frontend: React, Material-UI
- Backend: Node.js, Express
- AI: OpenAI GPT-4
- PDF Generation: html2pdf.js

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- OpenAI API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pathpilot.git
   cd pathpilot
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

4. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=5001
   ```

## Running the Application

1. Start the backend server (from the root directory):
   ```bash
   npm start
   ```

2. Start the frontend development server (in a new terminal):
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter your decision-making scenario in the text field
2. Chat with the AI to refine your plan
3. When ready, click "Export Plan" to generate a PDF of your PathPlan
4. Review and share your structured plan

## Keyboard Shortcuts

- `Enter`: Send message
- `Shift + Enter`: New line
- `↑/↓`: Navigate message history

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 