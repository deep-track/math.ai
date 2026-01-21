## 🔧 System Constraints & Configuration

### 1. API Rate Limits (Documented)
We are using the following providers. Limits apply to the Free/Tier 1 plans currently in use.

| Provider | Model | Rate Limit (RPM - Req/Min) | Token Limit (TPM) | Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Mistral AI** | `mistral-large-latest` | ~60 RPM (varies by tier) | Varies | exponential backoff retry |
| **Cohere** | `embed-multilingual-v3.0` | 100 RPM (Production default) | 10,000 TPM | Batching requests |

*Note: If `429 Too Many Requests` errors occur, the system will wait and retry automatically.*

### 2. Embedding Dimensions (Documented)
To ensure vector database compatibility, the "Key" (Query) and "Lock" (Database) must match.

* **Model:** Cohere `embed-multilingual-v3.0`
* **Dimension Size:** `1024` vectors
* **Vector Database:** ChromaDB (configured with `CohereEmbeddingFunction`)

**Warning:** Do not change the embedding model without wiping and re-ingesting the entire database, or a `Dimension Mismatch (384 vs 1024)` error will crash the orchestrator.