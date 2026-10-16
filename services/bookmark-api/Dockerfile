FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ops_notifications.py ai_search.py railway_api.py query_notifications.py annotate_bookmark.py web_search.py collection_interest.py search_diagnostics.py gunicorn.conf.py bookmarks.json ./
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
CMD ["gunicorn", "--config", "gunicorn.conf.py", "railway_api:from_environment()"]
