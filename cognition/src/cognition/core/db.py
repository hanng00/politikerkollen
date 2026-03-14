"""Database connection and schema utilities."""

import logging
import os
from contextlib import contextmanager
from queue import Empty, Queue
from typing import Any, Callable, Iterator, get_args, get_origin

import duckdb

logger = logging.getLogger("cognition")


def get_connection(database_name: str | None = None) -> duckdb.DuckDBPyConnection:
    """Create a connection to MotherDuck."""
    token = os.environ.get("MOTHERDUCK_ACCESS_TOKEN")
    if not token:
        raise ValueError("MOTHERDUCK_ACCESS_TOKEN environment variable is required")

    db_name = database_name or os.environ.get("DATABASE_NAME", "spatial_dagster")
    connection_string = f"md:{db_name}?motherduck_token={token}"
    return duckdb.connect(connection_string)


class ConnectionPool:
    """Thread-safe pool of reusable MotherDuck connections.

    Usage:
        pool = ConnectionPool(size=8)
        pool.setup(lambda c: c.execute("LOAD fts"))

        with pool.connection() as conn:
            conn.execute("SELECT ...")

        pool.close()
    """

    def __init__(self, size: int = 8, database_name: str | None = None):
        self._pool: Queue[duckdb.DuckDBPyConnection] = Queue()

        logger.info(f"Creating connection pool (size={size})...")
        for _ in range(size):
            self._pool.put(get_connection(database_name))
        self._size = size

    def setup(self, init_fn: Callable[[duckdb.DuckDBPyConnection], None]) -> None:
        """Run an initialization function on every connection in the pool."""
        conns = []
        while not self._pool.empty():
            c = self._pool.get_nowait()
            init_fn(c)
            conns.append(c)
        for c in conns:
            self._pool.put(c)

    @contextmanager
    def connection(self) -> Iterator[duckdb.DuckDBPyConnection]:
        """Borrow a connection, automatically returning it when done."""
        conn = self._pool.get()
        try:
            yield conn
        finally:
            self._pool.put(conn)

    def close(self) -> None:
        """Close all connections in the pool."""
        while not self._pool.empty():
            try:
                self._pool.get_nowait().close()
            except Empty:
                break


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


def ensure_columns_exist(
    conn: duckdb.DuckDBPyConnection,
    table: str,
    columns: list[tuple[str, str]],
) -> None:
    """Add any missing columns to an existing table.

    Args:
        conn: DuckDB connection
        table: Fully qualified table name (schema.table)
        columns: List of (column_name, sql_type) tuples from the model definition
    """
    table_name = table.split(".")[-1]
    existing_cols = {
        row[0]
        for row in conn.execute(
            f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"
        ).fetchall()
    }

    for col_name, col_type in columns:
        if col_name not in existing_cols:
            # Strip NOT NULL for ALTER TABLE ADD COLUMN (existing rows need NULL)
            col_type_nullable = col_type.replace(" NOT NULL", "")
            logger.info(f"Adding missing column {col_name} to {table}")
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type_nullable}")
