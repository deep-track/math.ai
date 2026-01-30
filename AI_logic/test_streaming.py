"""
Test script to verify streaming endpoint works locally
"""

import requests
import json
import sys
from datetime import datetime

API_URL = "http://localhost:8000"

def test_streaming():
    """Test the streaming endpoint"""
    
    print("=" * 60)
    print("Testing Streaming Endpoint")
    print("=" * 60)
    print(f"Time: {datetime.now().isoformat()}\n")
    
    # Test question
    question = "Résoudre l'équation 2x + 3 = 7"
    
    print(f"📤 Sending: {question}\n")
    
    try:
        response = requests.post(
            f"{API_URL}/ask-stream",
            json={
                "text": question,
                "user_id": "test_user",
                "session_id": "test_session"
            },
            stream=True,
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return False
        
        print("🟢 Stream Started!\n")
        print("-" * 60)
        print("STREAMING CHUNKS:")
        print("-" * 60 + "\n")
        
        # Process streaming response
        chunk_count = 0
        start_received = False
        end_received = False
        full_text = ""
        
        for line in response.iter_lines():
            if not line:
                continue
            
            try:
                chunk = json.loads(line)
                chunk_count += 1
                
                if chunk.get("type") == "start":
                    start_received = True
                    print(f"[START] {chunk_count} chunks received")
                    print(f"  - Partie: {chunk.get('partie')}")
                    print(f"  - Problem: {chunk.get('problemStatement', '')[:50]}...")
                    print(f"  - Sources: {len(chunk.get('sources', []))} items\n")
                    
                elif chunk.get("type") == "chunk":
                    text = chunk.get("text", "")
                    full_text += text
                    # Print first and subsequent chunks
                    if len(full_text) <= 150:
                        print(f"[CHUNK {chunk_count}] {repr(text)}")
                    elif len(full_text) <= 200:
                        print(f"\n... [MORE CHUNKS STREAMING] ({len(full_text)} chars so far) ...\n")
                    
                elif chunk.get("type") == "end":
                    end_received = True
                    print(f"\n[END] Stream Complete")
                    print(f"  - Total chunks: {chunk_count}")
                    print(f"  - Full response length: {len(full_text)} chars")
                    
                elif chunk.get("type") == "error":
                    print(f"[ERROR] {chunk.get('error')}")
                    
            except json.JSONDecodeError as e:
                print(f"❌ JSON Parse Error: {e}")
                print(f"   Raw line: {line[:100]}")
        
        print("\n" + "=" * 60)
        if start_received and end_received:
            print("✅ SUCCESS: Full streaming response received")
            print(f"   Total chunks: {chunk_count}")
            print(f"   Response size: {len(full_text)} characters")
            print(f"\nFirst 200 chars of response:")
            print("-" * 60)
            print(full_text[:200])
            print("-" * 60)
            return True
        else:
            print("❌ INCOMPLETE: Missing start or end marker")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Backend not running")
        print("   Start backend with: cd AI_logic && uvicorn src.api.server:app --reload")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout: Request took too long")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_streaming()
    sys.exit(0 if success else 1)
