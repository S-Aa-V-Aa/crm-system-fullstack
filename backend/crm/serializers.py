from rest_framework import serializers
from .models import Client

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