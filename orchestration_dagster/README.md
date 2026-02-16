# Orchestration Dagster

Dagster orchestration for the spatial data pipeline.

## Development

### Setup

Install dependencies with uv:
```bash
uv sync
```

### Prepare DBT Project

Before running Dagster, prepare the dbt project (runs `dbt deps` and `dbt parse`):
```bash
uv run dagster-dbt project prepare-and-package --components .
```

This creates/updates `manifest.json` which `DbtProjectComponent` needs to create asset definitions.

### Running Dagster

Start the Dagster UI:
```bash
dg dev
```

Or with uv:
```bash
uv run dagster dev
```

Open http://localhost:3000 in your browser.

## Building Docker Image

Build the Docker image from the project root:
```bash
# From spatial/ directory
docker build -f orchestration_dagster/Dockerfile -t orchestration_dagster:latest .
```

The Dockerfile will:
1. Install dependencies with `uv sync`
2. Copy the dbt project
3. Run `uv run dagster-dbt project prepare-and-package` to prepare the manifest
4. Set up Dagster to run

## Architecture

- **DbtProjectComponent**: Reads dbt manifest and creates asset definitions (for UI/lineage)
- **Execution**: Will execute dbt models via Docker containers (to be implemented)
- **Assets**: All dbt models appear as assets in Dagster UI automatically

## Learn more

- [Dagster Documentation](https://docs.dagster.io/)
- [Dagster dbt Integration](https://docs.dagster.io/integrations/libraries/dbt)
