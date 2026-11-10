# B2B Mini-CRM System

Повноцінна комерційна CRM-система для обліку клієнтів, управління воронкою угод та автоматизації бізнес-процесів із рольовим доступом (RBAC).

## Технологічний стек

- **Backend:** Python, Django, Django REST Framework (DRF), SQLite (перехід на PostgreSQL)
- **Frontend:** React, TypeScript, Tailwind CSS
- **Tools:** Git, GitHub, Thunder Client

## Реалізований функціонал (In Progress)

- [x] Архітектура REST API з розділенням клієнта та сервера
- [x] Модель `Client` з валідацією полів та зв'язком із менеджером
- [x] CRUD-операції через `ModelViewSet` та маршрутизація через `DefaultRouter`
- [x] Адмін-панель Django з налаштованою фільтрацією та пошуком
- [x] Модель `Deal` (воронка угод та статуси)
- [ ] Рольова модель прав (Admin / Manager)
