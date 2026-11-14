from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Client, Deal

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'is_staff', 'is_superuser']

class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    is_staff = serializers.BooleanField(default=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'password', 'is_staff']

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            is_staff=validated_data.get('is_staff', False),
        )

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'is_active']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'is_superuser']

class ClientSerializer(serializers.ModelSerializer):
    # Логін закріпленого менеджера (або None, якщо не призначено)
    manager_name = serializers.ReadOnlyField(source='responsible_manager.username')
    # Прапорець, чи не звільнений цей менеджер (True/False)
    manager_is_active = serializers.ReadOnlyField(source='responsible_manager.is_active')
    deals_count = serializers.IntegerField(read_only=True, default=0)
    won_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
        default='0.00',
    )

    class Meta:
        model = Client
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'status',
            'responsible_manager',
            'manager_name',
            'manager_is_active',
            'deals_count',
            'won_amount',
            'created_at',
            'updated_at',
        ]


class DealSerializer(serializers.ModelSerializer):
    # Текстова назва етапу воронки замість технічного ключа ('new' -> 'Нова заявка')
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    # Рядкове представлення клієнта (__str__ із моделі Client)
    client_name = serializers.ReadOnlyField(source='client.__str__')
    # Дані відповідального менеджера, витягнуті через ланцюжок Deal -> Client -> User
    responsible_manager = serializers.ReadOnlyField(source='client.responsible_manager.id')
    manager_name = serializers.ReadOnlyField(source='client.responsible_manager.username')
    manager_is_active = serializers.ReadOnlyField(source='client.responsible_manager.is_active')

    class Meta:
        model = Deal
        fields = [
            'id',
            'title',
            'amount',
            'stage',
            'stage_display',
            'client',
            'client_name',
            'responsible_manager',
            'manager_name',
            'manager_is_active',
            'created_at',
            'updated_at',
        ]
        