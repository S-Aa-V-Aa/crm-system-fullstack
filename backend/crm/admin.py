from django.contrib import admin
from .models import Client, Deal

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'status', 'responsible_manager', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('first_name', 'last_name', 'email')

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('title', 'amount', 'stage', 'client', 'created_at')
    list_filter = ('stage', 'created_at')
    search_fields = ('title', 'client__first_name', 'client__last_name')

