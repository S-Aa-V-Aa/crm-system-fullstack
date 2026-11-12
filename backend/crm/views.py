from django.contrib.auth.models import User
from rest_framework import viewsets, filters, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client, Deal
from .serializers import (
    ClientSerializer,
    DealSerializer,
    UserProfileSerializer,
    CreateUserSerializer,
    UserUpdateSerializer,
)
from .permissions import IsAdminOrResponsibleManager


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)


class UserManagementView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_active=True).order_by('username')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateUserSerializer
        return UserProfileSerializer

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserUpdateSerializer

    def perform_update(self, serializer):
        # Захист від випадкового зняття прав адміністратора із самого себе
        if serializer.instance.id == self.request.user.id:
            raise ValidationError({'detail': 'Ви не можете змінювати роль власного облікового запису.'})
        serializer.save()

    def perform_destroy(self, instance):
        # Захист від блокування самого себе
        if instance.id == self.request.user.id:
            raise ValidationError({'detail': 'Ви не можете деактивувати власний обліковий запис.'})
        # Soft Delete: деактивуємо вхід, але зберігаємо всю історію угод працівника
        instance.is_active = False
        instance.save()
    
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
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Адмін сам обирає responsible_manager у формі (або залишає порожнім)
            serializer.save()
        else:
            # Звичайний менеджер автоматично закріплює клієнта за собою
            serializer.save(responsible_manager=user)

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

    def perform_create(self, serializer):
        user = self.request.user
        client = serializer.validated_data['client']
        # Захист від IDOR: менеджер не може створити угоду для клієнта іншого менеджера
        if not (user.is_staff or user.is_superuser) and client.responsible_manager != user:
            raise PermissionDenied('Ви не можете створювати угоди для чужого клієнта.')
        serializer.save()

    