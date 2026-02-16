import os

import dlt


def create_motherduck_destination(database_name: str):
    # Try MOTHERDUCK_SERVICE_TOKEN first, fall back to MOTHERDUCK_TOKEN
    access_token = os.environ.get("MOTHERDUCK_ACCESS_TOKEN")

    if not access_token:
        raise ValueError(
            "MOTHERDUCK_ACCESS_TOKEN environment variable is required for MotherDuck connection. "
        )

    destination = dlt.destinations.motherduck(
            credentials={
                "database": database_name,
                "password": access_token,
            }
        )

    return destination
