import chromadb
import os

# 1. Point to the database folder shown in your screenshot
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "chroma_db")

print(f"🕵️ Looking for database at: {DB_PATH}")

if not os.path.exists(DB_PATH):
    print("❌ ERROR: Database folder does not exist here!")
else:
    client = chromadb.PersistentClient(path=DB_PATH)
    collections = client.list_collections()
    
    print(f"📂 Found {len(collections)} collections:")
    
    for col in collections:
        count = col.count()
        print(f"   - Name: '{col.name}' | Documents: {count}")
        
        if count == 0:
            print("     ⚠️ This collection is EMPTY.")
        else:
            print(f"     ✅ This collection has data! Update your Orchestrator to use name: '{col.name}'")