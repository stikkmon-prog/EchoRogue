FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Add Blaxel/Daytona SDKs if available
# RUN pip install blaxel-sdk daytona-sdk

# Persist the skills vault across container runs
RUN mkdir -p /app/skills_vault
COPY src/ .

CMD ["python", "main.py"]