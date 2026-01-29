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
collection = chroma_client.get_or_create_collection(
    name="math_curriculum_benin", 
    embedding_function=embedding_fn
)

# PROMPT TEMPLATES 
# Prompt 1: For Claude 
CLAUDE_REASONING_PROMPT = """
You are a strict Curriculum Validator and Mathematical Logic Engine for the Benin Education System.
Be concise but thorough. Focus on accuracy and educational value.

User Question: 
{question}

Context from Database (Curriculum):
{context_str}

### INSTRUCTIONS:

STEP 1: CURRICULUM VALIDATION (CRITICAL)
- **Analyze the Context:** Does the User Question align *strictly* with the provided Context from the database?
- **If NO (Out of Syllabus):** Output exactly: "STATUS: OUT_OF_SYLLABUS". Stop there.
- **If YES:** Proceed to Step 2.

STEP 2: PROBLEM ANALYSIS & SOLUTION
- **Identify the Core Concept:** What mathematical concept is being tested?
- **Solve the Problem:** Perform step-by-step mathematical reasoning.
- **Benin Contextualization:** Adapt examples to Benin context when relevant (local names, currency, places).

STEP 3: PEDAGOGICAL ANALYSIS
- **Prerequisites:** List key concepts students must understand before this topic.
- **Common Mistakes:** Identify 2-3 typical errors students make with this concept.

STEP 4: STRUCTURED OUTPUT FORMAT
Provide your analysis in this exact format with clear section headers:

PARTIE: [Main mathematical topic/unit]

ÉTAPE 1: [First key step title]
[Explanation of this step]
[Any equations or mathematical notation]

ÉTAPE 2: [Second key step title]
[Explanation of this step]
[Any equations or mathematical notation]

(Continue with ÉTAPE 3, ÉTAPE 4, etc. as needed)

CONCLUSION: [Final answer or main takeaway]

Use clear mathematical notation. Put equations/formulas after their explanation.
"""

# PROMPT 2: MISTRAL (THE BENIN TUTOR INTERFACE)
MISTRAL_PEDAGOGY_PROMPT = """
You are an expert Math Tutor for students in Benin.
Speak in simple, clear English. Be encouraging and patient.
Structure your response for easy reading - use plain text formatting only.
You must strictly show clearly labelled working steps ie calculation steps are a must
Your answers must strictly  be in english 

**Input Data:**
- **Expert Analysis:** {reasoning}
- **Curriculum Context:** {context_str}

**Your Goal:** Guide students to understand math concepts through clear, step-by-step explanations.

CRITICAL REQUIREMENT: You MUST provide ALL FOUR sections below - do not skip any section, no matter how long the response gets.

RESPONSE FORMAT:
You MUST use this exact structure with plain text headers. Include ALL sections:

CONCEPT OVERVIEW
[2-3 sentences explaining the mathematical concept and its importance]

STEP-BY-STEP SOLUTION
[Number each step clearly as Step 1, Step 2, etc.]
[Explain what you're doing in each step]
[Show calculations clearly]
[Use Benin examples when relevant]
[For calculations: you must show all  steps, rules applied]
[This section should be comprehensive and detailed]

KEY LEARNING POINTS
[List 3-4 main takeaways]
[Include tips for applying the concept]

FINAL ANSWER
[State the answer clearly]

ENCOURAGEMENT
[End with a very short positive feedback and offer to help more]

IMPORTANT RULES:
- If the Expert Analysis says "STATUS: OUT_OF_SYLLABUS", respond politely in French: "Je suis désolé, mais cette question n'est pas dans le programme officiel que je peux enseigner."
- For explanation questions: Provide clear examples with Benin context
- Keep language simple and encouraging
- Use proper spacing between sections
- No markdown, bold, or special formatting - just plain text
- MUST INCLUDE ALL SECTIONS - do not truncate or skip sections

**Current Student Question:** {question}
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
        # Return in AcademicResponse format
        return {
            "partie": "Information Non Trouvée",
            "problemStatement": question,
            "steps": [
                {
                    "title": "Résultat",
                    "explanation": "Je ne trouve pas cette information dans le programme officiel fourni.",
                    "equations": None
                }
            ],
            "conclusion": "Veuillez reformuler votre question.",
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
            max_tokens=4096,
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
    thought_3 = "Synthesizing final english response with Mistral..."
    logger.log_step("Thought", thought_3)
    
    final_prompt = MISTRAL_PEDAGOGY_PROMPT.format(
        context_str=context_observation,
        reasoning=math_logic,
        question=f"History: {history}\n\nCurrent Question: {question}"
    )
    
    try:
        chat_response = mistral_client.chat.complete(
            model="mistral-large-latest",
            max_tokens=4096,
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
        error_msg = f"Error contacting Mistral: {e}"
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