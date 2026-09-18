# Debugging App Backend

This backend provides a lightweight FastAPI foundation for the debugging app prototype.

## Quick start

1. Create a virtual environment.
2. Install dependencies:

   pip install -r requirements.txt

3. Apply database migrations:

   alembic -c backend/alembic.ini upgrade head

4. Start the app:

   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

For production-style analysis processing, start Redis and run the worker in a second process:

   python -m backend.worker

5. Run API integration tests:

   pytest backend/tests -q

## Included features

- user registration and JWT bearer-token login endpoints
- project management
- file upload and metadata persistence
- analysis job execution
- structured error findings with suggestions
- basic admin access pattern

## Notes

This is intentionally lightweight and suitable for a prototype or early product MVP. It uses SQLite for local development and Alembic for explicit schema changes. Set `DATABASE_URL` to a PostgreSQL connection string for shared environments.

To start PostgreSQL and Redis together with Docker Compose:

   docker compose up -d postgres redis

Then set `DATABASE_URL` to the PostgreSQL example in `.env.example`, run the Alembic migration, and start the API and worker.

Set a strong `SECRET_KEY` and change the demo admin credentials before deploying outside local development.

## AI provider configuration

The default `AI_PROVIDER=deterministic` requires no external service. To enable an OpenAI-compatible provider, set `AI_PROVIDER=openai-compatible`, provide `AI_API_KEY`, and optionally set `AI_MODEL` and `AI_BASE_URL` in `.env`. Keep these values server-side and never expose them through the frontend.
