from typing import Tuple, Optional
from dagster import AssetExecutionContext


def get_partition_date_range(
    context: AssetExecutionContext,
) -> Tuple[Optional[str], Optional[str]]:
    try:
        partition_key_range = context.partition_key_range
        if partition_key_range:
            return partition_key_range.start, partition_key_range.end
    except (AttributeError, ValueError):
        pass
    
    try:
        partition_key = context.partition_key
        if partition_key:
            return partition_key, partition_key
    except (AttributeError, ValueError):
        pass
    
    return None, None

