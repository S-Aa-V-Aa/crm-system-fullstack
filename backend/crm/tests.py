from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Client, Deal


class CRMSecurityAndIsolationTests(APITestCase):
    def setUp(self):
        # Створюємо адміністратора та двох незалежних менеджерів
        self.admin = User.objects.create_user(
            username='admin_test',
            password='StrongPassword123',
            is_staff=True,
        )
        self.manager_one = User.objects.create_user(
            username='manager_one',
            password='StrongPassword123',
            is_staff=False,
        )
        self.manager_two = User.objects.create_user(
            username='manager_two',
            password='StrongPassword123',
            is_staff=False,
        )

        # Створюємо клієнтів для кожного менеджера
        self.client_one = Client.objects.create(
            first_name='Олена',
            last_name='Ковальчук',
            email='olena@company.ua',
            phone='+380671112233',
            status='active',
            responsible_manager=self.manager_one,
        )
        self.client_two = Client.objects.create(
            first_name='Максим',
            last_name='Бондаренко',
            email='maksym@company.ua',
            phone='+380674445566',
            status='lead',
            responsible_manager=self.manager_two,
        )

        # Створюємо угоди для кожного клієнта
        self.deal_one = Deal.objects.create(
            title='Впровадження CRM',
            amount=Decimal('5000.00'),
            stage='proposal',
            client=self.client_one,
        )
        self.deal_two = Deal.objects.create(
            title='Аудит безпеки',
            amount=Decimal('3200.00'),
            stage='won',
            client=self.client_two,
        )

    def test_unauthenticated_access_denied(self):
        """Запит без JWT-токена повинен отримувати 401 Unauthorized."""
        response = self.client.get('/api/deals/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_sees_only_own_deals(self):
        """Менеджер у списку бачить виключно угоди своїх клієнтів."""
        self.client.force_authenticate(user=self.manager_one)
        response = self.client.get('/api/deals/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.deal_one.id)

    def test_manager_cannot_access_foreign_deal_by_id_idor(self):
        """Захист від IDOR: спроба прочитати або змінити чужу угоду за ID повертає 404."""
        self.client.force_authenticate(user=self.manager_one)

        get_response = self.client.get(f'/api/deals/{self.deal_two.id}/')
        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)

        patch_response = self.client.patch(
            f'/api/deals/{self.deal_two.id}/',
            {'amount': '1.00'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_manager_cannot_reassign_client_manager(self):
        """Звичайний менеджер не може переписати свого клієнта на іншого працівника."""
        self.client.force_authenticate(user=self.manager_one)
        response = self.client.patch(
            f'/api/clients/{self.client_one.id}/',
            {'responsible_manager': self.manager_two.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_cannot_access_team_management(self):
        """Ендпоінт управління працівниками /api/users/ закритий для не-адміністраторів."""
        self.client.force_authenticate(user=self.manager_one)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_has_full_access_and_correct_stats(self):
        """Адміністратор бачить усі угоди компанії та отримує коректну агрегацію KPI."""
        self.client.force_authenticate(user=self.admin)

        deals_response = self.client.get('/api/deals/')
        self.assertEqual(deals_response.status_code, status.HTTP_200_OK)
        self.assertEqual(deals_response.data['count'], 2)

        stats_response = self.client.get('/api/deals/stats/')
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_response.data['active_count'], 1)
        self.assertEqual(stats_response.data['pipeline_sum'], '5000.00')
        self.assertEqual(stats_response.data['won_sum'], '3200.00')