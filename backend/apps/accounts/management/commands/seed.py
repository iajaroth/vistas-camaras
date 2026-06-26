import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

OPERATOR_USERNAME = "jbadilla@sts-cr.com"


class Command(BaseCommand):
    help = "Create the pre-configured operator user if it doesn't exist."

    def handle(self, *args, **options):
        if User.objects.filter(username=OPERATOR_USERNAME).exists():
            self.stdout.write(self.style.WARNING(f"User '{OPERATOR_USERNAME}' already exists. Skipping."))
            return

        password = os.environ.get("OPERATOR_PASSWORD")
        if not password:
            self.stderr.write(self.style.ERROR(
                "OPERATOR_PASSWORD env var is not set. Cannot create operator user."
            ))
            return

        User.objects.create_superuser(
            username=OPERATOR_USERNAME,
            email=OPERATOR_USERNAME,
            password=password,
        )
        self.stdout.write(self.style.SUCCESS(f"Operator user '{OPERATOR_USERNAME}' created successfully."))
