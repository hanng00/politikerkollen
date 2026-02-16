{% macro check_raw_tables() %}
  {% set query %}
    SELECT table_name, count(*) as row_count
    FROM information_schema.tables 
    WHERE table_schema = 'riksdagen'
    GROUP BY table_name
  {% endset %}
  
  {% set results = run_query(query) %}
  {{ log("Raw tables in riksdagen schema:", info=true) }}
  {{ log(results, info=true) }}
  
{% endmacro %}
