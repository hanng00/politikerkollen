# Stage 1: Builder image with uv and build dependencies
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
ENV UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Install system dependencies required to build native extensions
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        build-essential \
        python3-dev \
        git \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (for better layer caching)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=ingestion/pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=ingestion/uv.lock,target=uv.lock \
    uv sync --frozen --no-install-project --no-dev

# Copy ingestion directory to /app
COPY ingestion/ /app/

# Install project with dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Stage 2: Final lightweight image without uv
FROM python:3.11-slim-bookworm

WORKDIR /app

# Copy the built app from builder
COPY --from=builder --chown=root:root /app /app

# Ensure the virtual environment is used by default
ENV PATH="/app/.venv/bin:$PATH"

# Make CLI executable
RUN chmod +x cli.py

# Set entrypoint
ENTRYPOINT ["python", "cli.py"]
