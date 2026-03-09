# Backend Configuration

## Environment Variables Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables:**

### Required Variables

- `MONGODB_URI`: Your MongoDB connection string
- `OPENAI_API_KEY`: Your OpenAI API key for AI problem solving

### Authentication (Auth0)

- `AUTH0_DOMAIN`: Your Auth0 tenant domain (e.g., `your-tenant.auth0.com`)
- `AUTH0_AUDIENCE`: Your Auth0 API audience identifier

### Access Control

#### Admin Access (`ADMIN_EMAILS`)
Controls who can access the admin dashboard at `/admin` route.

**Format:** Comma-separated list of email addresses (case-insensitive)

**Example:**
```env
ADMIN_EMAILS=admin@example.com,john.doe@company.com
```

**Behavior:**
- If **not set** or **empty**: Admin dashboard is disabled for everyone
- If **set**: Only listed emails can access admin features and analytics

#### User Whitelist (`WHITELIST_EMAILS`)
Controls which users can access the application.

**Format:** Comma-separated list of email addresses (case-insensitive)

**Example:**
```env
WHITELIST_EMAILS=user1@example.com,user2@example.com,beta-tester@test.com
```

**Behavior:**
- If **not set** or **empty**: All authenticated users can access the app
- If **set**: Only listed emails can use the service

### Security Notes

- Keep your `.env` file private and never commit it to version control
- `.gitignore` should already exclude `.env` files
- Use separate `.env` files for development, staging, and production
- Emails are compared case-insensitively (admin@Example.com = admin@example.com)

## Running the Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
python -m uvicorn src.api.server:app --reload --host 0.0.0.0 --port 8000
```
