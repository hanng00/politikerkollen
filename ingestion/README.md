# Ingestion Module

DLT-based data ingestion container.

## Usage

Build the container:

```bash
docker build -t ingestion .
```

Run ingestion:

```bash
docker run --rm \
  -e MOTHERDUCK_ACCESS_TOKEN=your_token \
  -e DATABASE_NAME=spatial_dagster \
  ingestion run anforandelista \
  --start-date=2024-01-01 \
  --end-date=2024-01-31
```

## Development

Install dependencies with uv:

```bash
uv sync
```

Run CLI locally:

```bash
uv run python cli.py run anforandelista
```
