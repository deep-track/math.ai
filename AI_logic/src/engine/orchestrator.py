import os
from dotenv import load_dotenv
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from mistralai import Mistral
import cohere

# CONFIGURATION 
load_dotenv()

# 1. Setup Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROMA_DB_DIR = os.path.join(BASE_DIR, "chroma_db")

# 2. Initialize Clients
mistral_api_key = os.getenv("MISTRAL_API_KEY")
mistral_client = Mistral(api_key=mistral_api_key)

# Cohere for the  (Search/Embeddings)
cohere_api_key = os.getenv("COHERE_API_KEY")
if not cohere_api_key:
    raise ValueError(" COHERE_API_KEY is missing in .env file")
co_client = cohere.Client(api_key=cohere_api_key)

# COHERE EMBEDDING FUNCTION
class CohereEmbeddingFunction(EmbeddingFunction):
    def __init__(self, client):
        self.client = client

    def __call__(self, input: Documents) -> Embeddings:
        
        response = self.client.embed(
            texts=input,
            model="embed-multilingual-v3.0",
            input_type="search_query" 
        )
        return response.embeddings

# 3. Initialize Database with Cohere Function
print(f"🔌 Connecting to Database at: {CHROMA_DB_DIR}...")
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# Connect to the collection using Cohere
embedding_fn = CohereEmbeddingFunction(co_client)
collection = chroma_client.get_collection(
    name="math_curriculum_benin", 
    embedding_function=embedding_fn
)

#  SYSTEM PROMPT 
SYSTEM_TEMPLATE = """You are an expert Math Pedagogy Assistant designed to help pre-service teachers in Benin.
Your goal is to explain mathematical concepts clearly in French, adhering strictly to the official
high school curriculum provided in the context.

### CORE INSTRUCTIONS:
1. **Strict Context Adherence (RAG):** - Answer ONLY using the provided Context chunks below.
- If the answer is not in the context, explicitly state: "Je ne trouve pas cette information dans le programme officiel fourni."

2. **Pedagogical Style (The "Guide on the Side"):**
- Do NOT just give the final answer. Explain the *reasoning* and the definitions first.
- Break down complex logic into step-by-step instructions.
- Use clear, academic but accessible French suitable for Beninese high school level (Lycée).

3. **Formatting:**
- Use LaTeX for all math formulas (enclose in single $ for inline, $$ for block).
- Use bolding for key terms.

### CONTEXT DATA:
{context_str}
"""

# REASONING ENGINE TOOLS 

def search_curriculum(query):
    """
    Action: Searches the vector database for relevant content.
    """
    print(f"[Action] Searching ChromaDB (via Cohere) for: '{query}'...")
    
    results = collection.query(
        query_texts=[query],
        n_results=3
    )
    
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    context_text = ""
    for i, doc in enumerate(documents):
        source = metadatas[i].get('source', 'Unknown')
        page = metadatas[i].get('page', '?')
        context_text += f"\n--- Source: {source} (Page {page}) ---\n{doc}\n"
    
    return context_text

# MAIN ORCHESTRATOR LOOP 

def ask_benin_math(question: str):
    print(f"\n[User Question]: {question}")
    
    print("[Thought]: Retrieving official curriculum data...")
    
    # 1. Search (using Cohere)
    context_observation = search_curriculum(question)
    
    if not context_observation.strip():
        print("Observation]: Database returned empty results.")
        return "Je ne trouve pas cette information dans le programme officiel fourni."
    else:
        print(f"[Observation]: Retrieved relevant context.")

    # 2. Generate Answer 
    final_prompt = SYSTEM_TEMPLATE.format(context_str=context_observation)
    
    try:
        chat_response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[
                {"role": "system", "content": final_prompt},
                {"role": "user", "content": question}
            ]
        )
        
        answer = chat_response.choices[0].message.content
        return answer

    except Exception as e:
        return f"Error contacting Mistral: {e}"

if __name__ == "__main__":
    user_query = "Qu'est-ce qu'un espace vectoriel ?"
    response = ask_benin_math(user_query)
    
    print("\n" + "="*50)
    print("🎓 REPONSE DU MENTOR:")
    print(response)
    print("="*50)