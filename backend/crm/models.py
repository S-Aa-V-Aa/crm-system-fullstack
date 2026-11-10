from django.db import models
from django.contrib.auth.models import User

class Client(models.Model):
    # Статуси клієнта у системі
    STATUS_CHOICES = [
        ('lead', 'Потенційний клієнт (Лід)'),
        ('active', 'Активний клієнт'),
        ('inactive', 'Неактивний'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='lead')
    
    # Менеджер, закріплений за цим клієнтом
    responsible_manager = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='clients'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"