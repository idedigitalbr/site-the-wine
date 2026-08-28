UPDATE system_email_templates
SET body = REPLACE(body, '\\n', CHAR(10)),
    default_body = REPLACE(default_body, '\\n', CHAR(10))
WHERE body LIKE '%\\n%'
   OR default_body LIKE '%\\n%';
