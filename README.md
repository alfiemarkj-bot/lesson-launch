# LessonLaunch

Convert teacher notes into curriculum-aligned PowerPoint presentations using AI.

## Features

- 📝 Upload notes as text, Word documents (.docx), or PDFs
- 🤖 AI-powered slide generation using OpenAI GPT-4
- 📚 Aligned with UK National Curriculum (KS1 & KS2)
- 🎯 Subject-aware content generation
- 📊 Automatic differentiation (support & stretch)
- 🎨 Professional PowerPoint output
- ⏱️ Duration-based slide quantity calculation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   NODE_ENV=development
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=./uploads
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. Fill in the lesson form:
   - Enter the lesson topic
   - Select lesson duration
   - Check boxes for additional resources and interactive lessons
   - Paste notes or upload a file (.txt, .docx, or .pdf)
   - Optionally upload reference images

2. Click "Preview your slide deck"

3. Wait for AI processing (usually 30-60 seconds)

4. Download your PowerPoint presentation

## Supported File Types

**Notes files:**
- `.txt` - Plain text files
- `.docx` - Microsoft Word documents
- `.pdf` - PDF documents

**Images:**
- All standard image formats (for reference images)

## Curriculum Standards

The app includes comprehensive UK National Curriculum standards for:
- **Key Stage 1 (KS1)**: Years 1-2
- **Key Stage 2 (KS2)**: Years 3-6

**Subjects covered:**
- English (Reading, Writing, Spoken Language)
- Mathematics
- Science
- Computing
- Art & Design
- History
- Geography

## Project Structure

```
Teacherapp/
├── data/
│   └── curriculum-standards.js    # KS1 & KS2 curriculum data
├── routes/
│   └── api.js                      # API routes
├── services/
│   ├── aiService.js               # OpenAI integration
│   └── powerpointService.js       # PowerPoint generation
├── utils/
│   └── fileReader.js              # File reading utilities
├── uploads/                       # Temporary file storage
├── index.html                     # Frontend
├── styles.css                     # Styles
├── server.js                      # Express server
└── package.json                   # Dependencies
```

## API Endpoints

### `POST /api/generate-slides`

Generate a PowerPoint from teacher notes.

**Request:**
- `topic` (string, required): Lesson topic
- `duration` (string, required): Lesson duration in minutes
- `notes` (string): Text notes
- `notesFile` (file): Uploaded notes file (.txt, .docx, .pdf)
- `additionalResources` (boolean): Whether additional resources are needed
- `interactiveLesson` (boolean): Whether lesson is interactive
- `images` (files): Reference images

**Response:**
- PowerPoint file (.pptx) download

## Development

The app uses:
- **Express.js** - Web server
- **Multer** - File upload handling
- **OpenAI API** - AI content generation
- **PptxGenJS** - PowerPoint generation
- **Mammoth** - Word document parsing
- **pdf-parse** - PDF text extraction

## Notes

- Uploaded files are automatically cleaned up after processing
- Generated PowerPoints are temporarily stored and cleaned up after download
- The app requires an active OpenAI API key to function
- File size limit is 10MB by default (configurable in `.env`)

## License

MIT

