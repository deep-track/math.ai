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
    print("[WARN] cohere not available:", e)
    cohere = None
    COHERE_AVAILABLE = False

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from src.utils.logger import AgentLogger

load_dotenv()
VERBOSE_MODE = os.getenv("VERBOSE", "True").lower() == "true"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.path.exists("/opt/render/project"):
    CHROMA_DB_DIR = "/opt/render/project/chroma_db"
    print(f"[CONFIG] Using Render persistent disk: {CHROMA_DB_DIR}")
else:
    CHROMA_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
    print(f"[CONFIG] Using local disk: {CHROMA_DB_DIR}")

logger = AgentLogger(verbose=VERBOSE_MODE)

# ── Clients ───────────────────────────────────────────────────────────────────

anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
claude_client = None
if anthropic_api_key:
    try:
        claude_client = Anthropic(api_key=anthropic_api_key)
    except Exception as e:
        print("[WARN] Failed to initialize Anthropic client:", e)
else:
    print("WARNING: ANTHROPIC_API_KEY not found.")

cohere_api_key = os.getenv("COHERE_API_KEY")
co_client = None
if not COHERE_AVAILABLE:
    print("WARNING: Cohere library unavailable.")
elif not cohere_api_key:
    print("WARNING: COHERE_API_KEY not found.")
else:
    co_client = cohere.Client(api_key=cohere_api_key)

# ── ChromaDB ──────────────────────────────────────────────────────────────────

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

collection = None
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
else:
    print("[WARN] ChromaDB or Cohere not available — search disabled.")

# ── Prompts ───────────────────────────────────────────────────────────────────

IMAGE_OCR_PROMPT = """Transcribe EVERYTHING visible in this image with complete accuracy.

Include ALL of the following if present:
- Every word of text, exactly as written
- All mathematical expressions, equations, and formulas (use standard LaTeX notation)
- Numbers, variables, symbols, operators, indices, exponents
- Diagrams described precisely in words (e.g. "Triangle ABC with angle A = 30°, BC = 5cm")
- Table contents row by row with headers
- Any labels, captions, units, annotations
- Instructions, question numbers, and sub-parts (a), b), c)...)

Output ONLY the raw transcribed content. No commentary, no "I see...", no preamble."""

# ═════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT — concise tutoring style
# ═════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Tu es **Professeur Bio**, tuteur IA pour les étudiants de l'Université du Bénin (L1/L2).

## RÈGLE PRINCIPALE : Sois BREF et DIRECT.
- Réponds en quelques lignes maximum, sauf si l'élève demande plus de détails.
- Pas de longs développements ni de structures rigides à chaque fois.
- Va droit au but : donne la réponse, explique l'essentiel, c'est tout.
- Utilise LaTeX pour les formules : inline $...$ ou display $$...$$
- Toujours en français, ton simple et encourageant.
- Termine par une courte question de vérification ❓ si utile.

## TES RESSOURCES
Tu as accès à des documents du programme (MTH1220, MTH1122, PHY1223).
- Si le contexte fourni est pertinent → utilise-le et mentionne la source brièvement.
- Sinon → réponds avec tes connaissances. Pas de restrictions.

## CE QU'IL NE FAUT PAS FAIRE
- ❌ Ne répète pas la question en entier
- ❌ Pas de sections "Étape 0, Étape 1, Étape 2..." systématiques
- ❌ Pas de titres et sous-titres inutiles
- ❌ Ne liste pas les "prérequis" et "erreurs classiques" à chaque réponse
- ❌ Pas de blocs de code formatés pour les réponses normales"""

# ── Tutor prompt template ────────────────────────────────────────────────────

TUTOR_PROMPT = """## CONTEXTE DU PROGRAMME
{context_str}

---
{image_section}
## QUESTION
{question}

---
Réponds de façon **courte et claire**. Si le contexte est pertinent, utilise-le. Sinon, réponds avec tes connaissances.
{image_recap_instruction}
Donne la réponse directement, avec les formules LaTeX nécessaires. Sois concis."""

# ── Tools ─────────────────────────────────────────────────────────────────────

def search_curriculum(query: str) -> tuple[str, list]:
    """Search ChromaDB for relevant curriculum content."""
    if collection is None:
        logger.log_step("Warning", "ChromaDB not available — skipping search")
        return "", []

    logger.log_step("Action", f"Searching ChromaDB for: '{query[:80]}'")
    try:
        results = collection.query(query_texts=[query], n_results=4)
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results.get("distances", [[]])[0]
    except Exception as e:
        print(f"[WARN] ChromaDB query failed: {e}")
        return "", []

    context_text = ""
    sources = []

    for i, doc in enumerate(documents):
        meta = metadatas[i]
        source = meta.get("source", "Unknown")
        page = meta.get("page", "?")
        distance = distances[i] if distances else None

        if distance is not None and distance > 1.5:
            print(f"[SEARCH] Skipping low-relevance result (distance={distance:.3f}): {source}")
            continue

        context_text += f"\n--- {source} (p.{page}) ---\n{doc}\n"
        sources.append({"text": doc, "source": source, "page": page})

    if not context_text.strip():
        print("[SEARCH] No relevant curriculum content found for this query.")

    return context_text, sources


def extract_image_content(attachment: dict) -> tuple[str, str, str]:
    """
    OCR the uploaded image via Claude vision.
    Returns: (raw_text, image_section_for_prompt, image_recap_instruction)
    """
    if not attachment or not claude_client:
        return "", "", ""

    logger.log_step("Action", "Running OCR on uploaded image...")
    try:
        response = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": attachment.get("type"),
                            "data": attachment.get("image"),
                        },
                    },
                    {"type": "text", "text": IMAGE_OCR_PROMPT}
                ],
            }]
        )
        extracted = response.content[0].text.strip()
    except Exception as e:
        print(f"[WARN] OCR failed: {e}")
        return "", "", ""

    logger.log_step("Observation", f"OCR: {len(extracted)} chars — {extracted[:100]}...")

    image_section = f"""## 📷 CONTENU DE L'IMAGE (OCR)
```
{extracted}
```
"""
    image_recap_instruction = (
        "Si une image est fournie, commence par une ligne confirmant ce que tu as lu "
        "dans l'image (ex : « J'ai bien lu : [résumé du problème] »), puis résous directement."
    )

    return extracted, image_section, image_recap_instruction


def _build_prompt(
    question: str,
    context_observation: str,
    image_section: str,
    image_recap_instruction: str,
) -> str:
    """Assemble the user-turn prompt."""
    if not image_recap_instruction:
        image_recap_instruction = ""

    return TUTOR_PROMPT.format(
        context_str=context_observation if context_observation.strip() else "Aucun contenu pertinent trouvé.",
        question=question,
        image_section=image_section,
        image_recap_instruction=image_recap_instruction,
    )


# ── Main orchestrator ─────────────────────────────────────────────────────────

def ask_math_ai(question: str, history: str = "", attachment=None) -> dict:
    logger.log_step("Thought", f"Processing: {question[:80]}")
    execution_steps = []

    image_section = ""
    image_recap_instruction = ""
    search_query = question

    if attachment:
        img_text, image_section, image_recap_instruction = extract_image_content(attachment)
        if img_text:
            search_query = (question + "\n" + img_text).strip() if question.strip() else img_text

    context_observation, sources = search_curriculum(search_query)

    if claude_client is None:
        return {
            "partie": "Erreur", "problemStatement": question,
            "steps": [{"title": "Unavailable",
                        "explanation": "ANTHROPIC_API_KEY non configuré.", "equations": None}],
            "conclusion": None, "sources": []
        }

    if context_observation.strip():
        logger.log_step("Observation", f"Context found ({len(context_observation)} chars)")
        execution_steps.append({"type": "observation", "content": "Context retrieved"})
    else:
        logger.log_step("Observation", "No relevant context — model will use general knowledge")

    prompt = _build_prompt(question, context_observation, image_section, image_recap_instruction)

    try:
        resp = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )
        final_answer = resp.content[0].text

        logger.save_request(
            prompt=question, model="claude-sonnet-4.5",
            steps=execution_steps, final_answer=final_answer,
            verifier_result="Passed", confidence=1.0
        )

        return {
            "partie": "Mathématiques / Physique",
            "problemStatement": question,
            "steps": [{"title": "Explication Professeur Bio",
                        "explanation": final_answer, "equations": None}],
            "conclusion": "Voir explication ci-dessus",
            "sources": sources
        }
    except Exception as e:
        error_msg = f"Erreur Claude: {e}"
        logger.log_step("Error", error_msg)
        return {
            "partie": "Erreur", "problemStatement": question,
            "steps": [{"title": "Erreur", "explanation": error_msg, "equations": None}],
            "conclusion": None, "sources": []
        }


def ask_math_ai_stream(question: str, history: str = "", attachment=None):
    """Streaming version — yields NDJSON: metadata / token / done / error."""
    logger.log_step("Thought", f"Processing (stream): {question[:80]}")
    execution_steps = []

    image_section = ""
    image_recap_instruction = ""
    search_query = question

    if attachment:
        img_text, image_section, image_recap_instruction = extract_image_content(attachment)
        if img_text:
            search_query = (question + "\n" + img_text).strip() if question.strip() else img_text
            logger.log_step("Observation", f"OCR done, search query: {search_query[:100]}")

    context_observation, sources = search_curriculum(search_query)

    if claude_client is None:
        yield json.dumps({"error": "ANTHROPIC_API_KEY non configuré."}) + "\n"
        return

    if context_observation.strip():
        logger.log_step("Observation", f"Context found ({len(context_observation)} chars)")
        execution_steps.append({"type": "observation", "content": "Context retrieved"})
    else:
        logger.log_step("Observation", "No relevant context — model will use general knowledge")

    prompt = _build_prompt(question, context_observation, image_section, image_recap_instruction)

    try:
        yield json.dumps({
            "metadata": {
                "partie": "Mathématiques / Physique",
                "problemStatement": question,
                "sources": sources
            }
        }) + "\n"

        full_response = ""
        with claude_client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                yield json.dumps({"token": text}) + "\n"

        yield json.dumps({
            "done": True,
            "conclusion": "Voir explication ci-dessus",
            "sources": sources
        }) + "\n"

        logger.save_request(
            prompt=question, model="claude-sonnet-4.5-stream",
            steps=execution_steps, final_answer=full_response,
            verifier_result="Passed", confidence=1.0
        )

    except Exception as e:
        error_msg = f"Erreur Claude: {e}"
        logger.log_step("Error", error_msg)
        yield json.dumps({"error": error_msg}) + "\n"


# ── CLI ───────────────────────────────────────────────────────────────────────

console = Console()

if __name__ == "__main__":
    user_query = "Démontrer que la fonction f(x) = x² est dérivable en tout point de ℝ."
    result = ask_math_ai(user_query)
    main_text = result["steps"][0]["explanation"] if result.get("steps") else "Pas de réponse."
    console.print(Panel(
        Markdown(main_text),
        title="PROFESSEUR BIO",
        subtitle="Claude Sonnet 4.5 — MTH1122/MTH1220/PHY1223",
        border_style="green"
    ))
    if result.get("sources"):
        for i, src in enumerate(result["sources"]):
            console.print(f"[cyan]{i+1}. {src['source']} (p.{src['page']})[/cyan]")
