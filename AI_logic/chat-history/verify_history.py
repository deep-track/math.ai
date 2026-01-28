import json
import chromadb
import os
from dotenv import load_dotenv

load_dotenv()

cohere_api_key = os.getenv("COHERE_API_KEY")
chroma_path = "./chroma_chathistory_db"
collection_name = "chat_history"

if not cohere_api_key:
    raise ValueError("Cohere API key not found")

client = chromadb.PersistentClient(path=chroma_path)

def inspect_database():
    try:
        collection = client.get_collection(name=collection_name)
        
        print(f"Collection: {collection_name}")
        print(f"Total documents: {collection.count()}")

        all_docs = collection.get()
        
        if all_docs['ids']:
            print(f"\nFirst 3 documents:")
            for i in range(min(3, len(all_docs['ids']))):
                print(f"\n--- Document {i+1} ---")
                print(f"ID: {all_docs['ids'][i]}")
                print(f"Text: {all_docs['documents'][i][:1000]}...")
        else:
            print("Database is empty")
            
    except Exception as e:
        print(f"Error: {e}")
        print("Database might not exist or collection not found")

if __name__ == "__main__":
    inspect_database()