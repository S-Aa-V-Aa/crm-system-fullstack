from rest_framework import permissions


class IsAdminOrResponsibleManager(permissions.BasePermission):
    """
    Дозволяє доступ лише авторизованим користувачам.
    Адміністратори (is_staff) бачать і редагують усі записи.
    Менеджери працюють виключно зі своїми клієнтами та їхніми угодами.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Якщо об'єкт — це Клієнт (має поле responsible_manager)
        if hasattr(obj, 'responsible_manager'):
            return obj.responsible_manager == request.user

        # Якщо об'єкт — це Угода (перевіряємо менеджера через клієнта)
        if hasattr(obj, 'client'):
            return obj.client.responsible_manager == request.user

        return False