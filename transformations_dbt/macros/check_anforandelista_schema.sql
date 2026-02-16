{% macro check_anforandelista_schema() %}
  {% set query %}
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_schema = 'riksdagen' 
      AND table_name = 'anforandelista'
    ORDER BY ordinal_position
  {% endset %}
  
  {% set results = run_query(query) %}
  {{ log("anforandelista schema:", info=true) }}
  {{ log(results, info=true) }}
  
{% endmacro %}
