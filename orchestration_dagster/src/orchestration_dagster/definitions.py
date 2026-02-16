from pathlib import Path

from dagster import Definitions, definitions, load_from_defs_folder

from orchestration_dagster.defs.resources.resources import (
    get_container_executor,
    get_secrets_resource,
)


@definitions
def defs() -> Definitions:
    """Load Dagster definitions with resources."""
    defs_from_folder = load_from_defs_folder(path_within_project=Path(__file__).parent)
    
    # Add resources
    return defs_from_folder.with_resources({
        "container_executor": get_container_executor(),
        "secrets_resource": get_secrets_resource(),
    })
