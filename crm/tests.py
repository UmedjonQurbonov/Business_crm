from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from crm.models import User, Product, Client, Transaction, Expense, DebtRepayment, SalaryPayout

class CRMBusinessLogicTests(APITestCase):

    def setUp(self):
        # 1. Create Users
        self.owner = User.objects.create_superuser(
            username='owner_user',
            email='owner@example.com',
            password='ownerpassword',
            role='owner'
        )
        self.seller = User.objects.create_user(
            username='seller_user',
            email='seller@example.com',
            password='sellerpassword',
            role='seller'
        )

        # Create DRF Tokens
        self.owner_token = Token.objects.create(user=self.owner)
        self.seller_token = Token.objects.create(user=self.seller)

        # 2. Create Product
        self.product = Product.objects.create(
            name='Kazan 10L',
            category='Kazans',
            cost_price=Decimal('100.00'),
            wholesale_price=Decimal('150.00'),
            stock_quantity=50,
            min_stock_level=5
        )

        # 3. Create Client (renamed from self.client to avoid conflict with self.client api test runner)
        self.crm_client = Client.objects.create(
            name='Alisher Shop',
            phone='+992900000001',
            current_debt=Decimal('0.00')
        )

    def set_auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

    def test_retail_sale(self):
        """
        Tests retail sale checkout by seller:
        - stock decremented
        - transaction recorded
        - seller unpaid balance credited with 40% of retail profit
        """
        self.set_auth(self.seller_token)
        url = reverse('transaction-retail')
        
        data = {
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 10,
                    'fact_price': '200.00'
                }
            ],
            'payment_status': 'cash'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify stock decrement
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 40)

        # Verify profit calculations:
        # Wholesale Price: 150.00, Fact Price: 200.00
        # Profit per item = 200 - 150 = 50
        # Total profit = 50 * 10 = 500.00
        # Seller share (40%) = 200.00
        # Owner share (60%) = 300.00
        tx = Transaction.objects.get(id=response.data['id'])
        self.assertEqual(tx.total_amount, Decimal('2000.00'))
        self.assertEqual(tx.owner_profit, Decimal('300.00'))
        self.assertEqual(tx.seller_profit, Decimal('200.00'))

        # Verify seller's unpaid balance increase
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.unpaid_balance, Decimal('200.00'))

    def test_wholesale_sale_debt(self):
        """
        Tests wholesale sale checkout by owner:
        - stock decremented
        - client debt increased
        - owner profit credited with 100% of profit
        """
        self.set_auth(self.owner_token)
        url = reverse('transaction-wholesale')
        
        # Read the current stock level before transaction
        current_stock = self.product.stock_quantity

        data = {
            'client': self.crm_client.id,
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 5,
                    'fact_price': '180.00'
                }
            ],
            'payment_status': 'debt'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify stock decrement
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, current_stock - 5)

        # Verify client debt:
        # total = 5 * 180 = 900.00
        self.crm_client.refresh_from_db()
        self.assertEqual(self.crm_client.current_debt, Decimal('900.00'))

        # Verify profits:
        # Cost Price: 100.00, Fact Price: 180.00
        # Profit = (180 - 100) * 5 = 400.00 (100% to owner)
        tx = Transaction.objects.get(id=response.data['id'])
        self.assertEqual(tx.total_amount, Decimal('900.00'))
        self.assertEqual(tx.owner_profit, Decimal('400.00'))
        self.assertEqual(tx.seller_profit, Decimal('0.00'))

    def test_debt_repayment(self):
        """
        Tests client debt repayment.
        """
        # Manually add debt to client
        self.crm_client.current_debt = Decimal('500.00')
        self.crm_client.save()

        self.set_auth(self.owner_token)
        url = reverse('client-repay', args=[self.crm_client.id])

        data = {
            'amount': '200.00'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify client debt reduced to 300.00
        self.crm_client.refresh_from_db()
        self.assertEqual(self.crm_client.current_debt, Decimal('300.00'))

        # Verify DebtRepayment log
        repayment = DebtRepayment.objects.get(id=response.data['id'])
        self.assertEqual(repayment.amount, Decimal('200.00'))
        self.assertEqual(repayment.client, self.crm_client)
        self.assertEqual(repayment.created_by, self.owner)

    def test_salary_payout(self):
        """
        Tests owner paying salary to seller.
        """
        # Manually add unpaid salary balance to seller
        self.seller.unpaid_balance = Decimal('400.00')
        self.seller.save()

        self.set_auth(self.owner_token)
        url = reverse('seller-pay', args=[self.seller.id])

        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify seller balance обнулен
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.unpaid_balance, Decimal('0.00'))

        # Verify SalaryPayout log
        payout = SalaryPayout.objects.get(id=response.data['id'])
        self.assertEqual(payout.amount, Decimal('400.00'))
        self.assertEqual(payout.seller, self.seller)
        self.assertEqual(payout.created_by, self.owner)

    def test_financial_analytics(self):
        """
        Tests the daily financial analytics report.
        """
        # 1. Simulate a retail sale
        self.test_retail_sale()  # Owner Profit: 300.00, Seller Profit: 200.00, stock decremented by 10
        
        # 2. Simulate a wholesale sale on debt
        self.test_wholesale_sale_debt()  # Owner Profit: 400.00, Client Debt increased by 900.00
        
        # 3. Simulate a debt repayment
        self.set_auth(self.owner_token)
        repay_url = reverse('client-repay', args=[self.crm_client.id])
        self.client.post(repay_url, {'amount': '300.00'}, format='json') # Debt returns: 300.00

        # 4. Simulate a business expense
        Expense.objects.create(amount=Decimal('150.00'), description='Office supplies')

        # Request analytics report
        url = reverse('analytics_daily')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify report values:
        # wholesale_revenue = 400.00
        # retail_revenue = 300.00
        # debt_returns = 300.00
        # expenses = 150.00
        # net_profit = (400.00 + 300.00 + 300.00) - 150.00 = 850.00
        self.assertEqual(Decimal(response.data['wholesale_revenue']), Decimal('400.00'))
        self.assertEqual(Decimal(response.data['retail_revenue']), Decimal('300.00'))
        self.assertEqual(Decimal(response.data['debt_returns']), Decimal('300.00'))
        self.assertEqual(Decimal(response.data['expenses']), Decimal('150.00'))
        self.assertEqual(Decimal(response.data['net_profit']), Decimal('850.00'))

    def test_role_based_permissions(self):
        """
        Tests that seller is restricted from:
        - wholesale sales
        - client management
        - expenses
        - general financial analytics
        - listing other sellers
        """
        self.set_auth(self.seller_token)

        # 1. Retail sale is allowed
        retail_url = reverse('transaction-retail')
        data = {'items': [{'product': self.product.id, 'quantity': 1, 'fact_price': '160.00'}], 'payment_status': 'cash'}
        response = self.client.post(retail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 2. Wholesale sale is forbidden
        wholesale_url = reverse('transaction-wholesale')
        data = {'client': self.crm_client.id, 'items': [{'product': self.product.id, 'quantity': 1, 'fact_price': '160.00'}], 'payment_status': 'debt'}
        response = self.client.post(wholesale_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Client listing is forbidden
        client_list_url = reverse('client-list')
        response = self.client.get(client_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Expense creation is forbidden
        expense_url = reverse('expense-list')
        response = self.client.post(expense_url, {'amount': '50.00', 'description': 'snack'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Financial analytics is forbidden
        analytics_url = reverse('analytics_daily')
        response = self.client.get(analytics_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 6. Listing sellers is forbidden
        sellers_url = reverse('seller-list')
        response = self.client.get(sellers_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_financial_analytics_invalid_range(self):
        """
        Tests that querying analytics with start_date > end_date returns 400.
        """
        self.set_auth(self.owner_token)
        url = reverse('analytics_daily')
        response = self.client.get(url + '?start_date=2026-07-03&end_date=2026-07-01')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Начальная дата (start_date) не может быть позже", response.data['detail'])
