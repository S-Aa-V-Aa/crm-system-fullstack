from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response

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
    path('api/', include('crm.urls')),  # Підключаємо маршрути з додатку crm
]
