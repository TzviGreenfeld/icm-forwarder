FROM python:3.11-slim

WORKDIR /app

# Install uv (faster than pip)
RUN pip install uv

# Install dependencies with uv
RUN uv pip install fastapi uvicorn sqlalchemy asyncpg psycopg2-binary alembic --system

COPY *.py ./

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
