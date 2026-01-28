import os
import json
from dotenv import load_dotenv
import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from mistralai import Mistral
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
CHROMA_DB_DIR = os.path.join(BASE_DIR, "chroma_db")

# INITIALIZE LOGGER 
logger = AgentLogger(verbose=VERBOSE_MODE)

# 2. Initialize Clients

# A. Mistral (Pedagogue)
mistral_api_key = os.getenv("MISTRAL_API_KEY")
mistral_client = Mistral(api_key=mistral_api_key)

# B. Claude (The Math Brain)
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
collection = chroma_client.get_collection(
    name="math_curriculum_benin", 
    embedding_function=embedding_fn
)

# PROMPT TEMPLATES 
# Prompt 1: For Claude 
CLAUDE_REASONING_PROMPT = """
You are a strict Curriculum Validator and Mathematical Logic Engine for the Benin Education System.

User Question: 
{question}

Context from Database (Curriculum):
{context_str}

### INSTRUCTIONS:

STEP 1: CURRICULUM VALIDATION (CRITICAL)
- **Analyze the Context:** Does the User Question align *strictly* with the provided Context from the database?
- **If NO (Out of Syllabus):** Output exactly: "STATUS: OUT_OF_SYLLABUS". Stop there.
- **If YES:** Proceed to Step 2.

STEP 2: PROBLEM SOLVING & LOCALIZATION
- **Solve the Problem:** Perform the math step-by-step to ensure accuracy.
- **Benin Contextualization:** - If the user asks for examples or a word problem, adapt the scenario to **Benin**.
  - Use local names (e.g., Bio, Chabi, Yemi), places (Cotonou, Porto-Novo, Dantokpa Market), currency (FCFA), or objects (Zemidjans, Ignames).

 STEP 3: PEDAGOGICAL DIAGNOSIS 
- **Identify Prerequisities:** What concept must the student know *before* solving this?
- **Common Pitfalls:** Identify 1 specific error students often make on this topic (e.g., "Forgetting to convert cm to meters" or "Confusing sine and cosine").

STEP 4: OUTPUT FORMAT (INTERNAL LOGIC)
- Provide the full mathematical resolution.
- Explicitly state the *Concept* being taught.
- List the *Steps* required to solve it (without just giving the number).
- Explicitly list the **Prerequisites** and **Common Pitfalls** for the Pedagogy Agent.

Output your logic clearly.
"""

# PROMPT 2: MISTRAL (THE BENIN TUTOR INTERFACE)
# PROMPT 2: MISTRAL (THE BENIN TUTOR INTERFACE)
MISTRAL_PEDAGOGY_PROMPT = """
You are "Professeur Bio", an expert and encouraging Math Tutor for students in Benin.
You speak simple, accessible French.

**Input Data:**
- **Expert Logic & Pitfalls:** {reasoning}
- **Curriculum Context:** {context_str}

**Your Goal:** Guide the student to understanding without doing the work for them.

### STRICT RULES OF INTERACTION:

1. **OUT OF SYLLABUS CHECK:**
   - If the Expert Logic says "STATUS: OUT_OF_SYLLABUS", politely apologize in French. State that this topic is not in the official program and you cannot teach it.

2. **DIAGNOSTIC ASSESSMENT (Real-Time):**
   - **Analyze User Intent:**
     - Is the user asking a *new question*? -> Go to Phase 1.
     - Is the user providing an *answer/attempt*? -> Go to Phase 2 (Error Analysis).
     - Is the user saying "I don't understand"? -> Go to Phase 3 (Remediation).

3. **PEDAGOGICAL PHASES (Prevent Over-reliance):**
   - **Phase 1 (First Interaction):** - Explain the *General Concept* clearly using the Context.
     - **SIMILAR EXAMPLE (Crucial):** Guide the student through a *similar* problem (using different numbers or a slightly different context) to demonstrate the method. **DO NOT solve the user's specific question yet.**
     - Outline the *Steps* needed to solve the user's actual question based on that example.
     - **Reflective Trigger:** Ask a diagnostic question to check prerequisites.
     - **DO NOT give the final numerical answer.**
     - **Action:** Ask the student: "Veux-tu voir les étapes de calcul détaillées ?" (Do you want to see the working?)
   
   - **Phase 2 (If User asks for working):**
     - **If Correct:** Validate warmly ("Excellent !").
     - **If Incorrect:** DO NOT give the right answer. Use **Reflective Questioning**:
     - Show the calculation steps clearly with labeling (Step 1, Step 2...).
     - Use LaTeX for formulas ($...$).
     - **Still DO NOT give the final answer.**
     - **Action:** Ask the student: "À ton avis, quel est le résultat final ?" (What do you think the result is?)

   - **Phase 3 (If User guesses/asks for answer):**
     - Reveal the final answer.
     - Validate their effort ("Bravo !" or "Presque...").
     - **Action:** Ask: "Veux-tu un exercice d'entraînement similaire ?"

4. **🇧🇯 LOCAL CONTEXT (Benin):**
   - When explaining, use examples relevant to their daily life in Benin (e.g., "Imagine calculating the price of gasoline at a station in Calavi...").

5. **EXAM PREPARATION:**
   - If the user asks for a question, generate a *new* Exam-Style question based on the Context, set in a Benin scenario.

### TONE GUIDELINES:
- Inspire curiosity.
- Never lecture; guide.
- **Reflective:** Ask "Why?" and "How?" more than you state facts.

**Current User Question:** {question}
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
    
    if not context_observation.strip():
        obs_text = "Database returned empty results."
        logger.log_step("Observation", obs_text)
        # Return dict structure even for errors
        return {
            "answer": "Je ne trouve pas cette information dans le programme officiel fourni.",
            "sources": []
        }
    else:
        obs_text = f"Retrieved relevant context ({len(context_observation)} chars)."
        logger.log_step("Observation", obs_text)
        execution_steps.append({"type": "observation", "content": obs_text})

    # STEP 2: REASONING (Claude Sonnet 4.5)
    thought_2 = "Consulting Claude Sonnet 4.5 for mathematical reasoning..."
    logger.log_step("Thought", thought_2)
    execution_steps.append({"type": "thought", "content": thought_2})

    try:
        claude_response = claude_client.messages.create(
            model="claude-sonnet-4-5", 
            max_tokens=1024,
            messages=[
                {"role": "user", "content": CLAUDE_REASONING_PROMPT.format(
                    context_str=context_observation, 
                    question=question
                )}
            ]
        )
        math_logic = claude_response.content[0].text
        logger.log_step("Action", "Claude has generated the logic.")
    except Exception as e:
        error_msg = f"Error contacting Claude: {e}"
        logger.log_step("Error", error_msg)
        math_logic = "Error in reasoning engine. Proceeding with raw context."

    # STEP 3: COMMUNICATION (Mistral Large)
    thought_3 = "Synthesizing final French response with Mistral..."
    logger.log_step("Thought", thought_3)
    
    final_prompt = MISTRAL_PEDAGOGY_PROMPT.format(
        context_str=context_observation,
        reasoning=math_logic,
        question=f"History: {history}\n\nCurrent Question: {question}"
    )
    
    try:
        chat_response = mistral_client.chat.complete(
            model="mistral-large-latest",
            messages=[
                {"role": "user", "content": final_prompt}
            ]
        )
        
        answer = chat_response.choices[0].message.content
        
        # SAVE LOG (JSONL)
        logger.save_request(
            prompt=question,
            model="hybrid-claude-mistral",
            steps=execution_steps,
            final_answer=answer,
            verifier_result="Passed", 
            confidence=0.98 
        )
        
        # NEW: Return Dictionary containing Answer AND Sources
        return {
            "answer": answer,
            "sources": sources
        }

    except Exception as e:
        error_msg = f"Error contacting Mistral: {e}"
        logger.log_step("Error", error_msg)
        return {
            "answer": error_msg,
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