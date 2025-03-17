import os
import json
import shutil
import tempfile
import requests
import weaviate
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from sentence_transformers import SentenceTransformer
# from pdf_vectorizer import PDFVectorizer

from weaviate.classes.init import Auth
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import MetadataQuery, Filter


API_KEY = "WVF5YThaHlkYwhGUSmCRgsX3tD5ngdN8pkih"
host='127.0.0.1'

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import weaviate
from weaviate.util import generate_uuid5
import os
import uuid
from typing import List, Optional, Dict, Any
import httpx
import PyPDF2
import nltk
from pathlib import Path
import shutil
import asyncio
import io
from datetime import datetime


# Initialize Weaviate client and sentence transformer model
weaviate_client = weaviate.connect_to_local(host=host,auth_credentials=Auth.api_key(API_KEY))
collection = weaviate_client.collections.get("PDF_Collection")

model = SentenceTransformer('all-MiniLM-L6-v2')

# Download NLTK resources
nltk.download('punkt')

app = FastAPI(title="PDF Chat Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React app's URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Disposition"],
)

# Configuration
UPLOAD_DIR = "uploads"
WEAVIATE_URL = "http://localhost:8080"  # Change to your Weaviate instance URL
OLLAMA_URL = "http://localhost:11434/api/generate"  # Ollama API endpoint

# Create upload directory if it doesn't exist
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

# Connect to Weaviate
client = weaviate.connect_to_local(host=host,auth_credentials=Auth.api_key(API_KEY))
collection = client.collections.get("PDF_Collection")

# Pydantic models
class DocumentInfo(BaseModel):
    id: str
    filename: str
    page_count: int
    upload_date: str

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]

# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    text_by_page = []
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            if text:
                text_by_page.append((page_num + 1, text))
    return text_by_page

# Function to vectorize PDF and store in Weaviate
async def vectorize_pdf(document_id, pdf_path, filename):
    # Extract text from PDF
    text_by_page = extract_text_from_pdf(pdf_path)
    
    # Store document info in Weaviate
    document_properties = {
        "filename": filename,
        "upload_date": datetime.now().isoformat(),
        "page_count": len(text_by_page)
    }
    print("==================")
    print(document_properties)
    collection = client.collections.get("Document")
    collection.data.insert(
        properties=document_properties,
        uuid=document_id
    )
    PDFPage = client.collections.get("PDFPage")
    with PDFPage.batch.dynamic() as batch:
        for page_num, content in text_by_page:
            page_properties = {
                    "content": content,
                    "page_number": page_num,
                    "document_id": document_id
                }
            page_id = generate_uuid5(f"{document_id}_{page_num}")
            batch.add_object(
                    properties=page_properties,
                    uuid = page_id 
                )

    failed_objects = collection.batch.failed_objects
    if failed_objects:
        print(f"Number of failed imports: {len(failed_objects)}")
        print(f"First failed object: {failed_objects[0]}")
    
    return len(text_by_page)

# Function to generate response from Ollama
async def generate_ollama_response(prompt, context_texts):
    # Prepare prompt with context
    full_prompt = f"""
    You are a helpful AI assistant that answers questions about PDF documents.
    Use the following context to answer the question, and provide the page numbers where the information comes from.
    
    Context:
    {context_texts}
    
    Question: {prompt}
    
    Answer:
    """
    
    # Call Ollama API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            OLLAMA_URL,
            json={
                "model": "llama3.1",
                "prompt": full_prompt,
                "stream": False
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Error generating response from LLM")
        
        result = response.json()
        return result["response"]

# API endpoints
@app.post("/api/upload", response_model=DocumentInfo)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    print("+++===========")
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Generate a unique ID for the document
    document_id = str(uuid.uuid4())
    print(document_id)
    # Save the uploaded file
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}.pdf")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process the PDF in the background
    background_tasks.add_task(vectorize_pdf, document_id, file_path, file.filename)
    
    return JSONResponse(
        status_code=202,
        content={
            "id": document_id,
            "filename": file.filename,
            "page_count": 0,  # Will be updated after processing
            "upload_date": datetime.now().isoformat()
        }
    )

@app.get("/api/documents", response_model=List[DocumentInfo])
async def get_documents():
    # Query Weaviate for all documents
    reviews = client.collections.get("Document")
    documents = []
    for item in reviews.iterator():
        # Add the UUID as the id field to match the model
        doc = item.properties
        doc["id"] = item.uuid.hex  # Add the UUID as the id field
        documents.append(doc)
    
    print("+++/api/documents+++")
    print(len(documents))
    print(documents)
    return documents

@app.get("/api/documents/{document_id}/pdf")
async def get_document_pdf(document_id: str):
    # Find the document file
    file_path = os.path.join(UPLOAD_DIR, f"{document_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")
    
    return FileResponse(file_path, media_type="application/pdf")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(document_id: str, query: str):
    reviews = client.collections.get("PDFPage")
    print("xxxxxxxxxxxxx")
    response = reviews.query.near_text(
            query=query,
            filters=Filter.by_property("document_id").equal(document_id),
            limit=5,
            return_metadata=MetadataQuery(score=True, explain_score=True),
        )
    context=[]
    context_texts = []
    sources = []
    if response and hasattr(response, "objects"):
            for o in response.objects:
                page = o.properties
                context_texts.append(f"Page {page['page_number']}: {page['content']}")
                sources.append({
                    "page": page["page_number"],
                    "relevance": 0.8  # Placeholder for relevance score
                })
                # context.append(o.properties)
            answer = await generate_ollama_response(query, "\n\n".join(context_texts))
            return {
                    "answer": answer,
                    "sources": sources
                }
    else:
        raise HTTPException(status_code=404, detail="No relevant content found")
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)