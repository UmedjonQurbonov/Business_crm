from decimal import Decimal
from django.shortcuts import render
from django.db.models import Sum
from django.utils.dateparse import parse_date
from django.utils.timezone import localdate
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token

from crm.models import User, Product, Client, Transaction, Expense, DebtRepayment, SalaryPayout
from crm.serializers import (
    UserSerializer, ProductSerializer, ClientSerializer, 
    TransactionSerializer, ExpenseSerializer, 
    DebtRepaymentSerializer, SalaryPayoutSerializer
)
from crm.permissions import IsOwner, IsSeller

class CustomObtainAuthToken(ObtainAuthToken):
    """
    Custom auth token obtain view that returns user details along with the token.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'role': user.role
        })

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsOwner()]

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all().order_by('name')
    serializer_class = ClientSerializer
    permission_classes = [IsOwner]

    @action(detail=True, methods=['post'], serializer_class=DebtRepaymentSerializer)
    def repay(self, request, pk=None):
        client = self.get_object()
        data = request.data.copy()
        data['client'] = client.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        if self.request.user.role == 'owner':
            return Transaction.objects.all().order_by('-created_at')
        # Seller only sees their own retail transactions
        return Transaction.objects.filter(created_by=self.request.user, type='retail').order_by('-created_at')

    def get_permissions(self):
        if self.action == 'wholesale':
            return [IsOwner()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def retail(self, request):
        data = request.data.copy()
        data['type'] = 'retail'
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsOwner])
    def wholesale(self, request):
        data = request.data.copy()
        data['type'] = 'wholesale'
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-created_at')
    serializer_class = ExpenseSerializer
    permission_classes = [IsOwner]

class SellerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(role='seller').order_by('username')
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'me_balance':
            return [permissions.IsAuthenticated()]
        return [IsOwner()]

    @action(detail=True, methods=['post'], serializer_class=SalaryPayoutSerializer)
    def pay(self, request, pk=None):
        seller = self.get_object()
        amount = seller.unpaid_balance
        if amount <= 0:
            return Response({"detail": "Баланс продавца равен 0."}, status=status.HTTP_400_BAD_REQUEST)
        
        data = {
            'seller': seller.id,
            'amount': amount
        }
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='me/balance')
    def me_balance(self, request):
        return Response({
            'unpaid_balance': request.user.unpaid_balance
        })

class AnalyticsDailyView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        today = localdate()
        if start_date_str:
            start_date = parse_date(start_date_str)
            if start_date is None:
                return Response(
                    {"start_date": "Неверный формат даты. Ожидается YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            start_date = today

        if end_date_str:
            end_date = parse_date(end_date_str)
            if end_date is None:
                return Response(
                    {"end_date": "Неверный формат даты. Ожидается YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            end_date = today

        # 1. Wholesale revenue (Sum of owner_profit for wholesale)
        wholesale_rev = Transaction.objects.filter(
            type='wholesale',
            created_at__date__range=[start_date, end_date]
        ).aggregate(total=Sum('owner_profit'))['total'] or Decimal('0.00')

        # 2. Retail revenue (Sum of owner_profit for retail, which is 60%)
        retail_rev = Transaction.objects.filter(
            type='retail',
            created_at__date__range=[start_date, end_date]
        ).aggregate(total=Sum('owner_profit'))['total'] or Decimal('0.00')

        # 3. Debt returns (Repayments sum)
        debt_returns = DebtRepayment.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 4. Expenses sum
        expenses_sum = Expense.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 5. Net profit formula: (Wholesale revenue + Retail revenue + Debt returns) - Expense
        net_profit = (wholesale_rev + retail_rev + debt_returns) - expenses_sum

        # 6. Total unpaid salary to all sellers
        total_unpaid_sellers = User.objects.filter(role='seller').aggregate(total=Sum('unpaid_balance'))['total'] or Decimal('0.00')

        return Response({
            'start_date': start_date,
            'end_date': end_date,
            'wholesale_revenue': wholesale_rev,
            'retail_revenue': retail_rev,
            'debt_returns': debt_returns,
            'expenses': expenses_sum,
            'net_profit': net_profit,
            'total_unpaid_sellers': total_unpaid_sellers
        })
