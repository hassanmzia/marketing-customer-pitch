"""
MCP Server for the AI Marketing Customer Pitch Assistant.

Exposes marketing pitch tools via MCP's streamable-http transport.
Connects to PostgreSQL for customer data with fallback to an in-memory database.
Uses OpenAI-compatible LLM for pitch scoring, refinement, and generation.
"""

import json
import logging
import os
import re
from contextlib import asynccontextmanager

import psycopg2
import uvicorn
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route, Mount

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("mcp_server")

# ---------------------------------------------------------------------------
# Fallback in-memory customer database (mirrors the notebook)
# ---------------------------------------------------------------------------

CUSTOMER_DB: dict[str, str] = {
    "Acme Corp": (
        "Leading manufacturer of road runner catching devices. "
        "Known for innovation and quality."
    ),
    "Beta LLC": (
        "Specializes in eco-friendly home products, strong community presence."
    ),
    "Gamma Tech": (
        "Emerging startup in AI-driven logistics software. "
        "Focuses on automation and scalability for e-commerce."
    ),
    "Delta Foods": (
        "Family-owned organic food producer emphasizing sustainable farming "
        "and direct-to-consumer sales."
    ),
    "Epsilon Media": (
        "Digital marketing agency with expertise in social media campaigns "
        "and content creation for B2B clients."
    ),
    "Zeta Renewables": (
        "Provider of solar energy solutions for residential and commercial "
        "buildings. Committed to green energy transition."
    ),
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_llm() -> ChatOpenAI:
    """Return a ChatOpenAI instance configured from environment variables."""
    return ChatOpenAI(
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0,
    )


def _get_pg_connection():
    """Create and return a psycopg2 connection using environment variables."""
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=int(os.environ.get("POSTGRES_PORT", "5464")),
        dbname=os.environ.get("POSTGRES_DB", "marketing_db"),
        user=os.environ.get("POSTGRES_USER", "postgres"),
        password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
    )


def _lookup_customer_in_db(name: str) -> str | None:
    """Query the customers_customer table for a customer by name.

    Returns a formatted profile string or None if the customer is not found
    or the database is unreachable.
    """
    try:
        conn = _get_pg_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT name, company, industry, description,
                           preferences, customer_360_data
                    FROM customers_customer
                    WHERE LOWER(name) = LOWER(%s)
                    LIMIT 1
                    """,
                    (name,),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                col_names = [
                    "name",
                    "company",
                    "industry",
                    "description",
                    "preferences",
                    "customer_360_data",
                ]
                profile_parts: list[str] = []
                for col, val in zip(col_names, row):
                    if val:
                        profile_parts.append(f"{col}: {val}")
                return "\n".join(profile_parts)
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("PostgreSQL lookup failed for '%s': %s", name, exc)
        return None


# ---------------------------------------------------------------------------
# MCP Server Instance
# ---------------------------------------------------------------------------

mcp = FastMCP(
    "Marketing Pitch MCP Tools",
    host="0.0.0.0",
    port=8165,
    stateless_http=True,
    json_response=True,
)

# ---------------------------------------------------------------------------
# Tool 1: research_customer
# ---------------------------------------------------------------------------


@mcp.tool()
def research_customer(name: str) -> str:
    """Look up customer profile from the database.

    Searches the PostgreSQL customers_customer table first. If the database is
    unavailable or the customer is not found there, falls back to the built-in
    customer directory.

    Args:
        name: The customer or company name to look up.

    Returns:
        A text description of the customer profile.
    """
    logger.info("research_customer called for: %s", name)

    # Try PostgreSQL first
    db_result = _lookup_customer_in_db(name)
    if db_result:
        logger.info("Customer '%s' found in PostgreSQL.", name)
        return db_result

    # Fallback to in-memory database
    fallback = CUSTOMER_DB.get(name)
    if fallback:
        logger.info("Customer '%s' found in fallback CUSTOMER_DB.", name)
        return fallback

    return f"No customer data found for '{name}'."


# ---------------------------------------------------------------------------
# Tool 2: initial_pitch_prompt
# ---------------------------------------------------------------------------


@mcp.tool()
def initial_pitch_prompt(
    customer_name: str,
    customer_info: str,
    tone: str = "professional",
) -> str:
    """Generate a structured pitch prompt incorporating customer info and tone.

    This returns a prompt string that the LLM agent can use to craft an
    actual sales pitch.

    Args:
        customer_name: Name of the customer or company.
        customer_info: Background information about the customer.
        tone: Desired tone for the pitch (e.g. professional, friendly, urgent).

    Returns:
        A formatted prompt string for pitch generation.
    """
    logger.info(
        "initial_pitch_prompt called for: %s (tone=%s)", customer_name, tone
    )
    return (
        f"Create a persuasive, personalized sales pitch for {customer_name}. "
        f"Incorporate this customer info: {customer_info}. "
        f"Use a {tone} tone throughout the pitch. "
        f"Keep it concise, engaging, and focused on value. "
        f"Structure as an email with subject line, greeting, body (2-4 paragraphs), "
        f"and professional sign-off."
    )


# ---------------------------------------------------------------------------
# Tool 3: score_pitch
# ---------------------------------------------------------------------------


@mcp.tool()
def score_pitch(pitch: str) -> str:
    """Score a sales pitch on persuasiveness, clarity, and relevance.

    Uses an LLM to evaluate the pitch and return scores from 1-10 for each
    dimension. Falls back to neutral scores if the LLM call fails.

    Args:
        pitch: The full text of the sales pitch to evaluate.

    Returns:
        A JSON string with persuasiveness, clarity, and relevance scores.
    """
    logger.info("score_pitch called (pitch length: %d chars)", len(pitch))

    prompt = (
        "Evaluate the following sales pitch on persuasiveness, clarity, and relevance. "
        "Score each from 1 to 10 and output JSON only:\n\n"
        f"{pitch}\n\n"
        'Expected format: {{"persuasiveness": <int>, "clarity": <int>, "relevance": <int>}}'
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        json_match = re.search(r"\{.*\}", response.content, re.DOTALL)
        if json_match:
            # Validate it is proper JSON
            parsed = json.loads(json_match.group(0))
            return json.dumps(parsed)
    except Exception as exc:
        logger.error("LLM scoring failed: %s", exc)

    # Fallback scores
    fallback = {"persuasiveness": 5, "clarity": 5, "relevance": 5}
    logger.info("Returning fallback scores.")
    return json.dumps(fallback)


# ---------------------------------------------------------------------------
# Tool 4: refine_pitch
# ---------------------------------------------------------------------------


@mcp.tool()
def refine_pitch(pitch: str, feedback: str) -> str:
    """Rewrite a sales pitch incorporating specific feedback.

    Uses an LLM acting as an expert sales copywriter to refine the pitch.
    If the LLM is unavailable, returns the original pitch with the feedback
    appended.

    Args:
        pitch: The original sales pitch text.
        feedback: Specific feedback to incorporate into the revised pitch.

    Returns:
        The refined pitch text.
    """
    logger.info("refine_pitch called (feedback: %s)", feedback[:80])

    system_prompt = (
        "You are an expert sales copywriter specializing in personalized B2B pitches. "
        "Rewrite the following sales pitch to explicitly incorporate the feedback: make "
        "targeted changes such as shortening sentences, adding innovative elements, or "
        "enhancing calls-to-action. Ensure the revised pitch is engaging, concise "
        "(under 150 words), and structured as an email with a compelling subject line, "
        "greeting, body (2-4 paragraphs), and professional sign-off. Focus on value, "
        "personalization, and the customer's needs to boost persuasiveness."
    )

    user_prompt = (
        f"Original Pitch:\n{pitch}\n\n"
        f"Feedback to Incorporate: {feedback}\n\n"
        f"Revised Pitch:"
    )

    try:
        llm = get_llm()
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])
        return response.content
    except Exception as exc:
        logger.error("LLM refinement failed: %s", exc)
        return (
            f"[Refinement failed \u2013 returning original with feedback]\n\n"
            f"{pitch}\n\nFeedback: {feedback}"
        )


# ---------------------------------------------------------------------------
# Tool 5: analyze_customer_sentiment
# ---------------------------------------------------------------------------


@mcp.tool()
def analyze_customer_sentiment(
    customer_name: str,
    interaction_history: str,
) -> str:
    """Analyze customer interaction history to determine sentiment and engagement.

    Uses an LLM to assess the overall sentiment and engagement level from
    past interactions, then recommends an outreach approach.

    Args:
        customer_name: Name of the customer.
        interaction_history: Text describing past interactions with the customer.

    Returns:
        A JSON string with sentiment_score (-1 to 1), engagement_level
        (low/medium/high), and recommended_approach.
    """
    logger.info("analyze_customer_sentiment called for: %s", customer_name)

    prompt = (
        f"Analyze the following interaction history for {customer_name} and return "
        f"a JSON object with exactly these keys:\n"
        f'- "sentiment_score": a float from -1.0 (very negative) to 1.0 (very positive)\n'
        f'- "engagement_level": one of "low", "medium", or "high"\n'
        f'- "recommended_approach": a brief recommendation for next outreach\n\n'
        f"Interaction History:\n{interaction_history}\n\n"
        f"Return JSON only."
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        json_match = re.search(r"\{.*\}", response.content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return json.dumps(parsed)
    except Exception as exc:
        logger.error("Sentiment analysis failed: %s", exc)

    fallback = {
        "sentiment_score": 0.0,
        "engagement_level": "medium",
        "recommended_approach": (
            "Insufficient data for analysis. Consider a neutral, "
            "value-driven outreach approach."
        ),
    }
    return json.dumps(fallback)


# ---------------------------------------------------------------------------
# Tool 6: generate_subject_line
# ---------------------------------------------------------------------------


@mcp.tool()
def generate_subject_line(pitch: str, style: str = "professional") -> str:
    """Generate compelling email subject lines for a sales pitch.

    Creates three subject line options with reasoning for each.

    Args:
        pitch: The full pitch text to derive subject lines from.
        style: Style of subject lines (e.g. professional, casual, urgent).

    Returns:
        A JSON string with a list of 3 subject line options and reasoning.
    """
    logger.info("generate_subject_line called (style=%s)", style)

    prompt = (
        f"Based on the following sales pitch, generate exactly 3 compelling email "
        f"subject line options in a {style} style. Return a JSON object with a "
        f'"subject_lines" key containing a list of objects, each with "subject" and '
        f'"reasoning" keys.\n\n'
        f"Pitch:\n{pitch}\n\n"
        f"Return JSON only."
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        json_match = re.search(r"\{.*\}", response.content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return json.dumps(parsed)
    except Exception as exc:
        logger.error("Subject line generation failed: %s", exc)

    fallback = {
        "subject_lines": [
            {
                "subject": "Partnership Opportunity \u2013 Let\u2019s Connect",
                "reasoning": "Generic professional opener.",
            },
            {
                "subject": "A Solution Tailored for Your Business",
                "reasoning": "Value-focused subject line.",
            },
            {
                "subject": "Quick Question About Your Growth Plans",
                "reasoning": "Curiosity-driven opener to boost open rates.",
            },
        ]
    }
    return json.dumps(fallback)


# ---------------------------------------------------------------------------
# Tool 7: competitive_positioning
# ---------------------------------------------------------------------------


@mcp.tool()
def competitive_positioning(customer_name: str, industry: str) -> str:
    """Generate a competitive positioning analysis for the customer's industry.

    Produces key differentiators, talking points, and positioning strategy
    relative to common competitors in the industry.

    Args:
        customer_name: Name of the customer or company.
        industry: The industry vertical to analyze.

    Returns:
        A text analysis with key differentiators and talking points.
    """
    logger.info(
        "competitive_positioning called for: %s (industry=%s)",
        customer_name,
        industry,
    )

    prompt = (
        f"You are a competitive intelligence analyst. Generate a competitive "
        f"positioning analysis for pitching to {customer_name} in the {industry} "
        f"industry. Include:\n"
        f"1. Key industry trends (2-3 bullet points)\n"
        f"2. Common competitor weaknesses to exploit (2-3 points)\n"
        f"3. Recommended differentiators for our pitch (3-4 points)\n"
        f"4. Specific talking points tailored to {customer_name}\n\n"
        f"Be concise but actionable."
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as exc:
        logger.error("Competitive positioning failed: %s", exc)

    return (
        f"Competitive Positioning for {customer_name} ({industry}):\n\n"
        f"- Focus on innovation and technology leadership.\n"
        f"- Emphasize ROI and measurable outcomes.\n"
        f"- Highlight superior customer support and onboarding.\n"
        f"- Position against incumbents by stressing agility and customization.\n\n"
        f"(Auto-generated fallback \u2013 LLM unavailable)"
    )


# ---------------------------------------------------------------------------
# Tool 8: pitch_ab_variants
# ---------------------------------------------------------------------------


@mcp.tool()
def pitch_ab_variants(pitch: str, num_variants: int = 2) -> str:
    """Generate A/B test variants of a sales pitch.

    Creates alternative versions of the pitch with specific modifications
    to test different messaging strategies.

    Args:
        pitch: The original pitch text.
        num_variants: Number of variants to generate (default 2).

    Returns:
        A JSON string with variant pitches and descriptions of what changed.
    """
    logger.info("pitch_ab_variants called (num_variants=%d)", num_variants)

    prompt = (
        f"You are a marketing optimization specialist. Generate exactly "
        f"{num_variants} A/B test variant(s) of the following sales pitch. "
        f"For each variant, make meaningful changes to test different approaches "
        f"(e.g. tone shift, different value proposition emphasis, alternative CTA). "
        f"Return a JSON object with a \"variants\" key containing a list of objects, "
        f"each with \"variant_label\", \"pitch\", and \"changes_made\" keys.\n\n"
        f"Original Pitch:\n{pitch}\n\n"
        f"Return JSON only."
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        json_match = re.search(r"\{.*\}", response.content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return json.dumps(parsed)
    except Exception as exc:
        logger.error("A/B variant generation failed: %s", exc)

    # Fallback: return single variant with minor change note
    fallback = {
        "variants": [
            {
                "variant_label": f"Variant {i + 1}",
                "pitch": pitch,
                "changes_made": "No changes applied (LLM unavailable).",
            }
            for i in range(num_variants)
        ]
    }
    return json.dumps(fallback)


# ---------------------------------------------------------------------------
# Tool 9: calculate_lead_score
# ---------------------------------------------------------------------------


@mcp.tool()
def calculate_lead_score(customer_data: str) -> str:
    """Calculate a lead score (0-100) based on customer data.

    Uses an LLM to evaluate multiple factors such as company size, engagement
    history, and budget indicators to produce a composite lead score.

    Args:
        customer_data: Text description of the customer data and attributes.

    Returns:
        A JSON string with overall score, factor breakdown, and recommended actions.
    """
    logger.info("calculate_lead_score called")

    prompt = (
        "You are a sales intelligence analyst. Based on the following customer data, "
        "calculate a lead score from 0 to 100. Return a JSON object with:\n"
        '- "score": integer 0-100\n'
        '- "factors": an object with scoring factors and their individual scores, '
        "e.g. company_size, engagement_level, budget_signals, industry_fit, "
        "timing_indicators (each 0-20)\n"
        '- "recommended_actions": a list of 2-3 actionable next steps\n\n'
        f"Customer Data:\n{customer_data}\n\n"
        "Return JSON only."
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        json_match = re.search(r"\{.*\}", response.content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return json.dumps(parsed)
    except Exception as exc:
        logger.error("Lead score calculation failed: %s", exc)

    fallback = {
        "score": 50,
        "factors": {
            "company_size": 10,
            "engagement_level": 10,
            "budget_signals": 10,
            "industry_fit": 10,
            "timing_indicators": 10,
        },
        "recommended_actions": [
            "Gather more data on decision-maker contacts.",
            "Schedule a discovery call to assess fit.",
            "Send a tailored case study for their industry.",
        ],
    }
    return json.dumps(fallback)


# ---------------------------------------------------------------------------
# Tool 10: generate_followup_sequence
# ---------------------------------------------------------------------------


@mcp.tool()
def generate_followup_sequence(
    pitch: str,
    customer_name: str,
    num_emails: int = 3,
) -> str:
    """Generate a follow-up email sequence after an initial sales pitch.

    Creates a timed sequence of follow-up emails with varying approaches
    to maintain engagement and drive conversion.

    Args:
        pitch: The original pitch that was sent.
        customer_name: Name of the customer.
        num_emails: Number of follow-up emails to generate (default 3).

    Returns:
        A JSON string with a sequence of follow-up emails including timing,
        subject, and body.
    """
    logger.info(
        "generate_followup_sequence called for: %s (num_emails=%d)",
        customer_name,
        num_emails,
    )

    prompt = (
        f"You are an expert email marketing strategist. Based on the initial pitch "
        f"below sent to {customer_name}, generate a follow-up email sequence of "
        f"exactly {num_emails} emails. Return a JSON object with a \"sequence\" key "
        f"containing a list of objects, each with:\n"
        f'- "email_number": integer\n'
        f'- "send_after_days": days after the initial pitch to send\n'
        f'- "subject": email subject line\n'
        f'- "body": full email body\n'
        f'- "strategy": brief note on the approach for this email\n\n'
        f"Initial Pitch:\n{pitch}\n\n"
        f"Return JSON only."
    )

    try:
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        json_match = re.search(r"\{.*\}", response.content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            return json.dumps(parsed)
    except Exception as exc:
        logger.error("Follow-up sequence generation failed: %s", exc)

    # Fallback sequence
    fallback = {
        "sequence": [
            {
                "email_number": i + 1,
                "send_after_days": (i + 1) * 3,
                "subject": f"Following Up \u2013 {customer_name} Partnership",
                "body": (
                    f"Hi {customer_name} team,\n\n"
                    f"I wanted to follow up on my previous message. "
                    f"I'd love to explore how we can work together.\n\n"
                    f"Best regards"
                ),
                "strategy": "Standard follow-up (LLM unavailable).",
            }
            for i in range(num_emails)
        ]
    }
    return json.dumps(fallback)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def health_check(request):
    """Health check endpoint for Docker healthcheck."""
    return JSONResponse({"status": "ok"})


if __name__ == "__main__":
    logger.info(
        "Starting Marketing Pitch MCP Server on 0.0.0.0:8165 "
        "(streamable-http transport)"
    )

    # Get the MCP ASGI app
    mcp_app = mcp.streamable_http_app()

    # Starlette does not propagate lifespans to mounted sub-apps, so we
    # must explicitly start the MCP session manager's task group here.
    # The session_manager lives on the FastMCP instance after calling
    # streamable_http_app(), or on the returned app object itself.
    _sm = getattr(mcp, "session_manager", None) or getattr(mcp_app, "session_manager", None)
    if _sm is None:
        logger.warning("Could not find session_manager on FastMCP or mcp_app — "
                        "task group may not initialize correctly")

    @asynccontextmanager
    async def lifespan(app):
        if _sm is not None:
            async with _sm.run():
                logger.info("MCP session manager started")
                yield
        else:
            yield

    # Wrap in a Starlette app that adds /health
    app = Starlette(
        routes=[
            Route("/health", health_check),
            Mount("/", app=mcp_app),
        ],
        lifespan=lifespan,
    )

    uvicorn.run(app, host="0.0.0.0", port=8165)
