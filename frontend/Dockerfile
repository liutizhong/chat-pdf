# Stage 1: Build React frontend
FROM node:18-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2: Setup Python backend
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy FastAPI backend
COPY ../FastApi /app/

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    python-multipart \
    weaviate-client \
    sentence-transformers \
    nltk \
    PyPDF2 \
    httpx

# Copy built frontend
COPY --from=frontend-builder /app/build /app/static

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "App:app", "--host", "0.0.0.0", "--port", "8000"]
