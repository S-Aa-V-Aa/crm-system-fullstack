from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client, Deal
from .serializers import ClientSerializer, DealSerializer

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-created_at')
    serializer_class = ClientSerializer

    # Підключаємо механізми фільтрації
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Точна фільтрація за параметрами
    filterset_fields = ['status']

    # Пошук за ключовими словами
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    # Поля, за якими клієнт може сортувати дані
    ordering_fields = ['created_at', 'last_name']

    def perform_create(self, serializer):
        # Автоматично зберігаємо поточного залогіненого юзера як відповідального менеджера
        serializer.save(responsible_manager=self.request.user)

class DealViewSet(viewsets.ModelViewSet):
    #Оптимізація SQL-запитів через select_related
    queryset = Deal.objects.all().select_related('client').order_by('-created_at')
    serializer_class = DealSerializer

    # Підключаємо механізми фільтрації
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Точна фільтрація: за стадією угоди та конкретним клієнтом
    filterset_fields = ['stage', 'client']

    # Пошук за назвою угоди або даними пов'язаного клієнта
    search_fields = ['title', 'client__first_name', 'client__last_name', 'client__email']

    # Сортування: за сумою або датою створення
    ordering_fields = ['amount', 'created_at']

