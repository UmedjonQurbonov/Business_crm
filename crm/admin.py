from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from crm.models import User, Product, Client, Transaction, TransactionItem, Expense, DebtRepayment, SalaryPayout

class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'unpaid_balance', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom CRM Fields', {'fields': ('role', 'unpaid_balance')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom CRM Fields', {'fields': ('role', 'unpaid_balance')}),
    )

class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'cost_price', 'wholesale_price', 'stock_quantity', 'min_stock_level', 'is_low_stock')
    list_filter = ('category',)
    search_fields = ('name', 'category')

    def is_low_stock(self, obj):
        return obj.stock_quantity <= obj.min_stock_level
    is_low_stock.boolean = True
    is_low_stock.short_description = 'Low Stock Alert'

class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'current_debt')
    search_fields = ('name', 'phone')

class TransactionItemInline(admin.TabularInline):
    model = TransactionItem
    extra = 1

class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'client', 'created_by', 'total_amount', 'owner_profit', 'seller_profit', 'payment_status', 'created_at')
    list_filter = ('type', 'payment_status', 'created_at')
    search_fields = ('client__name', 'created_by__username')
    inlines = [TransactionItemInline]

class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'amount', 'description', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('description',)

class DebtRepaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'amount', 'created_at', 'created_by')
    list_filter = ('created_at',)
    search_fields = ('client__name', 'created_by__username')

class SalaryPayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'seller', 'amount', 'created_at', 'created_by')
    list_filter = ('created_at',)
    search_fields = ('seller__username', 'created_by__username')

admin.site.register(User, UserAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(Client, ClientAdmin)
admin.site.register(Transaction, TransactionAdmin)
admin.site.register(Expense, ExpenseAdmin)
admin.site.register(DebtRepayment, DebtRepaymentAdmin)
admin.site.register(SalaryPayout, SalaryPayoutAdmin)
