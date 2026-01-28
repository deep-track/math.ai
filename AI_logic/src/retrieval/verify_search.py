import os
import cohere
import chromadb
from dotenv import load_dotenv

# 1. Load Secrets
load_dotenv()

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
COLLECTION_NAME = "math_curriculum_benin"

# 2. Initialize Clients
co = cohere.Client(COHERE_API_KEY)
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_collection(name=COLLECTION_NAME)

def search_database(query_text, n_results=3):
    print(f"Searching for: '{query_text}'...")

    # 3. Embed the Query 
    query_emb = co.embed(
        texts=[query_text],
        model='embed-multilingual-v3.0',
        input_type='search_query'
    ).embeddings[0]

    # 4. Ask ChromaDB for the closest matches
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=n_results
    )

    # 5. Print Results
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    distances = results['distances'][0] # Lower distance = Better match

    if not documents:
        print("No results found.")
        return

    print(f"Found {len(documents)} relevant chunks:\n")
    
    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        print(f"Result {i+1} (Distance: {dist:.4f})")
        print(f"Source: {meta.get('source', 'Unknown')} (Page {meta.get('page', '?')})")
        print(f"Text Snippet: {doc[:300]}...") # Show first 300 chars
        print("\n")

if __name__ == "__main__":
    search_database("limites d'une fonction")