from dagster import (
    MonthlyPartitionsDefinition,
    StaticPartitionsDefinition,
    TimeWindowPartitionsDefinition,
)

RIKSDAGEN_START_DATE = "1990-01-01"

yearly_partitions = TimeWindowPartitionsDefinition(
    start=RIKSDAGEN_START_DATE,
    cron_schedule="0 0 1 1 *",  # Yearly: at midnight on January 1st
    fmt="%Y-%m-%d",
    end_offset=1,
)

election_year_partitions = StaticPartitionsDefinition(
    ["2018", "2022", "2026"]
)

month_partition = MonthlyPartitionsDefinition(
    start_date=RIKSDAGEN_START_DATE, end_offset=1
)


daily_partitions = TimeWindowPartitionsDefinition(
    start=RIKSDAGEN_START_DATE,
    cron_schedule="0 0 * * *",  # Daily: at midnight
    fmt="%Y-%m-%d",
)
