from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator

class User(AbstractUser):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('seller', 'Seller'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='seller')
    unpaid_balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

class Product(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, db_index=True)
    cost_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    wholesale_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    min_stock_level = models.PositiveIntegerField(default=5)

    def __str__(self):
        return self.name

class Client(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    current_debt = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    def __str__(self):
        return self.name

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('retail', 'Retail'),
        ('wholesale', 'Wholesale'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('cash', 'Cash'),
        ('debt', 'Debt'),
        ('partial_debt', 'Partial Debt'),
    ]

    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    client = models.ForeignKey(Client, null=True, blank=True, on_delete=models.PROTECT, related_name='transactions')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='transactions')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    total_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    owner_profit = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    seller_profit = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    payment_status = models.CharField(max_length=15, choices=PAYMENT_STATUS_CHOICES)

    def __str__(self):
        return f"Transaction #{self.id} ({self.type})"

class TransactionItem(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='transaction_items')
    quantity = models.PositiveIntegerField()
    fact_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

class Expense(models.Model):
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"Expense #{self.id}: {self.amount}"

class DebtRepayment(models.Model):
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='repayments')
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='repayments')

    def __str__(self):
        return f"Repayment #{self.id} - {self.client.name}: {self.amount}"

class SalaryPayout(models.Model):
    seller = models.ForeignKey(User, on_delete=models.PROTECT, related_name='salary_payouts')
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_payouts')

    def __str__(self):
        return f"Payout #{self.id} to {self.seller.username}: {self.amount}"
