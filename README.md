# B2B Mini-CRM System

Повноцінна комерційна CRM-система для обліку клієнтів, управління воронкою угод та автоматизації бізнес-процесів із рольовим доступом (RBAC).

## Технологічний стек

- **Backend:** Python, Django, Django REST Framework (DRF), SQLite (перехід на PostgreSQL)
- **Frontend:** React, TypeScript, Tailwind CSS
- **Tools:** Git, GitHub, Thunder Client

## Реалізований функціонал (In Progress)

- [x] Архітектура REST API з розділенням клієнта та сервера
- [x] Модель `Client` з валідацією полів та зв'язком із менеджером
- [x] Модель `Deal` (воронка угод, стадії та реляційний зв'язок)
- [x] CRUD-операції для клієнтів та угод через `ModelViewSet`
- [x] Оптимізація SQL-запитів (`select_related`) для усунення проблеми N+1
- [x] Маршрутизація ендпоінтів через `DefaultRouter`
- [x] Адмін-панель Django з налаштованою фільтрацією та пошуком
- [x] Фільтрація, глобальний пошук та сортування (`django-filter`, `SearchFilter`, `OrderingFilter`)
- [x] Автентифікація через JWT (SimpleJWT) з автоматичною прив'язкою менеджера до лідів
- [ ] Рольова модель прав доступу (RBAC: Admin vs Manager)
