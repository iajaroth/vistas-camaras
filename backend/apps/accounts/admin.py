from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "failed_login_attempts", "locked_until", "is_staff")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Rate Limiting", {"fields": ("failed_login_attempts", "locked_until")}),
    )
