"""
Standard pagination for Camera Views Registry API.

Implements custom response format with count, page, total_pages, page_size, results.
"""
from math import ceil

from django.core.paginator import InvalidPage
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        """Raise 404 when requested page is out of range."""
        # ponytail: parent already does this, but explicit override
        # ensures custom Spanish message and satisfies req 11.7.
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        self.request = request
        paginator = self.django_paginator_class(queryset, page_size)
        page_number = self.get_page_number(request, paginator)

        try:
            self.page = paginator.page(page_number)
        except InvalidPage:
            raise NotFound("La página solicitada no existe.")

        return list(self.page)

    def get_paginated_response(self, data):
        """Return custom format: count, page, total_pages, page_size, results."""
        page_size = self.get_page_size(self.request)
        return Response(
            {
                "count": self.page.paginator.count,
                "page": self.page.number,
                "total_pages": ceil(self.page.paginator.count / page_size),
                "page_size": page_size,
                "results": data,
            }
        )
