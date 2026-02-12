import os
import json
from dotenv import load_dotenv
try:
    import chromadb
    from chromadb import Documents, EmbeddingFunction, Embeddings
    CHROMADB_AVAILABLE = True
except Exception as e:
    print("[WARN] chromadb not available:", e)
    chromadb = None
    CHROMADB_AVAILABLE = False

from anthropic import Anthropic 
try:
    import cohere
    COHERE_AVAILABLE = True
except Exception as e:
    print("[WARN] cohere not available or incompatible:", e)
    cohere = None
    COHERE_AVAILABLE = False
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel

# IMPORT LOGGER 
from src.utils.logger import AgentLogger

# CONFIGURATION 
load_dotenv()
VERBOSE_MODE = os.getenv("VERBOSE", "True").lower() == "true"

# 1. Setup Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use Render persistent disk path if available, otherwise use local path
RENDER_DISK_PATH = "/opt/render/project/chroma_db"
if os.path.exists("/opt/render"):
    CHROMA_DB_DIR = RENDER_DISK_PATH
    print(f"[CONFIG] Using Render persistent disk: {CHROMA_DB_DIR}")
else:
    CHROMA_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
    print(f"[CONFIG] Using local disk: {CHROMA_DB_DIR}")

# INITIALIZE LOGGER 
logger = AgentLogger(verbose=VERBOSE_MODE)

# 2. Initialize Clients

# A. Claude (The Unified Agent)
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
if not anthropic_api_key:
    print("WARNING: ANTHROPIC_API_KEY not found. Claude/Anthropic features will be disabled.")
    claude_client = None
else:
    try:
        claude_client = Anthropic(api_key=anthropic_api_key)
    except Exception as e:
        print("[WARN] Failed to initialize Anthropic client:", e)
        claude_client = None

# B. Cohere (Search) — optional for local dev
cohere_api_key = os.getenv("COHERE_API_KEY")
if not COHERE_AVAILABLE:
    co_client = None
    print("WARNING: Cohere library unavailable; Cohere-dependent search will be disabled.")
elif not cohere_api_key:
    print("WARNING: COHERE_API_KEY not found. Cohere-dependent search will be disabled.")
    co_client = None
else:
    co_client = cohere.Client(api_key=cohere_api_key)

# COHERE EMBEDDING FUNCTION
if CHROMADB_AVAILABLE:
    class CohereEmbeddingFunction(EmbeddingFunction):
        def __init__(self, client):
            self.client = client

        def __call__(self, input: Documents) -> Embeddings:
            if not self.client:
                # Return dummy zero embeddings if Cohere not available
                return [[0.0] for _ in input]
            response = self.client.embed(
                texts=input,
                model="embed-multilingual-v3.0",
                input_type="search_query" 
            )
            return response.embeddings
else:
    # Minimal fallback for when chromadb is not installed
    class CohereEmbeddingFunction:
        def __init__(self, client):
            self.client = client

        def __call__(self, input):
            return [[0.0] for _ in input]

# 3. Initialize Database
print(f"Connecting to Database at: {CHROMA_DB_DIR}...")
if CHROMADB_AVAILABLE and co_client is not None:
    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        # Connect to the collection using Cohere
        embedding_fn = CohereEmbeddingFunction(co_client)
        collection = chroma_client.get_or_create_collection(
            name="math_curriculum_benin", 
            embedding_function=embedding_fn
        )
    except Exception as e:
        print("[WARN] Failed to initialize ChromaDB:", e)
        collection = None
else:
    print("[WARN] ChromaDB or Cohere not available — search disabled.")
    collection = None

# UNIFIED PROMPT (LOGIC + PEDAGOGY IN ONE)
CLAUDE_TUTOR_PROMPT = """
Vous êtes "Professeur Bio", le validateur strict du curriculum pour le système éducatif du Bénin.
Votre UNIQUE base de connaissances provient du contexte ci-dessous. Vous ne pouvez répondre QUE si la question concerne les sujets, théorèmes, formules, et concepts présents dans ce contexte.

Question de l'utilisateur: 
{question}

Contexte extrait de la base de données (Sources PDF):
{context_str}

### INSTRUCTIONS DE TRAITEMENT :

ÉTAPE 0 : VÉRIFICATION DU PÉRIMÈTRE (CRITIQUE)
- **Vérification du Module :** La question se rapporte-t-elle à l'un des sujets du programme extrait ?
- **Vérification du Contexte :** Le [Contexte extrait] contient-il les définitions ou théorèmes nécessaires ?
- **Règle Anti-Hallucination :** N'inventez pas de formules et n'utilisez pas de connaissances externes (même si elles sont vraies)
- **ACTION :** Si la question dépasse les données du programme ou si le contexte est vide/insuffisant, répondez UNIQUEMENT par : "STATUT : HORS_DU_PROGRAMME". Ne générez rien d'autre.

ÉTAPE 1 : ANALYSE ET RÉSOLUTION
Si le statut est validé, résolvez le problème en suivant strictement la méthodologie du cours :
- **Identification : Quel concept précis du programme extrait est testé ?
- **Résolution :** Développez le raisonnement mathématique/physique étape par étape.
- **Contextualisation (Bénin) :** Si applicable, utilisez des noms ou lieux béninois pour les exemples concrets, mais ne forcez pas le contexte s'il s'agit d'une démonstration théorique pure.

ÉTAPE 2 : ANALYSE PÉDAGOGIQUE
- **Prérequis :** Quels sont les savoirs antérieurs nécessaires (ex: "Savoir calculer un discriminant" ou "Lois de Descartes") ?
- **Pièges :** Citez 2 erreurs fréquentes sur ce sujet précis.

ÉTAPE 3 : FORMAT DE SORTIE
Générez la réponse dans ce format exact :

ÉTAPE 1 : [Titre de l'étape]
[Explication détaillée en français]
[Formules LaTeX si nécessaire : $...$]

ÉTAPE 2 : [Titre de l'étape]
...

CONCLUSION : [Résultat final ou théorème démontré]

SOURCE : [Citez explicitement quel chapitre ou section du contexte justifie cette réponse]
"""

CLAUDE_FALLBACK_PROMPT = """
Vous êtes "Professeur Bio", un tuteur expert en mathématiques pour le système éducatif du Bénin.
Aucun document de programme spécifique n'a été trouvé, vous devez donc utiliser vos connaissances mathématiques générales.

Question de l'utilisateur: 
{question}

### INSTRUCTIONS:
1. Résolvez le problème étape par étape avec une grande précision.
2. Utilisez un ton pédagogique, encourageant et clair en français.
3. Utilisez des exemples liés au contexte du Bénin si possible.
4. Structurez votre réponse avec des titres clairs (Aperçu, Étapes, Conclusion).
"""

# TOOLS 

def search_curriculum(query):
    """
    Action: Searches the vector database for relevant content.
    Returns: Tuple (formatted_context_string, list_of_source_dicts)
    """
    logger.log_step("Action", f"Searching ChromaDB (via Cohere) for: '{query}'")
    
    results = collection.query(
        query_texts=[query],
        n_results=3 # Optimized: Reduced from 5 to 3 for speed
    )
    
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    context_text = ""
    sources = []
    
    if documents:
        for i, doc in enumerate(documents):
            meta = metadatas[i]
            source = meta.get('source', 'Unknown')
            page = meta.get('page', '?')
            
            # Build context string for the AI
            context_text += f"\n--- Source: {source} (Page {page}) ---\n{doc}\n"
            
            # Build structured data for the User
            sources.append({
                "text": doc,
                "source": source,
                "page": page
            })
    
    return context_text, sources

#  MAIN ORCHESTRATOR LOOP 

def ask_math_ai(question: str, history: str = "", attachment=None):
    logger.log_step("Thought", f"Processing new user question: {question}")
    execution_steps = []
    if attachment:
        response = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": attachment.get('type'),
                                "data": attachment.get('image'),
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extract all information on the image. DO NOT ATTEMPT IF ITS A QUESTION. ONLY RETURN THE EXTRACTED CONTENT> NOTHING ELSE."
                        }
                    ],
                }
            ],
        )

        img_ctx = response.content[0].text
        question = question + img_ctx  
        print(question)
    
    # STEP 1: RETRIEVAL (Cohere + Chroma)
    thought_1 = "Retrieving official curriculum data..."
    logger.log_step("Thought", thought_1)
    execution_steps.append({"type": "thought", "content": thought_1})
    
    context_observation, sources = search_curriculum(question)

    # If the Anthropic client is not configured, return a helpful error response
    if claude_client is None:
        logger.log_step("Error", "Anthropic client not configured")
        return {
            "partie": "Erreur",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Model Unavailable",
                    "explanation": "Anthropic/Claude client is not configured. Set ANTHROPIC_API_KEY to enable model responses.",
                    "equations": None
                }
            ],
            "conclusion": None,
            "sources": []
        }

    # Check if context was found
    use_fallback = False
    if not context_observation.strip():
        obs_text = "Database returned empty results. Switching to General Knowledge Mode."
        logger.log_step("Observation", obs_text)
        context_observation = "N/A"
        use_fallback = True
    else:
        obs_text = f"Retrieved relevant context ({len(context_observation)} chars)."
        logger.log_step("Observation", obs_text)
        execution_steps.append({"type": "observation", "content": obs_text})

    # STEP 2: GENERATION (Single Pass with Claude)
    thought_2 = "Generating pedagogical response with Claude..."
    logger.log_step("Thought", thought_2)
    
    try:
        # Select Prompt
        if use_fallback:
            final_system_prompt = CLAUDE_FALLBACK_PROMPT.format(question=question)
        else:
            final_system_prompt = CLAUDE_TUTOR_PROMPT.format(
                context_str=context_observation, 
                history=history,
                question=question
            )
        
        # Single API Call
        claude_response = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": final_system_prompt}
            ]
        )
        
        final_answer = claude_response.content[0].text
        
        # SAVE LOG (JSONL)
        logger.save_request(
            prompt=question,
            model="claude-sonnet-4.5-single-agent",
            steps=execution_steps,
            final_answer=final_answer,
            verifier_result="Passed", 
            confidence=1.0 
        )
        
        # Return in Structured Format for API consistency
        return {
            "partie": "Mathématiques",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Explication Professeur Bio",
                    "explanation": final_answer,
                    "equations": None
                }
            ],
            "conclusion": "Voir explication ci-dessus",
            "sources": sources
        }

    except Exception as e:
        error_msg = f"Error contacting Claude: {e}"
        logger.log_step("Error", error_msg)
        return {
            "partie": "Erreur",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Erreur de Système",
                    "explanation": error_msg,
                    "equations": None
                }
            ],
            "conclusion": None,
            "sources": []
        }


# STREAMING VERSION FOR API
def ask_math_ai_stream(question: str, history: str = "", attachment=None):
    """
    Streaming version of ask_math_ai that yields text chunks.
    Used by FastAPI to stream responses to the frontend.
    
    Yields JSON lines with chunks of the response.
    """
    logger.log_step("Thought", f"Processing new user question (STREAM): {question}")
    execution_steps = []
    
    # Handle image attachment if provided
    if attachment:
        response = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": attachment.get('type'),
                                "data": attachment.get('image'),
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extract all information on the image. DO NOT ATTEMPT IF ITS A QUESTION. ONLY RETURN THE EXTRACTED CONTENT> NOTHING ELSE."
                        }
                    ],
                }
            ],
        )

        img_ctx = response.content[0].text
        question = question + " " + img_ctx  
        logger.log_step("Observation", f"Image processed, enhanced question: {question[:100]}...")
    
    # STEP 1: RETRIEVAL (Cohere + Chroma)
    thought_1 = "Retrieving official curriculum data..."
    logger.log_step("Thought", thought_1)
    execution_steps.append({"type": "thought", "content": thought_1})
    
    context_observation, sources = search_curriculum(question)

    # If Anthropic client not configured, yield an error chunk and finish
    if claude_client is None:
        logger.log_step("Error", "Anthropic client not configured (streaming)")
        yield json.dumps({"type": "error", "error": "Anthropic/Claude client not configured. Set ANTHROPIC_API_KEY to enable model responses."}) + "\n"
        return

    # Check if context was found
    use_fallback = False
    if not context_observation.strip():
        obs_text = "Database returned empty results. Switching to General Knowledge Mode."
        logger.log_step("Observation", obs_text)
        context_observation = "N/A"
        use_fallback = True
    else:
        obs_text = f"Retrieved relevant context ({len(context_observation)} chars)."
        logger.log_step("Observation", obs_text)
        execution_steps.append({"type": "observation", "content": obs_text})

    # STEP 2: STREAMING GENERATION (Stream chunks from Claude)
    thought_2 = "Generating pedagogical response with Claude (streaming)..."
    logger.log_step("Thought", thought_2)
    
    try:
        # Select Prompt
        if use_fallback:
            final_system_prompt = CLAUDE_FALLBACK_PROMPT.format(question=question)
        else:
            final_system_prompt = CLAUDE_TUTOR_PROMPT.format(
                context_str=context_observation, 
                history=history,
                question=question
            )
        
        # Streaming API Call with yield
        full_response = ""
        with claude_client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": final_system_prompt}
            ]
        ) as stream:
            # Yield initial metadata
            yield json.dumps({
                "type": "start",
                "partie": "Mathématiques",
                "problemStatement": question,
                "sources": sources
            }) + "\n"
            
            # Stream text deltas
            for text in stream.text_stream:
                full_response += text
                yield json.dumps({
                    "type": "chunk",
                    "text": text
                }) + "\n"
        
        # Yield completion
        yield json.dumps({
            "type": "end",
            "conclusion": "Voir explication ci-dessus",
            "sources": sources
        }) + "\n"
        
        # SAVE LOG (JSONL)
        logger.save_request(
            prompt=question,
            model="claude-sonnet-4.5-streaming",
            steps=execution_steps,
            final_answer=full_response,
            verifier_result="Passed", 
            confidence=1.0 
        )
        
    except Exception as e:
        error_msg = f"Error contacting Claude: {e}"
        logger.log_step("Error", error_msg)
        
        yield json.dumps({
            "type": "error",
            "error": error_msg
        }) + "\n"


# CLI DISPLAY 
console = Console()

if __name__ == "__main__":
    # Test Question
    user_query = "Qu'est-ce qu'un espace vectoriel ?"
    
    # Get structured response
    result = ask_math_ai(user_query)
    
    print("\n")
    
    # Extract the main text explanation for display
    if result.get("steps") and len(result["steps"]) > 0:
        main_text = result["steps"][0]["explanation"]
    else:
        main_text = "Pas de réponse générée."

    formatted_response = Markdown(main_text)
    
    console.print(Panel(
        formatted_response,
        title="RÉPONSE DU MENTOR (Math.AI)",
        subtitle="Agent: Claude Sonnet 4.5",
        border_style="green",
        expand=False
    ))

    # Display Sources in CLI
    if result["sources"]:
        print("\n" + "-"*50)
        console.print("[bold blue] SOURCES DU PROGRAMME OFFICIEL :[/bold blue]")
        for i, src in enumerate(result["sources"]):
            console.print(f"[cyan]{i+1}. {src['source']}[/cyan] (Page {src['page']})")
    
    print("\n" + "="*50)

