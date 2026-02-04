# AI Marketing Customer Pitch Assistant

A multi-agent AI system for generating personalized marketing customer pitches. Built with Django, React/TypeScript, Node.js BFF, MCP (Model Context Protocol), A2A (Agent-to-Agent) communication, and Docker Compose.

Originally inspired by a Jupyter notebook implementing MCP-powered agentic marketing pitch generation, this application transforms that concept into a full-stack, enterprise-grade platform with multi-agent orchestration, campaign management, analytics, and real-time collaboration capabilities.

---

## Architecture

The system follows a multi-service architecture where the React frontend communicates through a Node.js BFF layer, which orchestrates requests between the Django backend and the FastMCP server. Asynchronous tasks are processed via Celery workers backed by Redis.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Port 3064)                      │
│                   React / TypeScript / Tailwind                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BFF Gateway (Port 4064)                       │
│              Node.js / Express / TypeScript / WebSocket          │
└──────────┬─────────────────────────────────────┬────────────────┘
           │                                     │
           ▼                                     ▼
┌────────────────────────┐          ┌──────────────────────────┐
│  Django Backend (8064) │          │  MCP Server (8165)       │
│  DRF + Celery + A2A    │◄────────►│  FastMCP + LangChain     │
│  Agent Orchestration   │          │  10 AI-Powered Tools     │
└──────┬─────────┬───────┘          └──────────────────────────┘
       │         │
       ▼         ▼
┌────────────┐ ┌─────────────────────────────────────────────────┐
│ PostgreSQL │ │  Redis (Port 6479)                               │
│ (Port 5464)│ │  Cache / Celery Broker / WebSocket Channel Layer │
└────────────┘ └──────────┬──────────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Celery   │ │  Celery  │ │  Flower  │
        │  Worker   │ │  Beat    │ │  (5564)  │
        └──────────┘ └──────────┘ └──────────┘
```

### Services

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| **Frontend** | React 18 / TypeScript / Tailwind CSS | 3064 | Modern SaaS UI with dark mode, served via Nginx |
| **BFF** | Node.js / Express / TypeScript | 4064 | API gateway with WebSocket support, rate limiting, request aggregation |
| **Backend** | Django 5.1 / DRF / Celery / Channels | 8064 | Business logic, models, REST API, agent orchestration |
| **MCP Server** | FastMCP / Python / LangChain | 8165 | AI tool hosting via MCP streamable-http transport |
| **PostgreSQL** | PostgreSQL 16 Alpine | 5464 | Primary relational database |
| **Redis** | Redis 7 Alpine | 6479 | Caching, Celery broker, WebSocket channel layer |
| **Celery Worker** | Celery 5.4 | -- | Async task processing (queues: default, pitches, analytics) |
| **Celery Beat** | Celery Beat | -- | Scheduled/periodic tasks |
| **Flower** | Flower 2.0 | 5564 | Celery monitoring dashboard |

---

## Features

### Core Features (from Notebook)

- **Customer Research & Profiling** -- Customer 360-degree view with database lookup and fallback data
- **AI-Powered Pitch Generation** -- Personalized sales pitches crafted by LLM with configurable tone and templates
- **Pitch Scoring** -- Automated evaluation on persuasiveness, clarity, and relevance (0-1.0 scale)
- **Pitch Refinement** -- Iterative improvement based on scoring feedback until quality threshold is met
- **MCP Server-Hosted Tools** -- 10 tools exposed via Model Context Protocol for agent consumption

### Enhanced Features

- **Multi-Agent Orchestration** -- Full pipeline with A2A (Agent-to-Agent) communication protocol
- **6 Specialized AI Agents** -- Research, Pitch Generator, Scorer, Refiner, Strategy, and Orchestrator
- **Campaign Management** -- Create and manage marketing campaigns with targeting, budgets, and goals
- **A/B Testing** -- Generate pitch variants to test different messaging strategies
- **Email Subject Line Generation** -- AI-generated subject lines with multiple style options
- **Follow-Up Email Sequences** -- Timed multi-email sequences with varied strategies
- **Customer Sentiment Analysis** -- Analyze interaction history for sentiment and engagement levels
- **Competitive Positioning Analysis** -- Industry-specific differentiators and talking points
- **Lead Scoring** -- Composite scoring (0-100) across five factors with recommended actions
- **Pitch Template Library** -- Reusable templates for consistent pitch creation
- **Analytics Dashboard** -- KPIs, trends, agent performance metrics, and ROI tracking
- **Real-Time WebSocket Updates** -- Live progress updates during pitch generation via Django Channels
- **Async Task Processing** -- Long-running AI operations handled by Celery workers
- **Version History** -- Full pitch lineage tracking with parent-child relationships
- **Pitch Comparison Tools** -- Side-by-side comparison of pitch versions and variants
- **Export Capabilities** -- Export pitches and analytics data
- **Dark Mode Support** -- Full dark theme across the UI

---

## MCP Tools

The MCP server exposes 10 AI-powered tools via the streamable-http transport:

| # | Tool | Description |
|---|------|-------------|
| 1 | `research_customer` | Look up customer profile from PostgreSQL with in-memory fallback |
| 2 | `initial_pitch_prompt` | Generate a structured pitch prompt incorporating customer info and tone |
| 3 | `score_pitch` | Evaluate pitch quality on persuasiveness, clarity, and relevance (1-10) |
| 4 | `refine_pitch` | Rewrite a pitch incorporating specific feedback via expert copywriter LLM |
| 5 | `analyze_customer_sentiment` | Analyze interaction history for sentiment score, engagement, and approach |
| 6 | `generate_subject_line` | Generate 3 compelling email subject line options with reasoning |
| 7 | `competitive_positioning` | Industry analysis with trends, competitor weaknesses, and differentiators |
| 8 | `pitch_ab_variants` | Generate A/B test variants with different messaging strategies |
| 9 | `calculate_lead_score` | Calculate composite lead score (0-100) with factor breakdown |
| 10 | `generate_followup_sequence` | Create timed follow-up email sequences with varied approaches |

All tools include LLM-powered analysis with graceful fallbacks when the AI provider is unavailable.

---

## A2A (Agent-to-Agent) Communication

The system implements a multi-agent pipeline where specialized agents communicate through structured A2A messages. Each message is tracked with correlation IDs for full audit trails.

### Pipeline Flow

```
1. Orchestrator Agent receives pitch request
         │
         ▼
2. Research Agent gathers customer intelligence
   (database lookup, industry analysis, pain points)
         │
         ▼
3. Pitch Generator Agent creates personalized pitch
   (using research context, tone, and templates)
         │
         ▼
4. Scoring Agent evaluates pitch quality
   (persuasiveness, clarity, relevance -- each 0.0 to 1.0)
         │
         ▼
5. Score >= threshold (default 0.7)?
   ├── YES → Final pitch delivered with full audit trail
   └── NO  → Refinement Agent improves pitch based on feedback
             (loops back to step 4, max 3 iterations)
         │
         ▼
6. Final pitch delivered with scores, version history,
   and complete A2A message trail
```

### Message Types

- **request** -- Agent asks another agent to perform a task
- **response** -- Agent returns results to the requester
- **delegate** -- Orchestrator delegates work to a specialized agent
- **broadcast** -- Agent notifies multiple agents of an event

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key (or compatible LLM API endpoint)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd marketing-customer-pitch

# Configure environment
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
# Optionally configure OPENAI_BASE_URL for compatible providers

# Build and start all services
docker-compose up --build -d

# Verify all services are healthy
docker-compose ps

# Seed the database with sample customers and agent configurations
docker-compose exec backend python manage.py seed_data

# Access the application
# Open http://172.168.1.95:3064 in your browser
```

### Default Credentials

| Account | Username | Password |
|---------|----------|----------|
| Django Admin | `admin` | `admin_pitch_2024` |

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://172.168.1.95:3064 |
| Django Admin | http://172.168.1.95:8064/admin/ |
| Backend API | http://172.168.1.95:8064/api/v1/ |
| BFF API | http://172.168.1.95:4064/api/v1/ |
| MCP Server | http://172.168.1.95:8165/mcp |
| Flower Dashboard | http://172.168.1.95:5564 |

---

## API Endpoints

### Backend REST API (`/api/v1/`)

| Endpoint Group | Path | Description |
|----------------|------|-------------|
| **Customers** | `/api/v1/customers/` | Customer CRUD, search, filtering, and 360-degree view |
| **Pitches** | `/api/v1/pitches/` | Pitch CRUD, generate, score, refine, compare, and export |
| **Campaigns** | `/api/v1/campaigns/` | Campaign management, launch, targeting, and metrics |
| **Agents** | `/api/v1/agents/` | Agent configurations, execution logs, orchestrate pipeline, A2A messages |
| **Analytics** | `/api/v1/analytics/` | Dashboard KPIs, trends, agent performance, and ROI metrics |
| **Core** | `/api/v1/` | Health check, MCP tool proxy, and system status |
| **Health** | `/api/health/` | Service health check |

### BFF API (`/api/v1/` via port 4064)

The BFF layer proxies and aggregates backend requests, adds WebSocket support for real-time updates, and provides rate limiting and request validation.

---

## Tech Stack

### Frontend
- React 18, TypeScript, Vite 6
- Tailwind CSS 3.4
- TanStack Query 5 (data fetching and caching)
- Zustand 5 (state management)
- Recharts 2 (data visualization)
- Framer Motion 11 (animations)
- React Hook Form 7 (form handling)
- React Router 6, Lucide React (icons), React Markdown

### BFF (Backend-for-Frontend)
- Node.js 20, Express 4, TypeScript 5
- WebSocket (ws 8) for real-time communication
- Helmet, CORS, compression, rate limiting
- HTTP proxy middleware for backend delegation

### Backend
- Django 5.1, Django REST Framework 3.15
- Celery 5.4 with Django Celery Beat and Results
- Django Channels 4.2 with Redis channel layer
- Django Filter, CORS Headers, WhiteNoise
- Gunicorn with gthread workers, Daphne for ASGI

### MCP Server
- FastMCP (MCP 1.15) with streamable-http transport
- LangChain 0.3, LangChain OpenAI 0.3
- LangGraph 0.6, LangChain MCP Adapters 0.1
- psycopg2 for direct PostgreSQL access

### Database and Infrastructure
- PostgreSQL 16 Alpine
- Redis 7 Alpine (cache, broker, channel layer)
- Docker and Docker Compose
- Nginx (frontend static serving and reverse proxy)

### AI
- OpenAI GPT-4o-mini (default, configurable via environment)
- LangChain for LLM orchestration
- LangGraph ReAct Agent pattern
- Model Context Protocol for tool hosting

---

## Project Structure

```
marketing-customer-pitch/
├── frontend/                    # React/TypeScript SPA
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── common/          # Card, Modal, LoadingSpinner, etc.
│   │   │   └── layout/          # Header, Sidebar, Layout
│   │   ├── pages/               # Route-level page components
│   │   │   ├── customers/       # Customer list and detail views
│   │   │   ├── pitches/         # Pitch list, detail, and generator
│   │   │   ├── campaigns/       # Campaign CRUD and detail
│   │   │   ├── agents/          # Agent dashboard
│   │   │   ├── analytics/       # Analytics dashboard
│   │   │   ├── mcp/             # MCP tool explorer
│   │   │   └── templates/       # Pitch template library
│   │   ├── services/            # API client (axios)
│   │   ├── store/               # Zustand state management
│   │   ├── types/               # TypeScript type definitions
│   │   └── App.tsx              # Root component with routing
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── bff/                         # Node.js Backend-for-Frontend
│   ├── src/                     # Express app with TypeScript
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── backend/                     # Django API server
│   ├── config/                  # Django project settings
│   │   ├── settings.py          # Main configuration
│   │   ├── urls.py              # URL routing
│   │   ├── celery.py            # Celery configuration
│   │   ├── asgi.py              # ASGI entry point
│   │   └── wsgi.py              # WSGI entry point
│   ├── core/                    # Core app (health, seed data, shared utils)
│   │   └── management/commands/ # Management commands (seed_data)
│   ├── customers/               # Customer models, views, serializers
│   ├── pitches/                 # Pitch models, views, serializers
│   ├── campaigns/               # Campaign models, views, serializers
│   ├── agents/                  # Agent configs, A2A service, orchestration
│   │   └── services.py          # AgentService + A2AService classes
│   ├── analytics/               # Analytics models, views, serializers
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── mcp-server/                  # FastMCP tool server
│   ├── server.py                # All 10 MCP tools
│   ├── Dockerfile
│   └── requirements.txt
├── nginx/
│   └── nginx.conf               # Frontend Nginx configuration
├── scripts/
│   └── entrypoint.sh            # Django startup script
├── W7_MCP_Agent.ipynb           # Original Jupyter notebook (reference)
├── docker-compose.yml           # Multi-service orchestration
└── README.md
```

---

## Development

### Running Individual Services

To run services locally outside Docker for development:

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173 by default (Vite dev server)
```

**BFF:**
```bash
cd bff
npm install
npm run dev
# Runs on http://localhost:4064
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8064
```

**MCP Server:**
```bash
cd mcp-server
pip install -r requirements.txt
python server.py
# Runs on http://localhost:8165
```

**Celery Worker:**
```bash
cd backend
celery -A config worker -l info --concurrency=2 -Q default,pitches,analytics
```

**Celery Beat:**
```bash
cd backend
celery -A config beat -l info
```

### Environment Variables

Key environment variables (set in `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | -- | OpenAI API key (required) |
| `OPENAI_MODEL` | `gpt-4o-mini` | LLM model name |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | LLM API base URL |
| `OPENAI_TEMPERATURE` | `0.7` | LLM temperature |
| `OPENAI_MAX_TOKENS` | `4096` | Max tokens per request |
| `AGENT_SCORE_THRESHOLD` | `0.7` | Minimum score to skip refinement |
| `AGENT_MAX_REFINEMENT_ITERATIONS` | `3` | Max refinement loops |
| `POSTGRES_DB` | `marketing_pitch_db` | Database name |
| `POSTGRES_USER` | `pitch_user` | Database user |
| `POSTGRES_PASSWORD` | `pitch_secure_password_2024` | Database password |
| `DJANGO_SECRET_KEY` | (insecure default) | Django secret key |
| `DJANGO_DEBUG` | `True` | Debug mode |

---

## Port Reference

All ports use non-default values to avoid conflicts with other services:

| Service | Port | Standard Default |
|---------|------|-----------------|
| Frontend (Nginx) | 3064 | 80/3000 |
| BFF (Express) | 4064 | 3000/4000 |
| Backend (Gunicorn) | 8064 | 8000 |
| MCP Server (FastMCP) | 8165 | 8000 |
| PostgreSQL | 5464 | 5432 |
| Redis | 6479 | 6379 |
| Flower | 5564 | 5555 |

---

## License

MIT
