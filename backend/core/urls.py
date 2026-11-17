from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# Створюємо нашу функцію-ендпоінт
@api_view(['GET'])
def ping_view(request):
    return Response({
        "status": "success",
        "message": "Бекенд працює і повертає чистий JSON!"
    })

# Реєструємо адресу (URL), за якою ця функція буде викликатися
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping/', ping_view),
    path('api/', include('crm.urls')),
    # Ендпоінти для авторизації
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
      # Підключаємо маршрути з додатку crm
    # OpenAPI схема та інтерактивний інтерфейс Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
