# AI Marketing Customer Pitch Assistant

A full-stack multi-agent AI system for generating personalized marketing customer pitches. Built with Django, React/TypeScript, Node.js BFF, MCP (Model Context Protocol), and A2A (Agent-to-Agent) communication, all orchestrated via Docker Compose.

The platform leverages six specialized AI agents that collaborate through a structured pipeline to research customers, generate tailored pitches, score them for quality, and iteratively refine them until they meet a configurable quality threshold. Originally inspired by a Jupyter notebook implementing MCP-powered agentic marketing pitch generation, this application transforms that concept into an enterprise-grade platform with multi-agent orchestration, campaign management, analytics, and real-time collaboration capabilities.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Multi-Agent Pipeline](#multi-agent-pipeline)
- [MCP Tools](#mcp-tools)
- [Frontend Pages](#frontend-pages)
- [Configuration](#configuration)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

The system is composed of five architectural layers plus a dedicated AI/MCP layer. The React frontend communicates through a Node.js BFF gateway, which orchestrates requests between the Django backend and the FastMCP server. Asynchronous tasks are processed via Celery workers backed by Redis, and real-time updates flow through WebSocket connections powered by Django Channels.

```
                        ┌──────────────────────────────────────────┐
                        │            CLIENT LAYER                  │
                        │                                          │
                        │   React 18 / TypeScript / Tailwind CSS   │
                        │   Vite / React Query / Zustand           │
                        │   Recharts / Framer Motion               │
                        │              Port 3064                   │
                        └──────────────────┬───────────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────────┐
                        │          NGINX GATEWAY LAYER             │
                        │                                          │
                        │   Reverse Proxy / Static File Serving    │
                        │   Load Balancing / SSL Termination       │
                        └──────────────────┬───────────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────────┐
                        │            BFF LAYER                     │
                        │                                          │
                        │   Node.js 20 / Express / TypeScript      │
                        │   WebSocket (ws) / Helmet / Rate Limit   │
                        │   Request Aggregation & Validation       │
                        │              Port 4064                   │
                        └────────┬─────────────────────┬───────────┘
                                 │                     │
                                 ▼                     ▼
              ┌────────────────────────────┐  ┌────────────────────────────┐
              │      BACKEND LAYER         │  │      AI / MCP LAYER        │
              │                            │  │                            │
              │  Django 5.1 / DRF 3.15     │  │  FastMCP 1.15              │
              │  Celery 5.4 / Channels     │  │  LangChain 0.3.20+        │
              │  Gunicorn / A2A Agents     │  │  OpenAI gpt-4o-mini       │
              │         Port 8064          │◄►│  10 AI-Powered Tools       │
              │                            │  │         Port 8165          │
              └──────┬──────────┬──────────┘  └────────────────────────────┘
                     │          │
                     ▼          ▼
              ┌─────────────────────────────────────────────────────────────┐
              │                      DATA LAYER                            │
              │                                                            │
              │  ┌──────────────────┐   ┌────────────────────────────────┐ │
              │  │  PostgreSQL 16   │   │  Redis 7                       │ │
              │  │  Port 5432       │   │  Port 6379                     │ │
              │  │  Primary DB      │   │  Cache / Celery Broker /       │ │
              │  │                  │   │  WebSocket Channel Layer       │ │
              │  └──────────────────┘   └──────────┬─────────────────────┘ │
              │                                    │                       │
              │                         ┌──────────┼──────────┐            │
              │                         ▼          ▼          ▼            │
              │                   ┌──────────┐ ┌────────┐ ┌──────────┐    │
              │                   │  Celery   │ │ Celery │ │  Flower  │    │
              │                   │  Worker   │ │  Beat  │ │  :5555   │    │
              │                   └──────────┘ └────────┘ └──────────┘    │
              └─────────────────────────────────────────────────────────────┘
```

### Services (Docker Compose)

The application runs as 9 interconnected services managed by Docker Compose:

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| **frontend** | React 18 / TypeScript / Tailwind CSS | 3064 | Modern SaaS UI with dark mode, served via Nginx |
| **bff** | Node.js 20 / Express / TypeScript | 4064 | API gateway with WebSocket support, rate limiting, request aggregation |
| **backend** | Django 5.1 / DRF / Celery / Channels | 8064 | Business logic, models, REST API, agent orchestration |
| **mcp-server** | FastMCP 1.15 / LangChain / Python | 8165 | AI tool hosting via MCP streamable-http transport |
| **postgres** | PostgreSQL 16 Alpine | 5432 | Primary relational database |
| **redis** | Redis 7 Alpine | 6379 | Caching, Celery broker, WebSocket channel layer |
| **celery-worker** | Celery 5.4 | -- | Async task processing (queues: default, pitches, analytics) |
| **celery-beat** | Celery Beat | -- | Scheduled/periodic tasks |
| **flower** | Flower 2.0 | 5555 | Celery monitoring dashboard |

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI component library |
| TypeScript | 5 | Type-safe JavaScript |
| Vite | 6 | Build tool and dev server |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| React Query (TanStack) | 5 | Server state management and data fetching |
| Zustand | 5 | Client state management |
| Recharts | 2 | Data visualization and charting |
| Framer Motion | 11 | Animations and transitions |
| Lucide React | -- | Icon library |
| React Router | 6 | Client-side routing |
| React Hook Form | 7 | Form handling and validation |
| React Markdown | -- | Markdown rendering |

### BFF (Backend-for-Frontend)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 | Runtime environment |
| Express | 4 | HTTP server framework |
| TypeScript | 5 | Type-safe JavaScript |
| Axios | -- | HTTP client for backend communication |
| ws | 8 | WebSocket server for real-time updates |
| Helmet | -- | Security headers |
| compression | -- | Response compression |
| express-rate-limit | -- | API rate limiting |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Django | 5.1 | Web framework |
| Django REST Framework | 3.15 | REST API toolkit |
| Celery | 5.4 | Distributed task queue |
| Django Channels | 4.2 | WebSocket and async support |
| Django Celery Beat | -- | Periodic task scheduler |
| Django Filter | -- | Queryset filtering |
| Gunicorn | -- | WSGI HTTP server |
| Daphne | -- | ASGI HTTP/WebSocket server |
| WhiteNoise | -- | Static file serving |

### AI / MCP
| Technology | Version | Purpose |
|-----------|---------|---------|
| FastMCP | 1.15 | Model Context Protocol server |
| LangChain | 0.3.20+ | LLM orchestration framework |
| LangChain OpenAI | 0.3 | OpenAI LLM integration |
| LangGraph | 0.6 | ReAct agent pattern |
| LangChain MCP Adapters | 0.1 | MCP tool integration |
| OpenAI gpt-4o-mini | -- | Default language model |
| psycopg2 | -- | Direct PostgreSQL access from MCP |

### Database and Infrastructure
| Technology | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 16 | Primary relational database |
| Redis | 7 | Cache, message broker, channel layer |
| Docker Compose | -- | Multi-service orchestration |
| Nginx | -- | Reverse proxy and static serving |
| Gunicorn | -- | Production WSGI server |
| Flower | 2.0 | Celery task monitoring |

---

## Key Features

### Customer Management
- **Customer 360-Degree View** with AI-powered enrichment and profiling
- **Lead Scoring** with composite scoring (0--100) across five factors and recommended actions
- **Customer Sentiment Analysis** from interaction history
- **Bulk Import** for batch customer onboarding
- **Search and Filtering** across all customer attributes

### AI Pitch Generation
- **Personalized Pitch Generation** crafted by LLM with configurable tone and templates
- **Automated Pitch Scoring** on persuasiveness, clarity, and relevance (0--1.0 scale)
- **Iterative Refinement** based on scoring feedback until quality threshold is met
- **Version History** with full pitch lineage tracking via parent-child relationships
- **Pitch Comparison** with side-by-side version and variant analysis
- **PDF/DOCX/TXT Export** for sharing and offline use
- **Template Library** for reusable, consistent pitch creation

### Campaign Management
- **Multi-Channel Campaigns** with targeting, budgets, and goals
- **A/B Testing** to generate and compare pitch variants with different messaging strategies
- **Email Subject Line Generation** with multiple AI-generated style options
- **Follow-Up Sequences** with timed multi-email campaigns and varied strategies
- **Competitive Positioning** with industry-specific differentiators and talking points

### Multi-Agent System
- **6 Specialized AI Agents** (Research, Pitch Generator, Scorer, Refiner, Strategy, Orchestrator)
- **A2A Communication Protocol** with structured message passing and correlation IDs
- **Full Audit Trail** for every agent interaction and decision
- **Configurable Thresholds** for quality gating and iteration limits

### Analytics and Monitoring
- **Analytics Dashboard** with KPIs, trends, agent performance metrics, and ROI tracking
- **Agent Performance Monitoring** with execution logs and success rates
- **Celery Task Monitoring** via Flower dashboard
- **Real-Time WebSocket Updates** for live progress during pitch generation

### Platform
- **Dark Mode** with full theme support across the UI
- **Responsive Design** for desktop and tablet use
- **WebSocket Integration** for real-time event streaming
- **Rate Limiting** and security headers via the BFF layer

---

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** (v2.0+)
- **OpenAI API key** (or a compatible LLM API endpoint)
- At least 4 GB of available RAM for all services

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd marketing-customer-pitch

# 2. Configure environment variables
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
# Optionally configure OPENAI_BASE_URL for compatible providers

# 3. Build and start all services
docker-compose up --build -d

# 4. Verify all services are healthy
docker-compose ps

# 5. Seed the database with sample customers and agent configurations
docker-compose exec backend python manage.py seed_data

# 6. Open the application in your browser
#    Frontend:  http://localhost:3064
#    API:       http://localhost:8064/api/v1/
#    BFF:       http://localhost:4064/api/v1/
```

### Default Credentials

| Account | Username | Password |
|---------|----------|----------|
| Django Admin | `admin` | `admin_pitch_2024` |

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3064 |
| Django Admin | http://localhost:8064/admin/ |
| Backend API | http://localhost:8064/api/v1/ |
| BFF API | http://localhost:4064/api/v1/ |
| MCP Server | http://localhost:8165/mcp |
| Flower Dashboard | http://localhost:5555 |

---

## Project Structure

```
marketing-customer-pitch/
├── frontend/                        # React / TypeScript SPA
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Card, Modal, LoadingSpinner, StatusBadge, etc.
│   │   │   └── layout/              # Header, Sidebar, Layout wrapper
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── customers/           # Customer List, Detail, Create views
│   │   │   ├── pitches/             # Pitch List, Detail, Generator views
│   │   │   ├── campaigns/           # Campaign List, Detail, Create views
│   │   │   ├── agents/              # Agent Dashboard
│   │   │   ├── analytics/           # Analytics Dashboard
│   │   │   ├── mcp/                 # MCP Tool Explorer
│   │   │   └── templates/           # Pitch Template Library
│   │   ├── services/                # API client layer (Axios)
│   │   ├── store/                   # Zustand state management stores
│   │   ├── types/                   # TypeScript type definitions
│   │   └── App.tsx                  # Root component with routing
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── bff/                             # Node.js Backend-for-Frontend
│   ├── src/                         # Express application (TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── backend/                         # Django API Server
│   ├── config/                      # Django project configuration
│   │   ├── settings.py              # Main settings
│   │   ├── urls.py                  # Root URL routing
│   │   ├── celery.py                # Celery app configuration
│   │   ├── asgi.py                  # ASGI entry point (Channels)
│   │   └── wsgi.py                  # WSGI entry point (Gunicorn)
│   ├── core/                        # Core app
│   │   ├── models.py                # BaseModel (UUID pk, timestamps, soft-delete)
│   │   ├── views.py                 # Health check endpoint
│   │   └── management/commands/     # Management commands (seed_data)
│   ├── customers/                   # Customers app
│   │   ├── models.py                # Customer, CustomerInteraction
│   │   ├── views.py                 # CRUD, 360° view, lead scoring, bulk import
│   │   └── serializers.py           # DRF serializers
│   ├── pitches/                     # Pitches app
│   │   ├── models.py                # Pitch (versioned, parent_pitch FK), PitchTemplate, PitchScore
│   │   ├── views.py                 # CRUD, generate, score, refine, export actions
│   │   └── serializers.py           # DRF serializers
│   ├── campaigns/                   # Campaigns app
│   │   ├── models.py                # Campaign, CampaignTarget
│   │   ├── views.py                 # Multi-channel management, A/B testing
│   │   └── serializers.py           # DRF serializers
│   ├── agents/                      # Agents app
│   │   ├── models.py                # AgentConfig, AgentExecution, A2AMessage
│   │   ├── services.py              # AgentService (LangChain), A2AService
│   │   └── views.py                 # Agent configs, execution logs, orchestrate
│   ├── analytics/                   # Analytics app
│   │   ├── models.py                # PitchAnalytics, DashboardMetric, AgentPerformance
│   │   └── views.py                 # Dashboard KPIs, trends, ROI metrics
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── mcp-server/                      # FastMCP Tool Server
│   ├── server.py                    # All 10 MCP tool definitions
│   ├── Dockerfile
│   └── requirements.txt
├── nginx/
│   └── nginx.conf                   # Nginx reverse proxy configuration
├── scripts/
│   └── entrypoint.sh                # Django startup script (migrate, collectstatic)
├── W7_MCP_Agent.ipynb               # Original Jupyter notebook (reference)
├── docker-compose.yml               # Multi-service orchestration
├── .env.example                     # Environment variable template
└── README.md
```

### Django Apps

| App | Models | Responsibilities |
|-----|--------|-----------------|
| **core** | `BaseModel` | UUID primary keys, `created_at`/`updated_at` timestamps, soft-delete, health check endpoint, seed data command |
| **customers** | `Customer`, `CustomerInteraction` | Customer CRUD, 360-degree view, lead scoring, bulk import, search and filtering |
| **pitches** | `Pitch`, `PitchTemplate`, `PitchScore` | Pitch generation, scoring, refinement, version history (parent_pitch FK), comparison, PDF/DOCX/TXT export |
| **campaigns** | `Campaign`, `CampaignTarget` | Multi-channel campaign management, A/B testing, launch and metrics tracking |
| **agents** | `AgentConfig`, `AgentExecution`, `A2AMessage` | Agent configuration, LangChain-based AgentService, A2AService for inter-agent messaging, orchestration pipeline |
| **analytics** | `PitchAnalytics`, `DashboardMetric`, `AgentPerformance` | Dashboard KPIs, trend analysis, agent performance metrics, ROI tracking |

---

## API Endpoints

All API endpoints are served under `/api/v1/` on the backend (port 8064) and proxied through the BFF (port 4064).

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Service health check with database and Redis connectivity status |

### Customers (`/api/v1/customers/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers/` | List all customers with search and filtering |
| POST | `/api/v1/customers/` | Create a new customer |
| GET | `/api/v1/customers/{id}/` | Retrieve customer details |
| PUT/PATCH | `/api/v1/customers/{id}/` | Update customer information |
| DELETE | `/api/v1/customers/{id}/` | Soft-delete a customer |
| GET | `/api/v1/customers/{id}/360-view/` | Full 360-degree customer profile with AI enrichment |
| POST | `/api/v1/customers/bulk-import/` | Bulk import customers from file |

### Pitches (`/api/v1/pitches/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pitches/` | List all pitches with filtering |
| POST | `/api/v1/pitches/` | Create a new pitch |
| GET | `/api/v1/pitches/{id}/` | Retrieve pitch details with scores and history |
| PUT/PATCH | `/api/v1/pitches/{id}/` | Update a pitch |
| DELETE | `/api/v1/pitches/{id}/` | Soft-delete a pitch |
| POST | `/api/v1/pitches/{id}/generate/` | Generate AI pitch content |
| POST | `/api/v1/pitches/{id}/score/` | Score a pitch for quality |
| POST | `/api/v1/pitches/{id}/refine/` | Refine a pitch based on feedback |
| GET | `/api/v1/pitches/{id}/export/` | Export pitch as PDF, DOCX, or TXT |
| GET | `/api/v1/pitches/{id}/history/` | Retrieve version history |
| GET | `/api/v1/pitches/templates/` | List available pitch templates |

### Campaigns (`/api/v1/campaigns/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/campaigns/` | List all campaigns |
| POST | `/api/v1/campaigns/` | Create a new campaign |
| GET | `/api/v1/campaigns/{id}/` | Retrieve campaign details with targets and metrics |
| PUT/PATCH | `/api/v1/campaigns/{id}/` | Update campaign settings |
| DELETE | `/api/v1/campaigns/{id}/` | Delete a campaign |
| POST | `/api/v1/campaigns/{id}/launch/` | Launch a campaign |
| GET | `/api/v1/campaigns/{id}/metrics/` | Retrieve campaign performance metrics |

### Agents (`/api/v1/agents/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents/` | List agent configurations |
| POST | `/api/v1/agents/` | Create a new agent configuration |
| GET | `/api/v1/agents/{id}/` | Retrieve agent details |
| GET | `/api/v1/agents/executions/` | List agent execution logs |
| POST | `/api/v1/agents/orchestrate/` | Trigger the full multi-agent pipeline |
| GET | `/api/v1/agents/a2a-messages/` | List A2A message history |

### Analytics (`/api/v1/analytics/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/dashboard/` | Dashboard KPIs and summary metrics |
| GET | `/api/v1/analytics/trends/` | Time-series trend data |
| GET | `/api/v1/analytics/agent-performance/` | Agent performance metrics |
| GET | `/api/v1/analytics/roi/` | ROI and conversion metrics |

### BFF API

The BFF layer (port 4064) proxies all backend endpoints and adds:
- **WebSocket support** at `ws://localhost:4064/ws` for real-time pitch generation progress
- **Request aggregation** to combine multiple backend calls into single responses
- **Rate limiting** to protect backend resources
- **Request validation** and sanitization

---

## Multi-Agent Pipeline

The system implements a multi-agent pipeline where six specialized agents communicate through structured A2A (Agent-to-Agent) messages. Each message is tracked with correlation IDs for complete audit trails.

### Agent Types

| Agent | Role | Description |
|-------|------|-------------|
| **Orchestrator** | Coordinator | Receives pitch requests, delegates to specialized agents, manages the pipeline flow |
| **Research** | Intelligence | Gathers customer data, industry analysis, pain points, and competitive landscape |
| **Pitch Generator** | Content Creator | Creates personalized pitch content using research context, tone settings, and templates |
| **Scorer** | Quality Evaluator | Evaluates pitch quality across persuasiveness, clarity, and relevance (0.0--1.0 each) |
| **Refiner** | Content Optimizer | Improves pitch based on specific scoring feedback via expert copywriter LLM prompts |
| **Strategy** | Advisor | Provides strategic recommendations for campaign and messaging approaches |

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
   ├── YES --> Final pitch delivered with full audit trail
   └── NO  --> Refinement Agent improves pitch based on feedback
                (loops back to step 4, max 3 iterations)
         │
         ▼
6. Final pitch delivered with scores, version history,
   and complete A2A message trail
```

### A2A Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| **request** | Agent -> Agent | One agent asks another to perform a task |
| **response** | Agent -> Agent | Agent returns results to the requester |
| **delegate** | Orchestrator -> Agent | Orchestrator assigns work to a specialized agent |
| **broadcast** | Agent -> All | Agent notifies multiple agents of an event |

All messages include correlation IDs, timestamps, sender/receiver identification, and payload data for full traceability.

---

## MCP Tools

The MCP server exposes 10 AI-powered tools via the streamable-http transport at `http://localhost:8165/mcp`. All tools include LLM-powered analysis with graceful fallbacks when the AI provider is unavailable.

| # | Tool | Input | Description |
|---|------|-------|-------------|
| 1 | `research_customer` | Customer name or ID | Look up customer profile from PostgreSQL with in-memory fallback data |
| 2 | `initial_pitch_prompt` | Customer info, tone, template | Generate a structured pitch prompt incorporating customer context |
| 3 | `score_pitch` | Pitch content | Evaluate pitch quality on persuasiveness, clarity, and relevance (1--10 each) |
| 4 | `refine_pitch` | Pitch content, feedback | Rewrite a pitch incorporating specific feedback via expert copywriter LLM |
| 5 | `analyze_customer_sentiment` | Customer interactions | Analyze interaction history for sentiment score, engagement level, and approach |
| 6 | `generate_subject_line` | Pitch content, style | Generate 3 compelling email subject line options with reasoning |
| 7 | `competitive_positioning` | Industry, company | Industry analysis with trends, competitor weaknesses, and differentiators |
| 8 | `pitch_ab_variants` | Pitch content, count | Generate A/B test variants with different messaging strategies |
| 9 | `calculate_lead_score` | Customer data | Calculate composite lead score (0--100) with five-factor breakdown |
| 10 | `generate_followup_sequence` | Pitch, customer | Create timed follow-up email sequences with varied approaches |

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/` | Overview with KPIs, recent pitches, active campaigns, and quick actions |
| **Customer List** | `/customers` | Searchable, filterable table of all customers |
| **Customer Detail** | `/customers/:id` | 360-degree customer view with interactions, pitches, and AI insights |
| **Customer Create** | `/customers/new` | Form for adding new customers |
| **Pitch List** | `/pitches` | All pitches with status filtering and sorting |
| **Pitch Generator** | `/pitches/generate` | AI pitch generation wizard with tone, template, and customer selection |
| **Pitch Detail** | `/pitches/:id` | Full pitch view with scores, version history, comparison, and export |
| **Campaign List** | `/campaigns` | Active and past campaigns with performance summaries |
| **Campaign Detail** | `/campaigns/:id` | Campaign metrics, targets, and A/B test results |
| **Campaign Create** | `/campaigns/new` | Multi-step campaign creation form |
| **Agent Dashboard** | `/agents` | Agent configurations, execution logs, and A2A message explorer |
| **Analytics Dashboard** | `/analytics` | Charts and KPIs for pitch performance, agent metrics, and ROI |
| **MCP Tool Explorer** | `/mcp` | Interactive interface to test and explore all 10 MCP tools |
| **Template Library** | `/templates` | Browse, create, and manage reusable pitch templates |

---

## Configuration

### Environment Variables

All environment variables are defined in `.env.example`. Copy it to `.env` and customize:

```bash
cp .env.example .env
```

#### Required

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key for LLM access |

#### AI / LLM Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_MODEL` | `gpt-4o-mini` | LLM model name |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | LLM API base URL (change for compatible providers) |
| `OPENAI_TEMPERATURE` | `0.7` | LLM sampling temperature |
| `OPENAI_MAX_TOKENS` | `4096` | Maximum tokens per LLM request |

#### Agent Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_SCORE_THRESHOLD` | `0.7` | Minimum pitch score to skip refinement (0.0--1.0) |
| `AGENT_MAX_REFINEMENT_ITERATIONS` | `3` | Maximum refinement loop iterations |

#### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (constructed from parts) | Full database connection URL |
| `POSTGRES_DB` | `marketing_pitch_db` | Database name |
| `POSTGRES_USER` | `pitch_user` | Database user |
| `POSTGRES_PASSWORD` | `pitch_secure_password_2024` | Database password |

#### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL |

#### Django

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` / `DJANGO_SECRET_KEY` | (insecure default) | Django secret key -- change in production |
| `DJANGO_DEBUG` | `True` | Debug mode -- set to `False` in production |

---

## Development

### Running with Docker (Recommended)

```bash
# Start all services
docker-compose up --build -d

# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f backend

# Restart a single service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

### Running Services Locally

For local development outside Docker, ensure PostgreSQL and Redis are running and accessible.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173 (Vite dev server)
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
python manage.py seed_data
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

### Testing

```bash
# Run backend tests
docker-compose exec backend python manage.py test

# Run frontend tests
docker-compose exec frontend npm test

# Run BFF tests
docker-compose exec bff npm test
```

### Database Operations

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create a new migration
docker-compose exec backend python manage.py makemigrations

# Seed sample data
docker-compose exec backend python manage.py seed_data

# Access Django shell
docker-compose exec backend python manage.py shell

# Access database directly
docker-compose exec postgres psql -U pitch_user -d marketing_pitch_db
```

---

## Contributing

Contributions are welcome. Please follow these guidelines:

1. **Fork** the repository and create a feature branch from `main`.
2. **Follow existing code style** and conventions:
   - Python: PEP 8, Django conventions
   - TypeScript: ESLint configuration in the project
   - Commit messages: imperative mood, concise summaries
3. **Write tests** for new features and bug fixes.
4. **Update documentation** if your changes affect the API, configuration, or architecture.
5. **Run the full test suite** before submitting a pull request.
6. **Create a pull request** with a clear description of the changes and their motivation.

### Branch Naming

- `feature/<description>` for new features
- `fix/<description>` for bug fixes
- `refactor/<description>` for code refactoring
- `docs/<description>` for documentation updates

---

## License

MIT
