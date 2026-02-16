#!/usr/bin/env python3
"""
CLI interface for DBT transformations container.

Usage:
    dbt-cli run [--select=SELECTOR] [--full-refresh] [--target=TARGET]
    dbt-cli build [--select=SELECTOR] [--full-refresh] [--target=TARGET]
    dbt-cli test [--select=SELECTOR] [--target=TARGET]
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_dbt_command(command: str, select: str | None = None, full_refresh: bool = False, target: str | None = None):
    """Run a dbt command."""
    # Get target from env or argument
    dbt_target = target or os.environ.get("DBT_TARGET", "dev")
    
    # Build dbt command
    cmd = ["dbt", command]
    
    if select:
        cmd.extend(["--select", select])
    
    if full_refresh:
        cmd.append("--full-refresh")
    
    if target:
        cmd.extend(["--target", dbt_target])
    
    # Set working directory to dbt project root
    project_dir = Path(__file__).parent
    
    # Run dbt command
    result = subprocess.run(cmd, cwd=project_dir, check=False)
    sys.exit(result.returncode)


def main():
    parser = argparse.ArgumentParser(description="DBT CLI for transformations")
    subparsers = parser.add_subparsers(dest="command", help="DBT command to run")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run dbt models")
    run_parser.add_argument("--select", help="dbt selector (e.g., 'stg.*', 'mart.*')")
    run_parser.add_argument("--full-refresh", action="store_true", help="Full refresh")
    run_parser.add_argument("--target", help="dbt target (default: from DBT_TARGET env or 'dev')")
    
    # Build command
    build_parser = subparsers.add_parser("build", help="Build dbt models")
    build_parser.add_argument("--select", help="dbt selector")
    build_parser.add_argument("--full-refresh", action="store_true", help="Full refresh")
    build_parser.add_argument("--target", help="dbt target")
    
    # Test command
    test_parser = subparsers.add_parser("test", help="Run dbt tests")
    test_parser.add_argument("--select", help="dbt selector")
    test_parser.add_argument("--target", help="dbt target")
    
    args = parser.parse_args()
    
    if args.command:
        run_dbt_command(
            command=args.command,
            select=args.select,
            full_refresh=args.full_refresh,
            target=args.target,
        )
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()

