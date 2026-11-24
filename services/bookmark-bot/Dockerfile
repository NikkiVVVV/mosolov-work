FROM python:3.13-slim
WORKDIR /app
COPY worker.py store.py export_manifest.py bookmarks.json ./
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
CMD ["python", "worker.py"]
