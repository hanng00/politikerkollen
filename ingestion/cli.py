#!/usr/bin/env python3
"""
CLI interface for ingestion container.

Usage:
    ingestion-cli run <resource> [--start-date=YYYY-MM-DD] [--end-date=YYYY-MM-DD] [--database=NAME] [--verbose]
"""
import argparse
import logging
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from dlt import pipeline
from dlt.common import logger as dlt_logger
from ingestion.motherduck import create_motherduck_destination
from ingestion.sources.riksdagen.resources import (
    anforande,
    anforandelista,
    dokumentlista,
    dokumentstatus,
    personlista,
    voteringlista,
)
from ingestion.sources.snd import tidoavtalet, valmanifest


def setup_dlt() -> None:
    """Configure dlt HTTP client for Riksdagen API (slow, large responses)."""
    from dlt.common.configuration.specs import RuntimeConfiguration
    from dlt.sources.helpers import requests as dlt_requests

    dlt_requests.init(
        RuntimeConfiguration(
            request_timeout=180,
            request_max_attempts=10,
            request_backoff_factor=2,
            request_max_retry_delay=60,
        )
    )


def setup_logging(verbose: bool = False):
    """Configure logging for dlt and the CLI."""
    level = logging.DEBUG if verbose else logging.INFO
    
    # Configure root logger
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
    )
    
    # Configure dlt logger
    dlt_log = logging.getLogger("dlt")
    dlt_log.setLevel(level)
    
    # Also set urllib3 to see HTTP requests in verbose mode
    if verbose:
        logging.getLogger("urllib3").setLevel(logging.DEBUG)
    
    return logging.getLogger(__name__)


def get_database_name() -> str:
    """Get database name from env or default."""
    return os.environ.get("DATABASE_NAME", "spatial_dagster")


def create_local_duckdb_destination(db_path: str):
    """Create a local DuckDB destination."""
    import dlt
    return dlt.destinations.duckdb(credentials=db_path)


def run_resource(
    resource_name: str,
    start_date: str | None = None,
    end_date: str | None = None,
    database_name: str | None = None,
    local_db: str | None = None,
    verbose: bool = False,
):
    """Run ingestion for a specific resource."""
    setup_dlt()
    logger = setup_logging(verbose)
    database_name = database_name or get_database_name()
    
    logger.info(f"Starting ingestion for resource: {resource_name}")
    logger.info(f"Date range: {start_date} to {end_date}")
    if local_db:
        logger.info(f"Local DuckDB: {local_db}")
    else:
        logger.info(f"Database: {database_name}")
    
    # Map resource names to source creators
    resource_map = {
        "anforandelista": anforandelista.create_source,
        "anforande": anforande.create_source,
        "dokumentlista": dokumentlista.create_source,
        "dokumentstatus": dokumentstatus.create_source,
        "personlista": personlista.create_source,
        "voteringlista": voteringlista.create_source,
        "valmanifest": valmanifest.create_source,
        "tidoavtalet": tidoavtalet.create_source,
    }
    
    if resource_name not in resource_map:
        raise ValueError(f"Unknown resource: {resource_name}. Available: {list(resource_map.keys())}")
    
    # Create source
    create_source_fn = resource_map[resource_name]
    if resource_name in ["anforandelista", "anforande", "dokumentlista", "dokumentstatus", "voteringlista"]:
        source = create_source_fn(start_date=start_date, end_date=end_date)
    elif resource_name in ["valmanifest", "tidoavtalet"]:
        source = create_source_fn()
    else:
        source = create_source_fn()
    
    logger.info(f"Source created: {source}")
    logger.info(f"Resources: {list(source.resources.keys())}")
    for name, res in source.resources.items():
        logger.info(f"  {name}: selected={res.selected}")
    
    # Create destination
    if local_db:
        destination = create_local_duckdb_destination(local_db)
    else:
        destination = create_motherduck_destination(database_name=database_name)
    
    # Determine pipeline and dataset names based on source
    if resource_name in ["valmanifest", "tidoavtalet"]:
        pipeline_name = f"raw_snd_{resource_name}"
        dataset_name = "raw_snd"
    else:
        pipeline_name = f"raw_riksdagen_{resource_name}"
        dataset_name = "raw_riksdagen"
    
    # Create pipeline
    dlt_pipeline = pipeline(
        pipeline_name=pipeline_name,
        dataset_name=dataset_name,
        destination=destination,
        progress="log",
    )
    
    logger.info(f"Pipeline created: {dlt_pipeline.pipeline_name}")
    logger.info(
        "Starting pipeline.run() (extract + normalize + load; may run quietly for a long time)"
    )

    # Run pipeline
    info = dlt_pipeline.run(source)
    
    # Log detailed info
    logger.info(f"Pipeline completed!")
    logger.info(f"Load info: {info}")
    
    # Log extract info
    if dlt_pipeline.last_trace and dlt_pipeline.last_trace.last_extract_info:
        extract_info = dlt_pipeline.last_trace.last_extract_info
        logger.info(f"Extract info: {extract_info}")
    
    # Log row counts from normalize step
    if dlt_pipeline.last_trace and dlt_pipeline.last_trace.last_normalize_info:
        row_counts = dlt_pipeline.last_trace.last_normalize_info.row_counts
        logger.info(f"Row counts: {row_counts}")
    
    # Log any failed jobs
    if info.has_failed_jobs:
        logger.error("FAILED JOBS DETECTED!")
        for package in info.load_packages:
            for job in package.jobs.get("failed_jobs", []):
                logger.error(f"  Failed job: {job}")
    
    # Log load package details
    for package in info.load_packages:
        logger.info(f"Load package state: {package.state}")
        logger.info(f"  Completed jobs: {len(package.jobs.get('completed_jobs', []))}")
        logger.info(f"  Failed jobs: {len(package.jobs.get('failed_jobs', []))}")
    
    print(f"Pipeline completed: {info}")
    return info


def main():
    parser = argparse.ArgumentParser(description="Ingestion CLI for DLT-based data ingestion")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run ingestion for a resource")
    run_parser.add_argument("resource", choices=["anforandelista", "anforande", "dokumentlista", "dokumentstatus", "personlista", "voteringlista", "valmanifest", "tidoavtalet"])
    run_parser.add_argument("--start-date", help="Start date (YYYY-MM-DD) for backfill")
    run_parser.add_argument("--end-date", help="End date (YYYY-MM-DD) for backfill")
    run_parser.add_argument("--database", help="Database name (default: from DATABASE_NAME env or 'spatial_dagster')")
    run_parser.add_argument("--local-db", help="Path to local DuckDB file (use instead of MotherDuck)")
    run_parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose/debug logging")
    
    args = parser.parse_args()
    
    if args.command == "run":
        try:
            run_resource(
                resource_name=args.resource,
                start_date=args.start_date,
                end_date=args.end_date,
                database_name=args.database,
                local_db=args.local_db,
                verbose=args.verbose,
            )
            sys.exit(0)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

