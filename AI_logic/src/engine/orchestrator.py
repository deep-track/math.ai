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
                return [[0.0] for _ in input]
            response = self.client.embed(
                texts=input,
                model="embed-multilingual-v3.0",
                input_type="search_query" 
            )
            return response.embeddings
else:
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

# IMAGE OCR PROMPT - extracts ALL content unconditionally
IMAGE_OCR_PROMPT = """Transcribe everything visible in this image with complete accuracy.

Include ALL of the following if present:
- Every word of text, exactly as written
- All mathematical expressions, equations, and formulas (use standard notation)
- Numbers, variables, symbols, operators
- Diagrams described in words (e.g. "Triangle ABC with angle A = 30°")
- Table contents row by row
- Any labels, captions, or annotations
- Instructions or problem statements

Output ONLY the raw transcribed content. No commentary, no preamble, no "I see..." — just the content itself."""

# UNIFIED PROMPT (LOGIC + PEDAGOGY IN ONE)
CLAUDE_TUTOR_PROMPT = """Vous êtes **Professeur Bio**, tuteur expert en mathématiques et physique pour le système éducatif du Bénin.

Votre base de connaissances couvre les deux modules officiels suivants :
1. **MTH1122 — Analyse (Fonction d'une variable réelle)**
   Topologie de ℝ, Suites & Séries, Limites, Continuité, Dérivabilité, Théorèmes (Rolle, TAF), Développements limités (Taylor), Fonctions usuelles et réciproques.
2. **Physique — Optique Géométrique**
   Propagation de la lumière, Réflexion/Réfraction, Prismes, Dispersion, Dioptres, Miroirs, Lentilles minces, Instruments d'optique.

---
{image_summary_section}
**Question de l'élève :**
{question}

**Contexte extrait du programme officiel (PDF) :**
{context_str}

---
### PROTOCOLE DE RÉPONSE

**ÉTAPE 0 — VÉRIFICATION DU PÉRIMÈTRE**
Si la question ne relève d'aucun des deux modules ET que le contexte est vide, répondez uniquement :
`STATUT: HORS_DU_PROGRAMME`
Sinon, continuez.

**ÉTAPE 1 — RÉSOLUTION RIGOUREUSE**
- Identifiez le concept précis du module concerné.
- Développez le raisonnement mathématique/physique **étape par étape**, sans sauter d'étape.
- Appuyez-vous sur le contexte fourni ; n'inventez pas de formules absentes du programme.
- Utilisez des exemples avec des noms ou lieux béninois si cela enrichit la compréhension.

**ÉTAPE 2 — ENCADREMENT PÉDAGOGIQUE**
- **Prérequis :** listez les savoirs antérieurs indispensables.
- **Erreurs fréquentes :** citez 2 pièges classiques sur ce sujet.

**ÉTAPE 3 — FORMAT DE SORTIE OBLIGATOIRE**

## {module_name}

### Analyse du problème
[Reformulation claire de ce qui est demandé]

### Résolution
**Étape 1 — [Titre]**
[Explication + formules LaTeX inline $...$ ou display $$...$$]

**Étape 2 — [Titre]**
...

### ✅ Conclusion
[Résultat final encadré ou théorème démontré]

### 📚 Prérequis & Pièges
- **Prérequis :** ...
- **Erreur fréquente 1 :** ...
- **Erreur fréquente 2 :** ...

**Source :** [Chapitre/section du contexte justifiant la réponse]
"""

CLAUDE_FALLBACK_PROMPT = """Vous êtes **Professeur Bio**, tuteur expert en mathématiques pour le système éducatif du Bénin.

{image_summary_section}
**Question de l'élève :**
{question}

Aucun document de programme spécifique n'a été trouvé pour cette question. Utilisez vos connaissances mathématiques générales.

### INSTRUCTIONS
1. Résolvez le problème **étape par étape** avec une grande précision.
2. Utilisez un ton pédagogique, encourageant et clair **en français**.
3. Structurez avec des titres clairs.
4. Utilisez LaTeX pour les formules : inline $...$ ou display $$...$$
5. Si possible, contextualisez avec des exemples béninois.

## Résolution

### Analyse du problème
[Ce qui est demandé]

### Résolution étape par étape
...

### ✅ Conclusion
[Résultat final]

### 📚 Points clés à retenir
...
"""

# TOOLS 

def search_curriculum(query):
    """
    Action: Searches the vector database for relevant content.
    Returns: Tuple (formatted_context_string, list_of_source_dicts)
    """
    if collection is None:
        logger.log_step("Warning", "ChromaDB collection not available — skipping search")
        return "", []

    logger.log_step("Action", f"Searching ChromaDB (via Cohere) for: '{query}'")
    
    results = collection.query(
        query_texts=[query],
        n_results=3
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
            context_text += f"\n--- Source: {source} (Page {page}) ---\n{doc}\n"
            sources.append({
                "text": doc,
                "source": source,
                "page": page
            })
    
    return context_text, sources


def extract_image_content(attachment) -> tuple[str, str]:
    """
    Extract text/content from an image using Claude vision.
    Returns: (raw_extracted_text, formatted_summary_section_for_prompt)
    """
    if not attachment or not claude_client:
        return "", ""
    
    logger.log_step("Action", "Extracting content from image via Claude vision...")
    
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
                        "text": IMAGE_OCR_PROMPT
                    }
                ],
            }
        ],
    )
    
    extracted = response.content[0].text.strip()
    logger.log_step("Observation", f"Image content extracted ({len(extracted)} chars): {extracted[:100]}...")
    
    # Build a clearly marked section for the main prompt
    summary_section = f"""**📷 Contenu de l'image soumise par l'élève :**
```
{extracted}
```
*(Le professeur doit commencer sa réponse par une reformulation concise de ce contenu avant de résoudre.)*

"""
    return extracted, summary_section


#  MAIN ORCHESTRATOR LOOP 

def ask_math_ai(question: str, history: str = "", attachment=None):
    logger.log_step("Thought", f"Processing new user question: {question}")
    execution_steps = []

    # Extract image content if provided
    image_summary_section = ""
    if attachment:
        img_text, image_summary_section = extract_image_content(attachment)
        if img_text:
            # Append extracted content to question for retrieval
            question = (question + "\n" + img_text).strip() if question else img_text
            print(f"[INFO] Enhanced question with image content: {question[:200]}")
    
    # STEP 1: RETRIEVAL (Cohere + Chroma)
    thought_1 = "Retrieving official curriculum data..."
    logger.log_step("Thought", thought_1)
    execution_steps.append({"type": "thought", "content": thought_1})
    
    context_observation, sources = search_curriculum(question)

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

    thought_2 = "Generating pedagogical response with Claude..."
    logger.log_step("Thought", thought_2)
    
    try:
        if use_fallback:
            final_system_prompt = CLAUDE_FALLBACK_PROMPT.format(
                question=question,
                image_summary_section=image_summary_section
            )
        else:
            final_system_prompt = CLAUDE_TUTOR_PROMPT.format(
                context_str=context_observation, 
                history=history,
                question=question,
                image_summary_section=image_summary_section,
                module_name="Mathématiques / Physique"
            )
        
        claude_response = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": final_system_prompt}
            ]
        )
        
        final_answer = claude_response.content[0].text
        
        logger.save_request(
            prompt=question,
            model="claude-sonnet-4.5-single-agent",
            steps=execution_steps,
            final_answer=final_answer,
            verifier_result="Passed", 
            confidence=1.0 
        )
        
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
    Streaming version of ask_math_ai that yields NDJSON lines.
    Used by FastAPI to stream SSE responses to the frontend.
    """
    logger.log_step("Thought", f"Processing new user question (STREAM): {question}")
    execution_steps = []

    # Extract image content if provided
    image_summary_section = ""
    if attachment:
        img_text, image_summary_section = extract_image_content(attachment)
        if img_text:
            question = (question + "\n" + img_text).strip() if question else img_text
            logger.log_step("Observation", f"Image processed, enhanced question: {question[:150]}...")

    # STEP 1: RETRIEVAL (Cohere + Chroma)
    thought_1 = "Retrieving official curriculum data..."
    logger.log_step("Thought", thought_1)
    execution_steps.append({"type": "thought", "content": thought_1})
    
    context_observation, sources = search_curriculum(question)

    if claude_client is None:
        logger.log_step("Error", "Anthropic client not configured (streaming)")
        yield json.dumps({"type": "error", "error": "Anthropic/Claude client not configured. Set ANTHROPIC_API_KEY."}) + "\n"
        return

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

    thought_2 = "Generating pedagogical response with Claude (streaming)..."
    logger.log_step("Thought", thought_2)
    
    try:
        if use_fallback:
            final_system_prompt = CLAUDE_FALLBACK_PROMPT.format(
                question=question,
                image_summary_section=image_summary_section
            )
        else:
            final_system_prompt = CLAUDE_TUTOR_PROMPT.format(
                context_str=context_observation, 
                history=history,
                question=question,
                image_summary_section=image_summary_section,
                module_name="Mathématiques / Physique"
            )
        
        full_response = ""
        with claude_client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": final_system_prompt}
            ]
        ) as stream:
            # Yield initial metadata — frontend uses 'metadata' key
            yield json.dumps({
                "metadata": {
                    "partie": "Mathématiques",
                    "problemStatement": question,
                    "sources": sources
                }
            }) + "\n"
            
            # Stream text tokens — frontend listens for 'token' key
            for text in stream.text_stream:
                full_response += text
                yield json.dumps({"token": text}) + "\n"
        
        # Signal completion — frontend listens for 'done' key
        yield json.dumps({
            "done": True,
            "conclusion": "Voir explication ci-dessus",
            "sources": sources
        }) + "\n"
        
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
        yield json.dumps({"error": error_msg}) + "\n"


# CLI DISPLAY 
console = Console()

if __name__ == "__main__":
    user_query = "Qu'est-ce qu'un espace vectoriel ?"
    
    result = ask_math_ai(user_query)
    
    print("\n")
    
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

    if result["sources"]:
        print("\n" + "-"*50)
        console.print("[bold blue] SOURCES DU PROGRAMME OFFICIEL :[/bold blue]")
        for i, src in enumerate(result["sources"]):
            console.print(f"[cyan]{i+1}. {src['source']}[/cyan] (Page {src['page']})")
    
    print("\n" + "="*50)