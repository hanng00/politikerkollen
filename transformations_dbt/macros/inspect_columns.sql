{% macro inspect_columns() %}
  {% set query %}
    SELECT table_name, column_name, data_type
    FROM information_schema.columns 
    WHERE table_schema = 'riksdagen'
    ORDER BY table_name, ordinal_position
  {% endset %}
  
  {% set results = run_query(query) %}
  {{ log("All columns in riksdagen schema:", info=true) }}
  {{ log(results, info=true) }}
  
{% endmacro %}
