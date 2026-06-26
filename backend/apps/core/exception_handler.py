"""
Custom DRF exception handler.

Transforms validation errors into {"errors": [{"field": "...", "message": "..."}]} format.
"""
from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        return None

    # Only transform 400 validation errors
    if response.status_code == 400 and isinstance(response.data, dict):
        errors = []
        for field, messages in response.data.items():
            if isinstance(messages, list):
                for msg in messages:
                    errors.append({"field": field, "message": str(msg)})
            else:
                errors.append({"field": field, "message": str(messages)})
        response.data = {"errors": errors}

    return response
