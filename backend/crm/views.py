from rest_framework import viewsets
from .models import Client, Deal
from .serializers import ClientSerializer, DealSerializer

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('-created_at')
    serializer_class = ClientSerializer

class DealViewSet(viewsets.ModelViewSet):
    #Оптимізація SQL-запитів через select_related
    queryset = Deal.objects.all().select_related('client').order_by('-created_at')
    serializer_class = DealSerializer
    