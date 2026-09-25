import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove auto-locking of stay
content = content.replace(
    'setAssistantSelectedStay(firstStay.name);\n              setAssistantSelectedMapPlace(firstStay.name);',
    'setAssistantSelectedMapPlace(firstStay.name);'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed stay auto-locking")
