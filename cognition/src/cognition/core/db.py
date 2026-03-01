"""Database connection and schema utilities."""

import os
from typing import Any, get_args, get_origin

import duckdb


def get_connection(database_name: str | None = None) -> duckdb.DuckDBPyConnection:
    """Create a connection to MotherDuck."""
    token = os.environ.get("MOTHERDUCK_ACCESS_TOKEN")
    if not token:
        raise ValueError("MOTHERDUCK_ACCESS_TOKEN environment variable is required")

    db_name = database_name or os.environ.get("DATABASE_NAME", "spatial_dagster")
    connection_string = f"md:{db_name}?motherduck_token={token}"
    return duckdb.connect(connection_string)


def python_type_to_sql(python_type: Any, nullable: bool = False) -> str:
    """Convert Python type annotation to DuckDB SQL type."""
    origin = get_origin(python_type)

    if origin is type(None):
        return "VARCHAR"

    if python_type is str:
        return "VARCHAR" + (" NOT NULL" if not nullable else "")
    elif python_type is int:
        return "INTEGER" + (" NOT NULL" if not nullable else "")
    elif python_type is bool:
        return "BOOLEAN" + (" NOT NULL" if not nullable else "")
    elif python_type is float:
        return "DOUBLE" + (" NOT NULL" if not nullable else "")

    if origin is type(str | None) or str(python_type).startswith("typing.Union"):
        args = get_args(python_type)
        non_none_args = [a for a in args if a is not type(None)]
        if non_none_args:
            return python_type_to_sql(non_none_args[0], nullable=True)
        return "VARCHAR"

    return "VARCHAR" + (" NOT NULL" if not nullable else "")


def ensure_schema_exists(conn: duckdb.DuckDBPyConnection, schema: str) -> None:
    """Create schema if it doesn't exist."""
    conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")


def table_exists(conn: duckdb.DuckDBPyConnection, table: str) -> bool:
    """Check if a table exists."""
    try:
        conn.execute(f"SELECT 1 FROM {table} LIMIT 1")
        return True
    except duckdb.CatalogException:
        return False
