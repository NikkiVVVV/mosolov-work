import os

bind = '0.0.0.0:' + os.environ.get('PORT','8080')
workers = 1  # One shared in-process concurrency limiter; Railway replicas must also be 1.
worker_class = 'gthread'
threads = 4
timeout = 50
graceful_timeout = 45
keepalive = 2
limit_request_line = 2048
limit_request_fields = 32
limit_request_field_size = 4096
accesslog = None  # No IPs, queries or request headers in application access logs.
errorlog = '-'
control_socket_disable = True
