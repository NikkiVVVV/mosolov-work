FROM python:3.13-slim
WORKDIR /app
COPY worker.py store.py workshop.py workshop.json search_widget.py admin_events.py export_manifest.py bookmarks.json ./
COPY ["Animation Player.zip", "./"]
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
CMD ["python", "worker.py"]
