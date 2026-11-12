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
class ClientSerializer(serializers.ModelSerializer):
    # Додаткове поле, яке віддає логін менеджера у вигляді простого рядка
    manager_name = serializers.ReadOnlyField(source='responsible_manager.username')

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
            'created_at',
            'updated_at',
        ]

class DealSerializer(serializers.ModelSerializer):
    # Відображення тексту статуссу замість технічоного ключа
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)

    # Текстове представлення клієнта для швидкого виведення на фроненді
    client_name = serializers.ReadOnlyField(source='client.__str__')

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
            'created_at',
            'updated_at',
        ]
