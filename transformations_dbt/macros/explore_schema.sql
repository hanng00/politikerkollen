{% macro explore_schema() %}
  {% set query %}
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'riksdagen' 
    ORDER BY table_name, ordinal_position
  {% endset %}
  
  {% set results = run_query(query) %}
  {{ log("Schema exploration results:", info=true) }}
  {{ log(results, info=true) }}
  
{% endmacro %}
