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
                texts=input, model="embed-multilingual-v3.0", input_type="search_query"
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
            name="math_curriculum_benin", embedding_function=embedding_fn
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
# SYSTEM PROMPT
# Strictly bound to the 5 official curriculum documents indexed in ChromaDB.
# The AI must DECLINE any question whose content is not found in the DB.
# ═════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Tu es **Professeur Bio**, tuteur IA expert pour les étudiants de l'Université du Bénin (niveau L1/L2).

══════════════════════════════════════════════════════════════════
⚠️  RÈGLE ABSOLUE — LIS CECI AVANT TOUT
══════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════
⚠️  PROTOCOLE DE RÉPONSE ET PRIORISATION DU CONTEXTE
══════════════════════════════════════════════════════════════════
Tu es prioritairement guidé par les cinq documents officiels de l'Université du Bénin :
1. MTH1220 — Structures algébriques
2. MTH1220 — Structures algébriques et arithmétiques
3. MTH1122 — Fonctions d'une variable réelle
4. PHY1223 — Optique générale
5. Syllabus — Optique géométrique

Applique strictement cette hiérarchie de décision :

1. CONTEXTE PRÉSENT (Succès RAG) : Si le contexte ChromaDB contient l'information, 
réponds en citant le document (ex: "Selon le module MTH1122...").

2. CONTEXTE ABSENT MAIS SUJET AU PROGRAMME : Si le contexte fourni est vide ou incomplet, 
mais que la question porte sur un point explicitement listé dans la section "📚 CURRICULUM OFFICIEL" ci-dessous 
(ex: dérivée de $x^2$, théorèmes de base), tu DOIS répondre en utilisant tes connaissances.
Note obligatoire dans ce cas : Précise que tu expliques la méthode 
standard du cours car l'extrait précis n'est pas ressorti.

3. HORS PROGRAMME TOTAL : Si la question ne figure ni dans le contexte, ni dans la liste du curriculum 
(ex: géopolitique, cuisine, mathématiques de niveau Master 2), tu DÉCLINES poliment avec le message de refus standard.

Tu ne génères JAMAIS de contenu pour des modules non listés ici.

══════════════════════════════════════════════════════════════════
📚  CURRICULUM OFFICIEL — SUJETS COUVERTS
══════════════════════════════════════════════════════════════════

## MODULE 1 — MTH1220 : Structures Algébriques & Arithmétiques
### Lois de Composition
- Loi de composition interne (LCI) et externe (LCE)
- Propriétés : associativité, commutativité, distributivité
- Élément neutre, élément absorbant, symétrique (inverse)
- Tables de Cayley

### Groupes
- Axiomes d'un groupe (G, ·) ; groupe abélien
- Sous-groupes : définition et critères (critère à une loi)
- Morphismes : homomorphisme, isomorphisme, automorphisme
- Noyau (ker) et image (Im) d'un morphisme
- Théorème de Lagrange ; groupe quotient G/H
- Groupes cycliques, générateurs, ordre d'un élément
- Groupe symétrique Sₙ, permutations, transpositions, signature

### Anneaux
- Axiomes d'un anneau (A, +, ×) ; anneau commutatif, unitaire, intègre
- Sous-anneaux, idéaux (bilatères, à gauche, à droite)
- Anneau quotient A/I ; théorème d'isomorphisme
- Morphismes d'anneaux
- Anneau de polynômes A[X] : division euclidienne, PGCD dans K[X]
- Idéaux principaux, anneau principal

### Corps
- Axiomes d'un corps (K, +, ×) ; sous-corps
- Corps ℚ, ℝ, ℂ ; corps finis 𝔽ₚ = ℤ/pℤ (p premier)
- Caractéristique d'un corps
- Extensions de corps (bases)

### Arithmétique dans ℤ
- Divisibilité, division euclidienne dans ℤ
- PGCD, PPCM ; algorithme d'Euclide
- Identité de Bézout ; théorème de Gauss
- Nombres premiers ; décomposition en facteurs premiers (th. fondamental)
- Congruences modulo n ; anneau ℤ/nℤ
- Théorème chinois des restes (CRT)
- Indicatrice d'Euler φ(n)
- Petit théorème de Fermat ; théorème d'Euler
- Notions de cryptographie (RSA — niveau sensibilisation)

---

## MODULE 2 — MTH1122 : Fonctions d'une Variable Réelle (Analyse)
### Topologie de ℝ
- Valeur absolue et distance sur ℝ
- Intervalles ; voisinages ; points intérieurs, adhérents, frontière
- Ensembles ouverts et fermés ; compacts dans ℝ
- Borne supérieure (sup) et inférieure (inf) ; propriété de la borne sup (axiome de complétude)

### Suites Numériques
- Suites réelles : définition, monotonie, bornitude
- Limite d'une suite (définition ε-N) ; convergence / divergence
- Opérations algébriques sur les limites
- Suites de Cauchy ; critère de Cauchy dans ℝ
- Théorème de Bolzano-Weierstrass ; suites extraites
- Suites récurrentes uₙ₊₁ = f(uₙ) : points fixes, convergence
- Suites arithmétiques et géométriques ; suites équivalentes

### Séries Numériques
- Définition Σuₙ : sommes partielles, convergence / divergence
- Critères : comparaison, d'Alembert (ratio), Cauchy (racine), Abel-Dirichlet
- Séries alternées — critère de Leibniz
- Convergence absolue vs conditionnelle
- Séries de Riemann Σ 1/nᵅ
- Produit de Cauchy de deux séries

### Limites de Fonctions
- Limite en un point, à gauche/droite, à l'infini (définition ε-δ)
- Limites remarquables : sin(x)/x → 1, (1+1/n)ⁿ → e, (eˣ−1)/x → 1
- Théorème des gendarmes (sandwich)
- Formes indéterminées et levée d'indétermination

### Continuité
- Continuité en un point et sur un intervalle (définition ε-δ)
- Continuité à gauche / à droite ; prolongement par continuité
- Théorème des valeurs intermédiaires (TVI)
- Théorème de Weierstrass (extrema sur [a,b])
- Fonctions uniformément continues ; théorème de Heine

### Dérivabilité
- Taux d'accroissement ; dérivée en un point (définition)
- Dérivées usuelles : xⁿ, eˣ, ln x, sin x, cos x, tan x, arcsin, arccos, arctan
- Règles : somme, produit, quotient, composition (chain rule)
- Théorème de Rolle ; Théorème des accroissements finis (TAF)
- Règle de L'Hôpital (formes 0/0 et ∞/∞)
- Dérivées d'ordre n ; formule de Leibniz
- Extrema locaux : condition nécessaire (f'=0), conditions suffisantes (f'')
- Convexité, concavité, points d'inflexion
- Étude complète d'une fonction : domaine, symétries, limites, variations, courbe

### Développements Limités (DL)
- Formule de Taylor-Young et Taylor-Lagrange (avec reste)
- Formule de Mac-Laurin ; DL classiques :
  eˣ, sin x, cos x, ln(1+x), (1+x)ᵅ, arctan x, sh x, ch x
- DL de fonctions composées, produits, quotients
- Application : calcul de limites, étude locale, primitivation approchée

### Intégration (si couvert dans MTH1122)
- Intégrale de Riemann sur [a,b] ; propriétés
- Théorème fondamental du calcul (primitives)
- Techniques : IPP (intégration par parties), substitution, fractions rationnelles
- Intégrales impropres (convergence)

---

## MODULE 3 — PHY1223 & Syllabus : Optique Géométrique & Générale
### Fondements de l'Optique Géométrique
- Propagation rectiligne de la lumière ; principe de Fermat
- Notion de rayon lumineux ; faisceau lumineux
- Principe de retour inverse de la lumière
- Notion d'indice de réfraction n = c/v

### Réflexion
- Lois de Descartes pour la réflexion
- Miroirs plans : construction d'image, grandissement
- Miroirs sphériques (concave / convexe) :
  - Centre C, foyer F, distance focale f
  - Relation de conjugaison (convention algébrique)
  - Grandissement transversal γ = OA'/OA
  - Construction géométrique des images (rayons remarquables)

### Réfraction
- Lois de Descartes pour la réfraction : n₁ sin θ₁ = n₂ sin θ₂
- Réflexion totale interne ; angle limite
- Dioptre plan : profondeur apparente
- Dioptre sphérique :
  - Relation de conjugaison (convention de Descartes)
  - Grandissement

### Lentilles Minces
- Lentilles convergentes et divergentes ; axes, foyers, distances focales
- Vergence C = 1/f' (en dioptries)
- Relation de conjugaison : 1/OA' − 1/OA = 1/f'
- Grandissement transversal
- Construction géométrique des images (3 rayons remarquables)
- Association de lentilles : vergences, distance entre lentilles

### Prismes
- Définition géométrique ; angle au sommet A
- Déviation D(i) ; déviation minimale Dₘ
- Relation fondamentale : n = sin((A+Dₘ)/2) / sin(A/2)
- Dispersion de la lumière blanche ; indices pour différentes couleurs

### Instruments d'Optique
- Œil : accommodation, punctum proximum / remotum, vision nette
- Loupe : grossissement commercial G = D/f' (D = 25 cm)
- Microscope : objectif + oculaire, grossissement total
- Lunette astronomique (afocale) : grossissement G = −f'obj/f'oc
- Notion de limite de résolution (critère de Rayleigh — si couvert)

### Optique Ondulatoire (si couvert dans PHY1223)
- Nature ondulatoire de la lumière ; longueur d'onde λ, fréquence ν
- Relation λ = v/ν ; λ dans un milieu d'indice n
- Cohérence ; différence de marche δ
- Interférences : Young (fentes), condition de maxima/minima
- Diffraction : fente simple, réseau de diffraction

══════════════════════════════════════════════════════════════════
🎯  COMPORTEMENT ATTENDU
══════════════════════════════════════════════════════════════════

## Quand le contexte ChromaDB EST fourni et pertinent
→ Résous complètement, en t'appuyant EXPLICITEMENT sur ce contexte.
→ Cite la source : « D'après le cours MTH1122, section… »

## Quand le contexte ChromaDB EST VIDE ou NON PERTINENT
→ Réponds TOUJOURS ainsi, et rien d'autre :

> 🙏 **Je ne peux pas répondre à cette question.**
> Le contenu de ta question (*[sujet détecté]*) ne figure pas dans les documents
> officiels de ton programme (MTH1220, MTH1122, PHY1223/Optique géométrique).
> Vérifie que ta question porte bien sur l'un de ces modules,
> ou reformule-la pour que je puisse t'aider. 💪

## Style pédagogique (quand tu peux répondre)
- Toujours en français, ton chaleureux et encourageant
- LaTeX OBLIGATOIRE pour toute formule : inline $...$ ou display $$...$$
- Structure claire avec titres, étapes numérotées
- Exemples avec contexte béninois si naturel (marchés, noms locaux...)
- Termine par une ❓ question de vérification pour l'élève"""

# ── Tutor prompt template ────────────────────────────────────────────────────

TUTOR_PROMPT = """## CONTEXTE DU PROGRAMME (extrait ChromaDB — documents officiels)
{context_str}

---
{image_section}
## QUESTION DE L'ÉLÈVE
{question}

---
## PROTOCOLE DE RÉPONSE

### ÉTAPE 0 — VÉRIFICATION ET TRIAGE DU CONTEXTE (CRITIQUE)

Analyse le [CONTEXTE DU PROGRAMME] (ChromaDB) et compare-le à la liste des SUJETS COUVERTS (System Prompt). Détermine ta trajectoire selon ces 4 cas :

CAS 1 : Succès RAG (Sujet présent dans le contexte)
Condition : Le contexte contient les informations spécifiques nécessaires.
Action : Résous l'exercice en citant explicitement le document.
COMMANDE : CONTINUE.

CAS 2 : Échec RAG (Sujet au programme mais contexte vide)
Condition : Le contexte est N/A, mais le sujet est explicitement listé dans le curriculum du System Prompt (ex: limites, dérivées, optique).
Action : Ne refuse pas. Utilise tes connaissances pour répondre. Précise obligatoirement : "Bien que le passage précis du cours ne me soit pas parvenu, voici la méthode standard enseignée en [Module]..."
COMMANDE : CONTINUE.

CAS 3 : Prérequis (Bases du Lycée)
Condition : La question porte sur une base fondamentale (ex: identités remarquables, calcul de base, discriminant $\Delta = b^2 - 4ac$).
Action : Résous-la brièvement en tant que rappel nécessaire pour la suite.
COMMANDE : CONTINUE.

CAS 4 : Hors Programme Total
Condition : Le sujet est absent du contexte ET absent de la liste des modules (ex: Géographie, Politique, Algèbre Linéaire avancée).
Action : Applique le message de refus poli défini dans tes instructions.
COMMANDE : STOP.



{image_recap_instruction}

### ÉTAPE 1 — ANALYSE
- Reformule ce que l'élève doit trouver
- Identifie le **concept clé** (ex : "Théorème de Rolle", "Loi de Snell-Descartes")
- Liste les **données** et **inconnues**
- Annonce la **stratégie de résolution**
- Cite explicitement la section du cours concernée

### ÉTAPE 2 — RÉSOLUTION DÉTAILLÉE
Résous étape par étape. Pour chaque étape :
- **Titre court** en gras
- Raisonnement complet, aucune étape sautée
- Toutes formules en LaTeX ($...$ ou $$...$$)
- Justification explicite (« par le théorème de... », « d'après la définition de... »)

### ÉTAPE 3 — CONCLUSION
> **Résultat :** $[réponse]$ [unité]

### ÉTAPE 4 — CONSOLIDATION
- **Prérequis :** 2-3 notions à maîtriser au préalable
- **Erreur classique 1 :** [piège fréquent]
- **Erreur classique 2 :** [piège fréquent]
- **Source :** [document officiel + section]
- **❓ Question de vérification :** [question simple pour tester la compréhension]

### FORMAT OBLIGATOIRE
```
## [Module] — [Concept clé]

### 📋 Analyse
...

### 🔢 Résolution
**Étape 1 — [titre]**
...

### ✅ Conclusion
> **Résultat :** ...

### 📚 Consolidation
...

### ❓ Vérifie ta compréhension
...
```
"""

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

        # Only include results that are semantically close enough
        # ChromaDB L2 distance: lower = more similar; threshold ~1.5 is generous
        if distance is not None and distance > 1.5:
            print(
                f"[SEARCH] Skipping low-relevance result (distance={distance:.3f}): {source}"
            )
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
            messages=[
                {
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
                        {"type": "text", "text": IMAGE_OCR_PROMPT},
                    ],
                }
            ],
        )
        extracted = response.content[0].text.strip()
    except Exception as e:
        print(f"[WARN] OCR failed: {e}")
        return "", "", ""

    logger.log_step(
        "Observation", f"OCR: {len(extracted)} chars — {extracted[:100]}..."
    )

    image_section = f"""## 📷 CONTENU DE L'IMAGE (OCR automatique)
```
{extracted}
```
"""
    image_recap_instruction = (
        "### ÉTAPE 0b — RÉCAPITULATIF IMAGE (OBLIGATOIRE si image fournie)\n"
        "Commence ta réponse par une section `### 📷 Contenu de l'image` où tu reformules "
        "fidèlement le problème extrait de l'image, afin que l'élève puisse vérifier "
        "que la lecture OCR est correcte. Si l'OCR semble incomplet ou ambigu, signale-le."
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
        image_recap_instruction = "*(Pas d'image fournie — ignore l'étape 0b)*"

    return TUTOR_PROMPT.format(
        context_str=(
            context_observation
            if context_observation.strip()
            else "N/A — aucun contenu pertinent trouvé."
        ),
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
        img_text, image_section, image_recap_instruction = extract_image_content(
            attachment
        )
        if img_text:
            search_query = (
                (question + "\n" + img_text).strip() if question.strip() else img_text
            )

    context_observation, sources = search_curriculum(search_query)

    if claude_client is None:
        return {
            "partie": "Erreur",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Unavailable",
                    "explanation": "ANTHROPIC_API_KEY non configuré.",
                    "equations": None,
                }
            ],
            "conclusion": None,
            "sources": [],
        }

    if context_observation.strip():
        logger.log_step(
            "Observation", f"Context found ({len(context_observation)} chars)"
        )
        execution_steps.append({"type": "observation", "content": "Context retrieved"})
    else:
        logger.log_step(
            "Observation", "No relevant context — model will decline politely"
        )

    prompt = _build_prompt(
        question, context_observation, image_section, image_recap_instruction
    )

    try:
        resp = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        final_answer = resp.content[0].text

        logger.save_request(
            prompt=question,
            model="claude-sonnet-4.5",
            steps=execution_steps,
            final_answer=final_answer,
            verifier_result="Passed",
            confidence=1.0,
        )

        return {
            "partie": "Mathématiques / Physique",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Explication Professeur Bio",
                    "explanation": final_answer,
                    "equations": None,
                }
            ],
            "conclusion": "Voir explication ci-dessus",
            "sources": sources,
        }
    except Exception as e:
        error_msg = f"Erreur Claude: {e}"
        logger.log_step("Error", error_msg)
        return {
            "partie": "Erreur",
            "problemStatement": question,
            "steps": [{"title": "Erreur", "explanation": error_msg, "equations": None}],
            "conclusion": None,
            "sources": [],
        }


def ask_math_ai_stream(question: str, history: str = "", attachment=None):
    """Streaming version — yields NDJSON: metadata / token / done / error."""
    logger.log_step("Thought", f"Processing (stream): {question[:80]}")
    execution_steps = []

    image_section = ""
    image_recap_instruction = ""
    search_query = question

    if attachment:
        img_text, image_section, image_recap_instruction = extract_image_content(
            attachment
        )
        if img_text:
            search_query = (
                (question + "\n" + img_text).strip() if question.strip() else img_text
            )
            logger.log_step(
                "Observation", f"OCR done, search query: {search_query[:100]}"
            )

    context_observation, sources = search_curriculum(search_query)

    if claude_client is None:
        yield json.dumps({"error": "ANTHROPIC_API_KEY non configuré."}) + "\n"
        return

    if context_observation.strip():
        logger.log_step(
            "Observation", f"Context found ({len(context_observation)} chars)"
        )
        execution_steps.append({"type": "observation", "content": "Context retrieved"})
    else:
        logger.log_step(
            "Observation", "No relevant context — model will decline politely"
        )

    prompt = _build_prompt(
        question, context_observation, image_section, image_recap_instruction
    )

    try:
        yield json.dumps(
            {
                "metadata": {
                    "partie": "Mathématiques / Physique",
                    "problemStatement": question,
                    "sources": sources,
                }
            }
        ) + "\n"

        full_response = ""
        with claude_client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                full_response += text
                yield json.dumps({"token": text}) + "\n"

        yield json.dumps(
            {
                "done": True,
                "conclusion": "Voir explication ci-dessus",
                "sources": sources,
            }
        ) + "\n"

        logger.save_request(
            prompt=question,
            model="claude-sonnet-4.5-stream",
            steps=execution_steps,
            final_answer=full_response,
            verifier_result="Passed",
            confidence=1.0,
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
    main_text = (
        result["steps"][0]["explanation"] if result.get("steps") else "Pas de réponse."
    )
    console.print(
        Panel(
            Markdown(main_text),
            title="PROFESSEUR BIO",
            subtitle="Claude Sonnet 4.5 — MTH1122/MTH1220/PHY1223",
            border_style="green",
        )
    )
    if result.get("sources"):
        for i, src in enumerate(result["sources"]):
            console.print(f"[cyan]{i+1}. {src['source']} (p.{src['page']})[/cyan]")
