"""
Database Initialization Module

Automatically initializes ChromaDB with curriculum data on first startup.
This runs during Render deployment to populate the persistent disk.
"""

import os
import json
import sys
from pathlib import Path

<<<<<<< HEAD

def initialize_database():
    """Initialize ChromaDB with curriculum data on startup if not already initialized"""

    # Determine ChromaDB path
    chroma_path = os.getenv("CHROMA_PATH", "./chroma_db")
    print(f"[INIT] Checking database at: {chroma_path}")

=======
def initialize_database():
    """Initialize ChromaDB with curriculum data on startup if not already initialized"""
    
    # Determine ChromaDB path
    chroma_path = os.getenv("CHROMA_PATH", "./chroma_db")
    print(f"[INIT] Checking database at: {chroma_path}")
    
>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
    # Check if already initialized (look for chroma.sqlite3 file)
    db_marker = os.path.join(chroma_path, "chroma.sqlite3")
    if os.path.exists(db_marker):
        print(f"[INIT] Database already initialized at {chroma_path}")
        return True
<<<<<<< HEAD

=======
    
>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
    # Find curriculum file (check multiple possible locations)
    possible_paths = [
        "curriculum_data/processed/processed_curriculum.json",
        "./curriculum_data/processed/processed_curriculum.json",
        "../curriculum_data/processed/processed_curriculum.json",
<<<<<<< HEAD
        os.path.join(
            os.path.dirname(__file__),
            "../../curriculum_data/processed/processed_curriculum.json",
        ),
    ]

=======
        os.path.join(os.path.dirname(__file__), "../../curriculum_data/processed/processed_curriculum.json"),
    ]
    
>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
    curriculum_file = None
    for path in possible_paths:
        if os.path.exists(path):
            curriculum_file = path
            print(f"[INIT] Found curriculum file at: {path}")
            break
<<<<<<< HEAD

    if not curriculum_file:
        print(
            f"[INIT] Curriculum file not found. Database will be empty. Questions will use fallback mode."
        )
        return False

    # Verify file has content
    try:
        with open(curriculum_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not data:
            print(f"[INIT] Curriculum file is empty")
            return False

=======
    
    if not curriculum_file:
        print(f"[INIT] Curriculum file not found. Database will be empty. Questions will use fallback mode.")
        return False
    
    # Verify file has content
    try:
        with open(curriculum_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data:
            print(f"[INIT] Curriculum file is empty")
            return False
        
>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
        print(f"[INIT] Curriculum file contains {len(data)} chunks")
    except Exception as e:
        print(f"[INIT] Error reading curriculum file: {e}")
        return False
<<<<<<< HEAD

=======
    
>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
    # Import ingest function
    try:
        from src.retrieval.ingest_curriculum import run_ingestion
    except ImportError as e:
        print(f"[INIT] Could not import ingest module: {e}")
        return False
<<<<<<< HEAD

=======
    
>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
    # Run ingestion
    try:
        print(f"[INIT] Starting curriculum ingestion...")
        run_ingestion(curriculum_file)
        print(f"[INIT] Database initialized successfully with curriculum data")
        return True
    except Exception as e:
        print(f"[INIT] Error during ingestion: {e}")
        import traceback
<<<<<<< HEAD

        traceback.print_exc()
        return False


=======
        traceback.print_exc()
        return False

>>>>>>> 6419d00fa40cf43afc9c0da6eb8e3b36ef351bf7
if __name__ == "__main__":
    success = initialize_database()
    sys.exit(0 if success else 1)
