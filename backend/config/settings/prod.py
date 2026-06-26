"""
Production settings for Camera Views Registry (Coolify).
"""
import os

from .base import *  # noqa: F401, F403

DEBUG = False

# Hosts
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

# CSRF trusted origins (HTTPS domains behind the Coolify/Traefik proxy)
CSRF_TRUSTED_ORIGINS = [
    f"https://{h.strip()}"
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")
    if h.strip() and h.strip() != "localhost"
]

# Trust the proxy's X-Forwarded-Proto header so SSL detection works behind Traefik
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Security
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "1") == "1"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# WhiteNoise for static files
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
