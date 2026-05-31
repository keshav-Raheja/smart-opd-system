import os

# Render sets the PORT environment variable. We bind to 0.0.0.0 on that port.
port = os.environ.get("PORT", "10000")
bind = f"0.0.0.0:{port}"

# Timeout for workers (in seconds). Since RAG or PDF generation can sometimes take a few seconds,
# a timeout of 120 seconds prevents workers from being killed prematurely.
timeout = 120

# Number of worker processes. On Render Free tier, memory is limited to 512MB,
# so using 2 workers is perfect and keeps memory footprint low.
workers = 2
