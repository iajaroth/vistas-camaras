from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = timedelta(seconds=60)


class LoginView(APIView):
    """POST /api/auth/login/ — JWT login with rate-limiting."""

    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = User.objects.filter(username=username).first()

        # Check lockout
        if user and user.locked_until and user.locked_until > timezone.now():
            return Response(
                {"detail": "Demasiados intentos. Intenta en 60 segundos."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Valid credentials
        if user and user.check_password(password):
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save(update_fields=["failed_login_attempts", "locked_until"])

            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_200_OK,
            )

        # Invalid credentials — increment counter
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = timezone.now() + LOCKOUT_DURATION
            user.save(update_fields=["failed_login_attempts", "locked_until"])

        # ponytail: generic error — never reveal which field is wrong (req 8.4)
        return Response(
            {"detail": "Credenciales inválidas."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklist the refresh token."""

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "El campo 'refresh' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Token inválido o ya expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)
