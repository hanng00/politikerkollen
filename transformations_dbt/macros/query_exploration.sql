{% macro query_exploration() %}
  {% set query %}
    SELECT * FROM riksdagen.explore_raw_schemas
  {% endset %}
  
  {% set results = run_query(query) %}
  {{ log("Raw table schemas with politician identifiers:", info=true) }}
  {{ log(results, info=true) }}
  
{% endmacro %}
