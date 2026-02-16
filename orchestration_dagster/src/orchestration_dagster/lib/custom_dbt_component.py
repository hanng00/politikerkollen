"""
Custom DBT Component that:
1. Reads dbt manifest to create asset definitions (for UI/lineage) ✅
2. Executes dbt models via Docker containers instead of direct CLI ✅

This gives us the best of both worlds:
- All dbt models show up as assets in Dagster UI
- Execution happens in isolated Docker containers
"""
from typing import Any, Mapping, Optional

import dagster as dg
from dagster_dbt import (
    DbtProject,
    DbtProjectComponent,
)


class CustomDbtProjectComponent(DbtProjectComponent):
    """Custom DbtProjectComponent that customizes asset metadata.

    NOTE: Execution customization happens at the asset level, not here.
    The DbtProjectComponent creates assets from the manifest, and we can
    wrap those assets with custom execution logic.
    """

    def get_asset_spec(
        self, manifest: Mapping[str, Any], unique_id: str, project: Optional[DbtProject]
    ) -> dg.AssetSpec:
        base_spec = super().get_asset_spec(manifest, unique_id, project)
        dbt_props = self.get_resource_props(manifest, unique_id)

        stage = dbt_props["path"].split("/")[0]  # e.g. "stg/riksdagen/stg_personlista" -> "stg"

        # Customize group name and add custom metadata
        return base_spec.replace_attributes(
            group_name=f"dbt_ingest__{stage}",
        ).merge_attributes(
            metadata=dbt_props,
        )

    def get_automation_condition(
        self, dbt_resource_props: Mapping[str, Any]
    ) -> Optional[dg.AutomationCondition]:
        return dg.AutomationCondition.eager()
