from typing import Literal

Environment = Literal["LOCAL", "BRANCH", "PROD"]


def get_environment() -> Environment:
    return "LOCAL"


def get_dbt_target() -> str:
    env = get_environment()
    if env == "LOCAL":
        return "dev"
    return "prod"
