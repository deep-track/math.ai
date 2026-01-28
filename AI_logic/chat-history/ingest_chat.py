import json
import chromadb
import os
import cohere
from dotenv import load_dotenv

load_dotenv()

cohere_api_key = os.getenv("COHERE_API_KEY")
chroma_path = "./chroma_chathistory_db"
collection_name = "chat_history"

if not cohere_api_key:
    raise ValueError("Cohere API key not found")

co = cohere.Client(cohere_api_key)
client = chromadb.PersistentClient(path=chroma_path)

class CohereEmbeddingFunction:
    def __init__(self, cohere_client):
        self.co = cohere_client
    
    def __call__(self, input):
        response = self.co.embed(
            model='embed-multilingual-v3.0',
            texts=input,
            input_type='search_document'
        )
        return response.embeddings

def ingest_chat_history(jsonl_path: str):
    print(f"Loading data from {jsonl_path}...")

    embedding_fn = CohereEmbeddingFunction(co)
    
    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=embedding_fn
    )

    batch_data = []
    doc_id = 1

    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)

            batch_data.append({
                "id": str(doc_id),
                "text": f"Question: {item['prompt']}\nAnswer: {item['final_answer']}",
            })
            doc_id += 1

            if len(batch_data) >= 96:
                collection.add(
                    documents=[x["text"] for x in batch_data],
                    ids=[x["id"] for x in batch_data],
                    
                )
                batch_data = []

        if batch_data:
            collection.add(
                documents=[x["text"] for x in batch_data],
                ids=[x["id"] for x in batch_data],
            )
    
    print(f"Ingested {collection.count()} traces into {chroma_path}")

jsonl_path=(r"/.jsonl") # Change path

if __name__ == "__main__":
    ingest_chat_history(jsonl_path)