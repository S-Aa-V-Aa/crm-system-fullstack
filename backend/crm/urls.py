from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, DealViewSet, CurrentUserView, UserManagementView

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'deals' , DealViewSet, basename='deal')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('users/', UserManagementView.as_view(), name='user-management'),
]

