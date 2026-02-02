# Document Extractor

A web application that extracts structured information from PDF and DOCX documents using Claude AI, storing results in Supabase PostgreSQL.

## Features

- Upload PDF and DOCX files via a web interface
- Extract text content from documents
- Use Claude AI to identify and extract structured data (names, emails, phone numbers, etc.)
- Store extracted entities in PostgreSQL (Supabase)
- Search and browse extracted records

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic)
- **Hosting**: Render

## Local Development

### Prerequisites

- Node.js 18+ installed
- Supabase project created
- Anthropic API key

### 1. Clone and Install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

```
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
FRONTEND_URL=http://localhost:5173
```

### 3. Set Up Database

Run the SQL schema in Supabase SQL Editor (see `Database Setup` section below).

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit http://localhost:5173

## Database Setup

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing
3. Go to **SQL Editor**
4. Run this SQL:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE extracted_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    id_number TEXT,
    address TEXT,
    organisation TEXT,
    role_title TEXT,
    source_document_name TEXT NOT NULL,
    comments TEXT,
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_email ON extracted_entities(email);
CREATE INDEX idx_entities_organisation ON extracted_entities(organisation);
CREATE INDEX idx_entities_source_doc ON extracted_entities(source_document_name);
CREATE INDEX idx_entities_created_at ON extracted_entities(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON extracted_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

5. Get your credentials:
   - Go to **Project Settings** > **API**
   - Copy `Project URL` → `SUPABASE_URL`
   - Copy `service_role` key → `SUPABASE_SERVICE_KEY`

## Deployment to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/document-extractor.git
git push -u origin main
```

### Step 2: Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `document-extractor-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SERVICE_KEY` = your service key
   - `ANTHROPIC_API_KEY` = your Claude API key
   - `FRONTEND_URL` = (will set after frontend deploy)
6. Click **Create Web Service**
7. Copy the deployed URL (e.g., `https://document-extractor-api.onrender.com`)

### Step 3: Deploy Frontend

1. In Render, click **New** > **Static Site**
2. Connect the same repository
3. Configure:
   - **Name**: `document-extractor`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL` = your backend URL from Step 2
5. Click **Create Static Site**
6. Copy the frontend URL

### Step 4: Update Backend CORS

1. Go back to your backend service in Render
2. Update the `FRONTEND_URL` environment variable with your frontend URL
3. The service will auto-redeploy

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload PDF/DOCX files |
| GET | `/api/entities` | List entities (supports `?page=`, `?limit=`, `?search=`) |
| GET | `/api/entities/:id` | Get entity by ID |
| DELETE | `/api/entities/:id` | Delete entity |
| GET | `/health` | Health check |

## Project Structure

```
document-extractor/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   ├── routes/
│   │   │   ├── upload.ts      # File upload handler
│   │   │   └── entities.ts    # CRUD routes
│   │   ├── services/
│   │   │   ├── textExtractor.ts  # PDF/DOCX parsing
│   │   │   ├── claude.ts         # Claude API
│   │   │   └── database.ts       # Supabase client
│   │   ├── prompts/
│   │   │   └── extraction.ts     # LLM prompt
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx
│   │   │   └── EntitiesPage.tsx
│   │   └── services/
│   │       └── api.ts
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## License

MIT
