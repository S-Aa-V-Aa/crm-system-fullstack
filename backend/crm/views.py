from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client, Deal
from .serializers import ClientSerializer, DealSerializer
from .permissions import IsAdminOrResponsibleManager

class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes =[IsAdminOrResponsibleManager]

    # Підключаємо механізми фільтрації
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Точна фільтрація за параметрами
    filterset_fields = ['status']

    # Пошук за ключовими словами
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    # Поля, за якими клієнт може сортувати дані
    ordering_fields = ['created_at', 'last_name']

    def get_queryset(self):
        user = self.request.user
        # Адміністратор бачить клієнтів усієї компанії
        if user.is_staff or user.is_superuser:
            return Client.objects.all().order_by('-created_at')
        # Менеджер бачить тільки своїх призначених клієнтів
        return Client.objects.filter(responsible_manager=user).order_by('-created_at')

    def perform_create(self, serializer):
        # Автоматично зберігаємо поточного залогіненого юзера як відповідального менеджера
        serializer.save(responsible_manager=self.request.user)

class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [IsAdminOrResponsibleManager]

    # Підключаємо механізми фільтрації
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Точна фільтрація: за стадією угоди та конкретним клієнтом
    filterset_fields = ['stage', 'client']

    # Пошук за назвою угоди або даними пов'язаного клієнта
    search_fields = ['title', 'client__first_name', 'client__last_name', 'client__email']

    # Сортування: за сумою або датою створення
    ordering_fields = ['amount', 'created_at']

    def get_queryset(self):
        user = self.request.user
        # Адміністратор бачить всі угоди
        if user.is_staff or user.is_superuser:
            return Deal.objects.all().select_related('client').order_by('-created_at')
        # Менеджер бачить лише ті угоди, де він закріплений за клієнтом
        return Deal.objects.filter(client__responsible_manager=user).select_related('client').order_by('-created_at')
    