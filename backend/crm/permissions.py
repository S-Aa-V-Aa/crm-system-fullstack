from rest_framework import permissions

class IsAdminOrResponsibleManager(permissions.BasePermission):
    """
    Кастомне правило доступу:
    - Адміністратор (is_staff) має повний доступ до будь-яких об'єктів.
    - Менеджер має доступ лише до тих записів, за які він особисто відповідає.
    """

    def has_object_permission(self, request, view, obj):
        # 1. Адміністраторам і суперюзерам дозволено будь-які операції
        if request.user.is_staff or request.user.is_superuser:
            return True

        # 2. Якщо об'єкт — це Client: перевіряємо поле responsible_manager
        if hasattr(obj, 'responsible_manager'):
            return obj.responsible_manager == request.user

        # 3. Якщо об'єкт — це Deal: перевіряємо менеджера через пов'язаного клієнта
        if hasattr(obj, 'client') and obj.client.responsible_manager:
            return obj.client.responsible_manager == request.user

        return False
    