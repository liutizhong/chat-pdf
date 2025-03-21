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
# weaviate_client = weaviate.connect_to_local(host=host,auth_credentials=Auth.api_key(API_KEY))
# collection = weaviate_client.collections.get("PDF_Collection")

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
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"  # Ollama API endpoint
OLLAMA_MODEL = "llama3.1:8b"

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

class ChatRequest(BaseModel):
    document_id: str
    query: str

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
        "document_id":document_id,
        "filename": filename,
        "upload_date": datetime.now().isoformat(),
        "page_count": len(text_by_page)
    }
    print("==================")
    print(document_properties)
    collection = client.collections.get("Document")
    data_row=[document_properties]
    with collection.batch.dynamic() as batch:
        for content in data_row:
            batch.add_object(
                    properties=content,
                    uuid = document_id 
                )
    # collection.data.insert(
    #     properties=document_properties,
    #     uuid=document_id
    # )

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
def generate_ollama_response(prompt, context_texts):
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
    response = requests.post(
            f"{OLLAMA_URL}",
            json={
                "model": OLLAMA_MODEL,
                "prompt": full_prompt,
                "stream": False
            },
            timeout=60
        )

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Error generating response from LLM")
        
    result = response.json()
    return result["response"]


    # async with httpx.AsyncClient() as client:  # async
    #         response = await client.post(  #await
    #             OLLAMA_URL,
    #             json={
    #                 "model": OLLAMA_MODEL,
    #                 "prompt": full_prompt,
    #                 "stream": False
    #             }
    #         )
            
    #         if response.status_code != 200:
    #             raise HTTPException(status_code=500, detail="Error generating response from LLM")
            
    #         result = response.json()
    #         return result["response"]

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
        doc["id"] = doc['document_id']  # Add the UUID as the id field
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

# @app.post("/api/chatold", response_model=ChatResponse)
def chat2(document_id: str, query: str):
    # document_id = request.document_id
    # query = request.query
    
    try:
        # Get the PDFPage collection
        reviews = client.collections.get("PDFPage")
        
        # Query for relevant content using near_text
        response = reviews.query.near_text(
            query=query,
            filters=Filter.by_property("document_id").equal(document_id),
            limit=5,
            return_metadata=MetadataQuery(score=True, explain_score=True),
        )
        
        context_texts = []
        sources = []
        
        # Check if we got results
        if response and hasattr(response, "objects") and len(response.objects) > 0:
            for o in response.objects:
                page = o.properties
                context_texts.append(f"Page {page['page_number']}: {page['content']}")
                sources.append({
                    "page": page["page_number"],
                    "relevance": round(o.metadata.score, 2) if hasattr(o.metadata, "score") else 0.5
                })
            
            # Generate answer from Ollama
            answer = generate_ollama_response(query, "\n\n".join(context_texts))
            print(answer)

            client.close()
            
            return {
                "answer": answer,
                "sources": sources
            }
        else:
            client.close()
            # No relevant content found but return a graceful message instead of 404
            return {
                "answer": "I couldn't find relevant information about that in this document. Could you rephrase your question?",
                "sources": []
            }
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))  

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    document_id = request.document_id
    query = request.query
    
    try:
        # Get the PDFPage collection
        reviews = client.collections.get("PDFPage")
        
        # 1. Set a timeout for the Weaviate query
        response = await asyncio.wait_for(
            asyncio.create_task(
                reviews.query.near_text(
                    query=query,
                    filters=Filter.by_property("document_id").equal(document_id),
                    limit=3,  # Reduced from 5 to 3 for faster response
                    return_metadata=MetadataQuery(score=True),  # Removed explain_score for faster response
                )
            ),
            timeout=10.0  # 10 second timeout
        )
        
        context_texts = []
        sources = []
        
        # Check if we got results
        if response and hasattr(response, "objects") and len(response.objects) > 0:
            for o in response.objects:
                page = o.properties
                # 2. Limit the context text length for faster processing
                page_content = page['content']
                if len(page_content) > 1000:  # Limit long page content
                    page_content = page_content[:1000] + "..."
                    
                context_texts.append(f"Page {page['page_number']}: {page_content}")
                sources.append({
                    "page": page["page_number"],
                    "relevance": round(o.metadata.score, 2) if hasattr(o.metadata, "score") else 0.5
                })
            
            # 3. Set a timeout for the Ollama response generation
            try:
                answer = await asyncio.wait_for(
                    generate_ollama_response(query, "\n\n".join(context_texts)),
                    timeout=15.0  # 15 second timeout
                )
            except asyncio.TimeoutError:
                # If LLM generation times out, send back a fallback response with sources
                return {
                    "answer": "I found some relevant information but couldn't generate a complete response in time. Please check these sources or try a more specific question.",
                    "sources": sources
                }
            
            return {
                "answer": answer,
                "sources": sources
            }
        else:
            # No relevant content found but return a graceful message
            return {
                "answer": "I couldn't find relevant information about that in this document. Could you rephrase your question?",
                "sources": []
            }
    except asyncio.TimeoutError:
        # If the vector search times out
        return {
            "answer": "I'm having trouble retrieving information from the document. Please try again with a simpler question.",
            "sources": []
        }
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        # Return a meaningful response instead of throwing an error
        return {
            "answer": "I encountered an issue processing your question. Please try again.",
            "sources": []
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # document_id="7054b3cd-c2ee-40b9-8562-908874f05782"
    # query="营业收入"
    # result=chat2(document_id,query)
    # print(result)