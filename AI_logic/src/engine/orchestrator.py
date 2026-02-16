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

# ── Clients ──────────────────────────────────────────────────────────────────

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

# ── ChromaDB ─────────────────────────────────────────────────────────────────

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

# ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
# Key design decisions:
#   1. ROLE CLARITY: The AI knows exactly who it is and what it can/cannot do.
#   2. MANDATORY IMAGE RECAP: Always restate image content so student can verify OCR.
#   3. STRUCTURED OUTPUT: Consistent format trains students to expect clarity.
#   4. SOCRATIC NUDGE: Ends with a check question to verify understanding.
#   5. ANTI-HALLUCINATION: Explicit rule to only use curriculum context.
#   6. LATEX ALWAYS: Forces proper math rendering in the frontend.
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu es **Professeur Bio**, tuteur IA expert et bienveillant pour les étudiants du Bénin.

## TON IDENTITÉ
- Tu parles TOUJOURS en français, avec un ton chaleureux et encourageant.
- Tu t'adresses directement à l'élève (« tu » ou « vous »).
- Tu adaptes ta complexité au niveau apparent de la question.
- Tu n'inventes JAMAIS de formules : tu n'utilises que ce qui est dans le contexte du programme ou ta base de connaissances vérifiée.

## TES MODULES
Tu maîtrises exclusivement ces deux programmes officiels :
1. **MTH1122 — Analyse (Fonction d'une variable réelle)**
   Topologie de ℝ · Suites & Séries numériques · Limites · Continuité · Dérivabilité
   Théorèmes (Rolle, TAF, Valeur intermédiaire) · Développements limités (Taylor/Mac-Laurin)
   Fonctions usuelles et réciproques (exp, ln, sin, cos, arctan…)

2. **PHY — Optique Géométrique**
   Propagation rectiligne de la lumière · Réflexion & Réfraction (lois de Snell-Descartes)
   Prismes & Dispersion · Dioptres plans et sphériques · Miroirs plans et sphériques
   Lentilles minces (convergentes/divergentes) · Instruments d'optique (Loupe, Microscope, Lunette)"""

TUTOR_PROMPT = """## CONTEXTE DU PROGRAMME (extrait PDF officiel)
{context_str}

---
{image_section}
## QUESTION DE L'ÉLÈVE
{question}

---
## PROTOCOLE DE RÉPONSE — SUIS CES ÉTAPES DANS L'ORDRE

### ÉTAPE 0 — RÉCAPITULATIF DE L'IMAGE (si image fournie)
{image_recap_instruction}

### ÉTAPE 1 — VÉRIFICATION DU PÉRIMÈTRE
- La question concerne-t-elle MTH1122 ou l'Optique Géométrique ?
- Le contexte PDF contient-il les éléments nécessaires ?
- ⚠️ Si hors programme ET contexte vide → réponds UNIQUEMENT : `⛔ HORS PROGRAMME : [sujet détecté]`
- Sinon, continue.

### ÉTAPE 2 — ANALYSE DU PROBLÈME
Reformule brièvement ce que l'élève doit trouver. Identifie :
- Le **concept clé** testé (ex : "Théorème de Rolle", "Loi de Snell-Descartes")
- Les **données** et **inconnues**
- La **stratégie de résolution**

### ÉTAPE 3 — RÉSOLUTION DÉTAILLÉE
Résous **étape par étape**, sans sauter d'étape. Pour chaque étape :
- Donne un **titre court** en gras
- Montre le **raisonnement complet**
- Écris toutes les formules en LaTeX : inline $...$ ou display $$...$$
- Justifie chaque transition (« car », « d'après le théorème de... », « en appliquant... »)

### ÉTAPE 4 — CONCLUSION
Encadre le résultat final clairement :
> **Résultat :** $[réponse]$ [unité si applicable]

### ÉTAPE 5 — CONSOLIDATION PÉDAGOGIQUE
- **Prérequis :** 2-3 notions qu'il faut maîtriser pour ce type de problème
- **Erreur classique 1 :** [piège fréquent]
- **Erreur classique 2 :** [piège fréquent]
- **Question de vérification :** Pose une question simple à l'élève pour tester sa compréhension

### FORMAT OBLIGATOIRE
```
## [Nom du module] — [Concept clé]

### 📋 Analyse
...

### 🔢 Résolution
**Étape 1 — [titre]**
...

### ✅ Conclusion
> **Résultat :** ...

### 📚 Pour aller plus loin
...

### ❓ Vérifie ta compréhension
...
```
"""

FALLBACK_PROMPT = """Tu es **Professeur Bio**, tuteur expert en mathématiques et physique pour les étudiants du Bénin.
{image_section}

## QUESTION DE L'ÉLÈVE
{question}

⚠️ Aucun document de programme spécifique trouvé. Utilise tes connaissances générales rigoureuses.

## PROTOCOLE DE RÉPONSE

{image_recap_instruction}

Résous ce problème en suivant ce format :

```
## [Domaine] — [Concept clé]

### 📋 Analyse du problème
[Ce qui est demandé, les données, la stratégie]

### 🔢 Résolution étape par étape
**Étape 1 — [titre]**
[raisonnement + LaTeX]

**Étape 2 — [titre]**
...

### ✅ Conclusion
> **Résultat :** $...$

### 📚 Points clés
- ...

### ❓ Vérifie ta compréhension
[question simple]
```

Règles :
- Toujours en français, ton encourageant
- LaTeX obligatoire pour toute formule ($...$ ou $$...$$)
- Exemples béninois si pertinent
"""

# ── Tools ─────────────────────────────────────────────────────────────────────

def search_curriculum(query: str) -> tuple[str, list]:
    """Search ChromaDB for relevant curriculum content."""
    if collection is None:
        logger.log_step("Warning", "ChromaDB not available — skipping search")
        return "", []

    logger.log_step("Action", f"Searching ChromaDB for: '{query[:80]}'")
    try:
        results = collection.query(query_texts=[query], n_results=3)
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
    except Exception as e:
        print(f"[WARN] ChromaDB query failed: {e}")
        return "", []

    context_text = ""
    sources = []
    for i, doc in enumerate(documents):
        meta = metadatas[i]
        source = meta.get("source", "Unknown")
        page = meta.get("page", "?")
        context_text += f"\n--- {source} (p.{page}) ---\n{doc}\n"
        sources.append({"text": doc, "source": source, "page": page})

    return context_text, sources


def extract_image_content(attachment: dict) -> tuple[str, str, str]:
    """
    Run OCR on the uploaded image via Claude vision.
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

    logger.log_step("Observation", f"OCR complete ({len(extracted)} chars): {extracted[:120]}...")

    # Section injected into the prompt so the model sees the image content
    image_section = f"""## 📷 CONTENU DE L'IMAGE (extrait OCR)
```
{extracted}
```
"""
    # Instruction telling the model to always recap the image first
    image_recap_instruction = (
        "**OBLIGATOIRE** : Commence ta réponse par une section '### 📷 Contenu de l'image' "
        "où tu reformules fidèlement le problème extrait de l'image, "
        "afin que l'élève puisse vérifier que la lecture est correcte. "
        "Si l'OCR semble incomplet, signale-le."
    )

    return extracted, image_section, image_recap_instruction


def _build_prompts(
    question: str,
    history: str,
    context_observation: str,
    use_fallback: bool,
    image_section: str,
    image_recap_instruction: str,
) -> str:
    """Build the final prompt string."""
    if not image_recap_instruction:
        image_recap_instruction = "*(Pas d'image fournie — ignore cette étape)*"

    if use_fallback:
        return FALLBACK_PROMPT.format(
            question=question,
            image_section=image_section,
            image_recap_instruction=image_recap_instruction,
        )
    return TUTOR_PROMPT.format(
        context_str=context_observation or "N/A",
        question=question,
        image_section=image_section,
        image_recap_instruction=image_recap_instruction,
        module_name="Mathématiques / Physique",
    )


# ── Main orchestrator ─────────────────────────────────────────────────────────

def ask_math_ai(question: str, history: str = "", attachment=None) -> dict:
    logger.log_step("Thought", f"Processing: {question[:80]}")
    execution_steps = []

    image_section = ""
    image_recap_instruction = ""
    if attachment:
        img_text, image_section, image_recap_instruction = extract_image_content(attachment)
        if img_text:
            question = (question + "\n" + img_text).strip() if question.strip() else img_text

    context_observation, sources = search_curriculum(question)

    if claude_client is None:
        return {
            "partie": "Erreur", "problemStatement": question,
            "steps": [{"title": "Unavailable", "explanation": "ANTHROPIC_API_KEY not configured.", "equations": None}],
            "conclusion": None, "sources": []
        }

    use_fallback = not context_observation.strip()
    if use_fallback:
        logger.log_step("Observation", "No curriculum context — using fallback")
    else:
        logger.log_step("Observation", f"Context retrieved ({len(context_observation)} chars)")
        execution_steps.append({"type": "observation", "content": "Context retrieved"})

    prompt = _build_prompts(question, history, context_observation, use_fallback, image_section, image_recap_instruction)

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
            "partie": "Mathématiques", "problemStatement": question,
            "steps": [{"title": "Explication Professeur Bio", "explanation": final_answer, "equations": None}],
            "conclusion": "Voir explication ci-dessus", "sources": sources
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
    """Streaming version — yields NDJSON lines with keys: metadata / token / done / error."""
    logger.log_step("Thought", f"Processing (stream): {question[:80]}")
    execution_steps = []

    image_section = ""
    image_recap_instruction = ""
    if attachment:
        img_text, image_section, image_recap_instruction = extract_image_content(attachment)
        if img_text:
            question = (question + "\n" + img_text).strip() if question.strip() else img_text
            logger.log_step("Observation", f"OCR appended, question now {len(question)} chars")

    context_observation, sources = search_curriculum(question)

    if claude_client is None:
        yield json.dumps({"error": "ANTHROPIC_API_KEY not configured."}) + "\n"
        return

    use_fallback = not context_observation.strip()
    if use_fallback:
        logger.log_step("Observation", "No curriculum context — using fallback")
    else:
        logger.log_step("Observation", f"Context retrieved ({len(context_observation)} chars)")
        execution_steps.append({"type": "observation", "content": "Context retrieved"})

    prompt = _build_prompts(question, history, context_observation, use_fallback, image_section, image_recap_instruction)

    try:
        # Emit metadata first so frontend can show sources immediately
        yield json.dumps({
            "metadata": {
                "partie": "Mathématiques",
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
    console.print(Panel(Markdown(main_text), title="PROFESSEUR BIO", subtitle="Claude Sonnet 4.5", border_style="green"))
    if result.get("sources"):
        for i, src in enumerate(result["sources"]):
            console.print(f"[cyan]{i+1}. {src['source']} (p.{src['page']})[/cyan]")