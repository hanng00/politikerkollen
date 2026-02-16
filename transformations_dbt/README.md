# Transformations DBT Module

DBT transformations container.

## Usage

Build the container:
```bash
docker build -t transformations_dbt .
```

Run dbt:
```bash
docker run --rm \
  -e MOTHERDUCK_ACCESS_TOKEN=your_token \
  -e DBT_TARGET=dev \
  transformations_dbt run \
  --select stg.*
```

## Development

Install dependencies with uv:
```bash
uv sync
```

Run dbt locally:
```bash
uv run python cli.py run --select stg.*
```

