"""
Vercel Serverless Function Handler for FastAPI

This file serves as the entry point for Vercel's serverless functions.
It uses Mangum to adapt the FastAPI ASGI application to AWS Lambda/API Gateway format,
which is what Vercel uses under the hood for Python serverless functions.
"""
import sys
import os

# Add the parent directory to the Python path so we can import app
# This is necessary because Vercel's serverless environment has a different structure
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mangum import Mangum
from app.main import app

# Create the handler using Mangum
# Mangum converts ASGI (FastAPI) to AWS Lambda event format
# lifespan="off" disables FastAPI lifespan events (startup/shutdown) 
# which aren't supported in serverless environments
handler = Mangum(app, lifespan="off")

