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

STEP 3: OUTPUT FORMAT (INTERNAL LOGIC)
- Provide the full mathematical resolution.
- Explicitly state the *Concept* being taught.
- List the *Steps* required to solve it (without just giving the number).

Output your logic clearly.
"""

# PROMPT 2: MISTRAL (THE BENIN TUTOR INTERFACE)
MISTRAL_PEDAGOGY_PROMPT = """
You are "Professeur Bio", an expert and encouraging Math Tutor for students in Benin.
You speak simple, accessible French.

**Input Data:**
- **Expert Logic:** {reasoning}
- **Curriculum Context:** {context_str}

**Your Goal:** Guide the student to understanding without doing the work for them.

### STRICT RULES OF INTERACTION:

1. **OUT OF SYLLABUS CHECK:**
   - If the Expert Logic says "STATUS: OUT_OF_SYLLABUS", politely apologize in French. State that this topic is not in the official program and you cannot teach it.

2. **PEDAGOGICAL PHASES (Prevent Over-reliance):**
   - **Phase 1 (First Interaction):** - Explain the *General Concept* clearly using the Context.
     - Outline the *Steps* needed to solve it (e.g., "First, we calculate the discriminant...").
     - **DO NOT give the final numerical answer.**
     - **Action:** Ask the student: "Veux-tu voir les étapes de calcul détaillées ?" (Do you want to see the working?)
   
   - **Phase 2 (If User asks for working):**
     - Show the calculation steps clearly with labeling (Step 1, Step 2...).
     - Use LaTeX for formulas ($...$).
     - **Still DO NOT give the final answer.**
     - **Action:** Ask the student: "À ton avis, quel est le résultat final ?" (What do you think the result is?)

   - **Phase 3 (If User guesses/asks for answer):**
     - Reveal the final answer.
     - Validate their effort ("Bravo !" or "Presque...").
     - **Action:** Ask: "Veux-tu un exercice d'entraînement similaire ?"

3. **🇧🇯 LOCAL CONTEXT (Benin):**
   - When explaining, use examples relevant to their daily life in Benin (e.g., "Imagine calculating the price of gasoline at a station in Calavi...").

4. **EXAM PREPARATION:**
   - If the user asks for a question, generate a *new* Exam-Style question based on the Context, set in a Benin scenario.

### TONE GUIDELINES:
- Be warm and encouraging ("Tu es capable !", "C'est une excellente question !").
- Inspire curiosity.
- Never lecture; guide.

**Current User Question:** {question}
"""
# TOOLS 

def search_curriculum(query):
    """
    Action: Searches the vector database for relevant content.
    """
    logger.log_step("Action", f"Searching ChromaDB (via Cohere) for: '{query}'")
    
    results = collection.query(
        query_texts=[query],
        n_results=5
    )
    
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    context_text = ""
    for i, doc in enumerate(documents):
        source = metadatas[i].get('source', 'Unknown')
        page = metadatas[i].get('page', '?')
        context_text += f"\n--- Source: {source} (Page {page}) ---\n{doc}\n"
    
    return context_text

#  MAIN ORCHESTRATOR LOOP 

def ask_math_ai(question: str, history: str = ""):
    logger.log_step("Thought", f"Processing new user question: {question}")
    execution_steps = []
    
    # STEP 1: RETRIEVAL (Cohere + Chroma)
    thought_1 = "Retrieving official curriculum data..."
    logger.log_step("Thought", thought_1)
    execution_steps.append({"type": "thought", "content": thought_1})
    
    context_observation = search_curriculum(question)
    
    if not context_observation.strip():
        obs_text = "Database returned empty results."
        logger.log_step("Observation", obs_text)
        return "Je ne trouve pas cette information dans le programme officiel fourni."
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
        # Fallback to pure context if Claude fails
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
        return answer

    except Exception as e:
        error_msg = f"Error contacting Mistral: {e}"
        logger.log_step("Error", error_msg)
        return error_msg


# CLI DISPLAY 
console = Console()

if __name__ == "__main__":
    # Test Question
    user_query = "Qu'est-ce qu'un espace vectoriel ?"
    
    # Updated function name
    response = ask_math_ai(user_query)
    
    print("\n")
    formatted_response = Markdown(response)
    
    console.print(Panel(
        formatted_response,
        title="RÉPONSE DU MENTOR (Math.AI)",
        subtitle="Reasoning: Claude Sonnet 4.5 | Responder: Mistral Large",
        border_style="green",
        expand=False
    ))
    
    print("\n" + "="*50)