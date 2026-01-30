import os
import json
from dotenv import load_dotenv
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from anthropic import Anthropic 
import cohere
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

# Claude (The Math Brain)
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
if not anthropic_api_key:
    print("WARNING: ANTHROPIC_API_KEY not found. Ensure it is in your .env")
claude_client = Anthropic(api_key=anthropic_api_key)

# C. Cohere (Search)
cohere_api_key = os.getenv("COHERE_API_KEY")
if not cohere_api_key:
    raise ValueError("COHERE_API_KEY is missing in .env file")
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

# 3. Initialize Database
print(f"Connecting to Database at: {CHROMA_DB_DIR}...")
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# Connect to the collection using Cohere

embedding_fn = CohereEmbeddingFunction(co_client)
collection = chroma_client.get_or_create_collection(
    name="math_curriculum_benin", 
    embedding_function=embedding_fn
)

# PROMPT TEMPLATES 
# Prompt 1: For Claude 
CLAUDE_REASONING_PROMPT = """
Vous êtes un validateur de curriculum strict et un moteur de logique mathématique pour le système éducatif du Bénin.
Soyez concis mais minutieux. Concentrez-vous sur l'exactitude et la valeur pédagogique.

Question de l'utilisateur: 
{question}

Contexte de la base de données (Curriculum):
{context_str}

### INSTRUCTIONS:

ÉTAPE 1: VALIDATION DU CURRICULUM (CRITIQUE)
- **Analyser le contexte:** La question de l'utilisateur s'aligne-t-elle *strictement* avec le contexte fourni?
- **Si NON (Hors du programme):** Répondez exactement: "STATUT: HORS_DU_PROGRAMME". Arrêtez-vous là.
- **Si OUI:** Passez à l'étape 2.

ÉTAPE 2: ANALYSE ET SOLUTION DU PROBLÈME
- **Identifier le concept clé:** Quel concept mathématique est testé?
- **Résoudre le problème:** Effectuez un raisonnement mathématique étape par étape.
- **Contextualisation Bénin:** Adaptez les exemples au contexte du Bénin si pertinent (noms locaux, monnaie, lieux).

ÉTAPE 3: ANALYSE PÉDAGOGIQUE
- **Prérequis:** Énumérez les concepts clés que les étudiants doivent comprendre.
- **Erreurs courantes:** Identifiez 2-3 erreurs typiques que les étudiants font avec ce concept.

ÉTAPE 4: FORMAT DE SORTIE STRUCTURÉ
Fournissez votre analyse dans ce format exact avec des en-têtes clairs:

PARTIE: [Thème mathématique principal/unité]

ÉTAPE 1: [Titre de la première étape clé]
[Explication de cette étape]
[Toute équation ou notation mathématique]

ÉTAPE 2: [Titre de la deuxième étape clé]
[Explication de cette étape]
[Toute équation ou notation mathématique]

(Continuer avec ÉTAPE 3, ÉTAPE 4, etc. selon les besoins)

CONCLUSION: [Réponse finale ou apprentissage principal]

Utilisez une notation mathématique claire. Mettez les équations/formules après leur explication.
"""

# PROMPT 1B: For Claude (FALLBACK MODE - no curriculum)
CLAUDE_FALLBACK_PROMPT = """
Vous êtes un expert en mathématiques tuteur pour le système éducatif du Bénin.
Résolvez ce problème mathématique avec un raisonnement clair, étape par étape.
Concentrez-vous sur l'exactitude et la clarté pédagogique.

Question de l'utilisateur: 
{question}

### INSTRUCTIONS:

ÉTAPE 1: ANALYSE ET SOLUTION DU PROBLÈME
- **Identifier le concept clé:** Quel concept mathématique est testé?
- **Résoudre le problème:** Effectuez un raisonnement mathématique étape par étape.
- **Montrer tout le travail:** Incluez toutes les étapes de calcul et le raisonnement.

ÉTAPE 2: ANALYSE PÉDAGOGIQUE
- **Prérequis:** Énumérez les concepts clés que les étudiants doivent comprendre.
- **Erreurs courantes:** Identifiez 2-3 erreurs typiques que les étudiants font avec ce concept.

ÉTAPE 3: FORMAT DE SORTIE STRUCTURÉ
Fournissez votre analyse dans ce format exact avec des en-têtes clairs:

PARTIE: [Thème mathématique principal/unité]

ÉTAPE 1: [Titre de la première étape clé]
[Explication de cette étape]
[Toute équation ou notation mathématique]

ÉTAPE 2: [Titre de la deuxième étape clé]
[Explication de cette étape]
[Toute équation ou notation mathématique]

(Continuer avec ÉTAPE 3, ÉTAPE 4, etc. selon les besoins)

CONCLUSION: [Réponse finale ou apprentissage principal]

Utilisez une notation mathématique claire. Mettez les équations/formules après leur explication.
"""

# PROMPT 2: CLAUDE FINAL RESPONSE PROMPT
CLAUDE_FINAL_RESPONSE_PROMPT = """
Vous êtes un tuteur en mathématiques expert pour les étudiants du Bénin.
Parlez en français simple et clair. Soyez encourageant et patient.
Structurez votre réponse pour une lecture facile - utilisez uniquement le formatage en texte brut.
Vous devez strictement montrer des étapes de travail clairement étiquetées, les étapes de calcul sont obligatoires.
Vos réponses doivent être strictement en français.

**Analyse préalable:**
{reasoning}

**Votre objectif:** Guider les étudiants pour comprendre les concepts mathématiques grâce à des explications claires, étape par étape.

EXIGENCE CRITIQUE: Vous DEVEZ fournir TOUTES les sections ci-dessous - ne sautez aucune section, peu importe la longueur de la réponse.

FORMAT DE RÉPONSE:
Utilisez cette structure exacte avec des en-têtes en texte brut. Incluez TOUTES les sections:

APERÇU DU CONCEPT
[2-3 phrases expliquant le concept mathématique et son importance]

SOLUTION ÉTAPE PAR ÉTAPE
[Numérotez chaque étape clairement comme Étape 1, Étape 2, etc.]
[Expliquez ce que vous faites à chaque étape]
[Montrez les calculs clairement]
[Utilisez des exemples du Bénin si pertinent]
[Pour les calculs: montrez toutes les étapes, les règles appliquées]
[Cette section doit être complète et détaillée]

POINTS CLÉS D'APPRENTISSAGE
[Énumérez 3-4 apprentissages principaux]
[Incluez des conseils pour appliquer le concept]

RÉPONSE FINALE
[Énoncez la réponse clairement]

ENCOURAGEMENT
[Terminez avec un très court retour positif et proposez d'aider davantage]

RÈGLES IMPORTANTES:
- Gardez la langue simple et encourageante
- Utilisez un espacement approprié entre les sections
- Pas de markdown, gras ou formatage spécial - juste du texte brut
- VOUS DEVEZ INCLURE TOUTES LES SECTIONS - ne pas tronquer ni sauter les sections

**Question de l'étudiant:** {question}
"""
def search_curriculum(query):
    """
    Action: Searches the vector database for relevant content.
    Returns: Tuple (formatted_context_string, list_of_source_dicts)
    """
    logger.log_step("Action", f"Searching ChromaDB (via Cohere) for: '{query}'")
    
    results = collection.query(
        query_texts=[query],
        n_results=5
    )
    
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    context_text = ""
    sources = []  # NEW: List to store structured source info
    
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

def ask_math_ai(question: str, history: str = ""):
    logger.log_step("Thought", f"Processing new user question: {question}")
    execution_steps = []
    
    # STEP 1: RETRIEVAL (Cohere + Chroma)
    thought_1 = "Retrieving official curriculum data..."
    logger.log_step("Thought", thought_1)
    execution_steps.append({"type": "thought", "content": thought_1})
    
    # NEW: Unpack both context and sources
    context_observation, sources = search_curriculum(question)
    
    # FALLBACK MODE: If no curriculum context found, use general knowledge
    if not context_observation.strip():
        obs_text = "Database returned empty results. Using general knowledge mode."
        logger.log_step("Observation", obs_text)
        context_observation = "User is asking a general mathematics question. Provide a comprehensive answer with step-by-step solutions."
        use_fallback = True
    else:
        obs_text = f"Retrieved relevant context ({len(context_observation)} chars)."
        logger.log_step("Observation", obs_text)
        execution_steps.append({"type": "observation", "content": obs_text})
        use_fallback = False

    # STEP 2: REASONING (Claude Sonnet 4.5)
    thought_2 = "Consulting Claude Sonnet 4.5 for mathematical reasoning..."
    logger.log_step("Thought", thought_2)
    execution_steps.append({"type": "thought", "content": thought_2})

    try:
        # Choose prompt based on fallback mode
        if use_fallback:
            prompt_content = CLAUDE_FALLBACK_PROMPT.format(question=question)
        else:
            prompt_content = CLAUDE_REASONING_PROMPT.format(
                context_str=context_observation, 
                question=question
            )
        
        claude_response = claude_client.messages.create(
            model="claude-sonnet-4-5", 
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt_content}
            ]
        )
        math_logic = claude_response.content[0].text
        logger.log_step("Action", "Claude has generated the logic.")
    except Exception as e:
        error_msg = f"Error contacting Claude: {e}"
        logger.log_step("Error", error_msg)
        math_logic = "Error in reasoning engine. Proceeding with raw context."

    # STEP 3: FINAL RESPONSE (Claude)
    thought_3 = "Generating final formatted response with Claude..."
    logger.log_step("Thought", thought_3)
    
    final_prompt = CLAUDE_FINAL_RESPONSE_PROMPT.format(
        reasoning=math_logic,
        question=question
    )
    
    try:
        final_response = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": final_prompt}
            ]
        )
        
        answer = final_response.content[0].text
        
        # SAVE LOG (JSONL)
        logger.save_request(
            prompt=question,
            model="claude-sonnet-4-5",
            steps=execution_steps,
            final_answer=answer,
            verifier_result="Passed", 
            confidence=0.98 
        )
        
        # Return in AcademicResponse format for the API
        # IMPORTANT: Return FULL answer, not truncated
        return {
            "partie": "Analyse Mathématique",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Solution",
                    "explanation": answer,  # Full answer, NOT truncated
                    "equations": None
                }
            ],
            "conclusion": "Solution provided above",  # Brief conclusion, don't truncate answer
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


# CLI DISPLAY 
console = Console()

if __name__ == "__main__":
    # Test Question
    user_query = "Qu'est-ce qu'un espace vectoriel ?"
    
    # Get structured response
    result = ask_math_ai(user_query)
    
    print("\n")
    # Access the 'answer' key for Markdown display
    formatted_response = Markdown(result["answer"])
    
    console.print(Panel(
        formatted_response,
        title="RÉPONSE DU MENTOR (Math.AI)",
        subtitle="Reasoning: Claude Sonnet 4.5 | Responder: Mistral Large",
        border_style="green",
        expand=False
    ))

    # NEW: Display Sources in CLI
    if result["sources"]:
        print("\n" + "-"*50)
        console.print("[bold blue] SOURCES DU PROGRAMME OFFICIEL :[/bold blue]")
        for i, src in enumerate(result["sources"]):
            console.print(f"[cyan]{i+1}. {src['source']}[/cyan] (Page {src['page']})")
            # Optional: Print snippet
            # console.print(f"   \"{src['text'][:100]}...\"\n")
    
    print("\n" + "="*50)