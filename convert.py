import re

with open(r'C:\Users\Madhav\Desktop\dump.sql', 'r', encoding='utf8') as f:
    content = f.read()

# Remove MySQL-specific stuff
content = re.sub(r'ENGINE=\w+', '', content)
content = re.sub(r'AUTO_INCREMENT=\d+', '', content)
content = re.sub(r'DEFAULT CHARSET=\w+', '', content)
content = re.sub(r'COLLATE[\s=]\S+', '', content)
content = re.sub(r'\bunsigned\b', '', content)
content = re.sub(r'`', '"', content)
content = re.sub(r'\bAUTO_INCREMENT\b', 'SERIAL', content)
content = re.sub(r'\bTINYINT\(1\)', 'BOOLEAN', content, flags=re.IGNORECASE)
content = re.sub(r'\bDATETIME\b', 'TIMESTAMP', content, flags=re.IGNORECASE)
content = re.sub(r'\bTINYINT\(\d+\)', 'SMALLINT', content, flags=re.IGNORECASE)
content = re.sub(r'\bINT\(\d+\)', 'INTEGER', content, flags=re.IGNORECASE)
content = re.sub(r'\bDOUBLE\b', 'DOUBLE PRECISION', content, flags=re.IGNORECASE)
content = re.sub(r'\bLONGTEXT\b', 'TEXT', content, flags=re.IGNORECASE)
content = re.sub(r'\bMEDIUMTEXT\b', 'TEXT', content, flags=re.IGNORECASE)
content = re.sub(r'\bTINYTEXT\b', 'TEXT', content, flags=re.IGNORECASE)
content = re.sub(r'\bLONGBLOB\b', 'BYTEA', content, flags=re.IGNORECASE)
content = re.sub(r'\bMEDIUMBLOB\b', 'BYTEA', content, flags=re.IGNORECASE)
content = re.sub(r'\bBLOB\b', 'BYTEA', content, flags=re.IGNORECASE)

# Remove MySQL-only statements
content = re.sub(r'SET @\S+.*?;\n', '', content)
content = re.sub(r'LOCK TABLES.*?;\n', '', content)
content = re.sub(r'UNLOCK TABLES.*?;\n', '', content)
content = re.sub(r'/\*!.*?\*/;?\n', '', content, flags=re.DOTALL)
content = re.sub(r'SET @@.*?;\n', '', content)

with open(r'C:\Users\Madhav\Desktop\dump_pg.sql', 'w', encoding='utf8') as f:
    f.write(content)

print("Done! dump_pg.sql created on Desktop.")