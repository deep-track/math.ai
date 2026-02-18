import json
import uuid
import os
import cohere
import chromadb
from dotenv import load_dotenv

load_dotenv()

# CONFIGURATION 
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db_temp") 
COLLECTION_NAME = "math_curriculum_benin"

# Initialize Clients
co = cohere.Client(COHERE_API_KEY)

# Clean up temp if it exists
import shutil
if os.path.exists(CHROMA_PATH):
    try:
        shutil.rmtree(CHROMA_PATH)
        print(f"Cleaned {CHROMA_PATH}")
    except Exception as e:
        print(f"Could not clean {CHROMA_PATH}: {e}, creating fresh collection")

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

def run_ingestion(json_file_path: str):
    print(f"Loading data from {json_file_path}...")
    
    # Check if file exists to avoid confusion
    if not os.path.exists(json_file_path):
        print(f"Error: File not found at {json_file_path}")
        return

    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    # 2. Prepare Batches
    batch_size = 96
    total_docs = len(data)

    print(f"Found {total_docs} chunks. Starting ingestion...")

    for i in range(0, total_docs, batch_size):
        batch = data[i : i + batch_size]
        
        batch_texts = []
        batch_metadatas = []
        batch_ids = []


        for item in batch:
            # 1. Get the text
            batch_texts.append(item['text'])
            
            # 2. Re-package metadata (Source and Page go here)
            # We explicitly grab fields from the  JSON file
            meta = {
                "source": item.get("source", "unknown"),
                "page": item.get("page", 0),
                "original_id": item.get("id", "unknown")
            }
            batch_metadatas.append(meta)
            
            # 3. Generate a DB ID
            batch_ids.append(str(uuid.uuid4()))
        

        print(f"Embedding batch {i} to {i+len(batch)}...")
        
        try:
            # Generate Embeddings
            response = co.embed(
                texts=batch_texts,
                model='embed-multilingual-v3.0',
                input_type='search_document'
            )
            embeddings = response.embeddings

            # Store in Vector DB
            collection.add(
                documents=batch_texts,
                embeddings=embeddings,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
        except Exception as e:
            print(f"Error on batch {i}: {e}")

    print(f"Successfully indexed {total_docs} chunks into {CHROMA_PATH}.")

if __name__ == "__main__":
    run_ingestion("curriculum_data/processed/processed_curriculum.json")