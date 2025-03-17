# PDF Chat Application

This application allows you to upload PDF documents, view them, and chat with them using Llama 3.1 through Ollama. The system extracts text from PDFs, vectorizes it, and stores it in a Weaviate vector database for semantic search.

## Features

- PDF Upload: Upload PDF documents to be processed and stored
- PDF Viewer: View PDF documents with page navigation
- Chat Interface: Ask questions about the PDF content
- Source Citations: See which pages in the document contain the information
- Page Navigation: Jump directly to the cited pages in the PDF

## System Architecture

The system consists of three main components:

1. **Frontend**: A React application with PDF viewer and chat interface
2. **Backend API**: A Flask API that handles PDF processing, chat, and database interactions
3. **Vector Database**: Weaviate for storing vectorized PDF content

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Weaviate running (either locally or cloud instance)
- Ollama with Llama 3.1 model installed

### Backend Setup

1. Clone the repository
2. Install backend dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set environment variables:
   ```
   export WEAVIATE_URL=http://localhost:8080
   export OLLAMA_URL=http://localhost:11434
   ```
4. Start the Flask API:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd pdf-chat-app
   ```
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```

## Usage

1. Open the application in your browser (http://localhost:3000)
2. Click "Upload PDF" to upload a new document
3. Select the document from the dropdown on the main page
4. Ask questions about the document in the chat interface
5. Click on source citations to navigate to the referenced pages

## Implementation Details

### PDF Processing

- Text extraction: PDFs are processed using PyPDF2 or pdfplumber
- Text chunking: Document content is divided into manageable chunks
- Vectorization: Text chunks are converted to vectors using embeddings

### Vector Storage

- Weaviate class: `PDFDocument` for document metadata
- Weaviate class: `PDFChunk` for text chunks with references to their source document and page numbers

### Question Answering

1. User question is vectorized
2. Similar chunks are retrieved from Weaviate
3. Retrieved chunks are sent to Llama 3.1 via Ollama along with the question
4. Llama 3.1 generates an answer based on the provided context
5. Answer is returned to the user with source citations

## License

MIT