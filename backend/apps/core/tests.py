"""Unit tests for StandardPagination."""
from math import ceil
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, TestCase

from apps.core.pagination import StandardPagination


class StandardPaginationTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.pagination = StandardPagination()

    def _paginate(self, items, page=1, page_size=None):
        """Helper to paginate a list of items."""
        url = f"/?page={page}"
        if page_size:
            url += f"&page_size={page_size}"
        request = self.factory.get(url)
        result = self.pagination.paginate_queryset(items, request)
        return result, self.pagination.get_paginated_response(result)

    def test_default_page_size_is_50(self):
        self.assertEqual(self.pagination.page_size, 50)

    def test_max_page_size_is_100(self):
        self.assertEqual(self.pagination.max_page_size, 100)

    def test_response_format(self):
        items = list(range(10))
        _, response = self._paginate(items)
        data = response.data
        self.assertIn("count", data)
        self.assertIn("page", data)
        self.assertIn("total_pages", data)
        self.assertIn("page_size", data)
        self.assertIn("results", data)

    def test_count_and_total_pages(self):
        items = list(range(120))
        _, response = self._paginate(items, page_size=50)
        data = response.data
        self.assertEqual(data["count"], 120)
        self.assertEqual(data["total_pages"], 3)
        self.assertEqual(data["page_size"], 50)
        self.assertEqual(data["page"], 1)

    def test_custom_page_size(self):
        items = list(range(25))
        _, response = self._paginate(items, page_size=10)
        data = response.data
        self.assertEqual(data["page_size"], 10)
        self.assertEqual(data["total_pages"], 3)
        self.assertEqual(len(data["results"]), 10)

    def test_page_2(self):
        items = list(range(25))
        _, response = self._paginate(items, page=2, page_size=10)
        data = response.data
        self.assertEqual(data["page"], 2)
        self.assertEqual(data["results"], list(range(10, 20)))

    def test_out_of_range_page_returns_404(self):
        from rest_framework.exceptions import NotFound

        items = list(range(10))
        with self.assertRaises(NotFound):
            self._paginate(items, page=999)

    def test_page_size_capped_at_100(self):
        items = list(range(200))
        _, response = self._paginate(items, page_size=150)
        data = response.data
        # DRF caps at max_page_size=100
        self.assertEqual(data["page_size"], 100)
