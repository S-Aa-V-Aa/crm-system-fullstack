from rest_framework import serializers
from .models import Client, Deal

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
