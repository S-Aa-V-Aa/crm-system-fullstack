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
    permission_classes = [IsAdminOrResponsibleManager]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'last_name']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Client.objects.all().order_by('-created_at')
        return Client.objects.filter(responsible_manager=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            serializer.save()
        else:
            serializer.save(responsible_manager=user)

    def perform_update(self, serializer):
        user = self.request.user
        # Звичайний менеджер не має права змінювати поле responsible_manager
        if not (user.is_staff or user.is_superuser) and 'responsible_manager' in serializer.validated_data:
            raise PermissionDenied('Тільки адміністратор може перепризначати відповідального менеджера.')
        serializer.save()


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [IsAdminOrResponsibleManager]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['stage', 'client']
    search_fields = ['title', 'client__first_name', 'client__last_name', 'client__email']
    ordering_fields = ['amount', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Deal.objects.all().select_related('client', 'client__responsible_manager').order_by('-created_at')
        return Deal.objects.filter(client__responsible_manager=user).select_related('client', 'client__responsible_manager').order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        client = serializer.validated_data['client']
        if not (user.is_staff or user.is_superuser) and client.responsible_manager != user:
            raise PermissionDenied('Ви не можете створювати угоди для чужого клієнта.')
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        # Перевіряємо нового клієнта (якщо його змінили) або залишаємо поточного
        client = serializer.validated_data.get('client', serializer.instance.client)
        if not (user.is_staff or user.is_superuser) and client.responsible_manager != user:
            raise PermissionDenied('Ви не можете прив\'язати угоду до чужого клієнта.')
        serializer.save()
        
    