from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CameraDetailViewSet, CameraGroupViewSet, CameraNestedViewSet

router = DefaultRouter()
router.register("groups", CameraGroupViewSet, basename="cameragroup")
router.register("cameras", CameraDetailViewSet, basename="camera")

# ponytail: nested route for list/create cameras under a group.
# A full nested-router lib is overkill for one level; manual path is simpler.
nested_camera_router = DefaultRouter()
nested_camera_router.register("cameras", CameraNestedViewSet, basename="group-cameras")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "groups/<int:group_pk>/",
        include(nested_camera_router.urls),
    ),
]
