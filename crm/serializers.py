from decimal import Decimal
from django.db import transaction
from django.core.validators import MinValueValidator
from rest_framework import serializers
from crm.models import User, Product, Client, Transaction, TransactionItem, Expense, DebtRepayment, SalaryPayout

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'unpaid_balance']
        read_only_fields = ['id', 'role', 'unpaid_balance']

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'category', 'cost_price', 'wholesale_price', 'stock_quantity', 'min_stock_level']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            if request.user.role != 'owner':
                representation.pop('cost_price', None)
        else:
            # Default to secure behavior: hide cost_price if unauthenticated
            representation.pop('cost_price', None)
        return representation

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'phone', 'current_debt']
        read_only_fields = ['id', 'current_debt']

class TransactionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = TransactionItem
        fields = ['id', 'product', 'product_name', 'quantity', 'fact_price']

class TransactionSerializer(serializers.ModelSerializer):
    items = TransactionItemSerializer(many=True)
    paid_amount = serializers.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        required=False, 
        write_only=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    class Meta:
        model = Transaction
        fields = [
            'id', 'type', 'client', 'created_by', 'created_at', 
            'total_amount', 'owner_profit', 'seller_profit', 
            'payment_status', 'paid_amount', 'items'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'total_amount', 'owner_profit', 'seller_profit']

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        user_role = user.role if user else 'seller'

        tx_type = attrs.get('type')
        payment_status = attrs.get('payment_status')
        client = attrs.get('client')
        items_data = attrs.get('items', [])
        paid_amount = attrs.get('paid_amount')

        # 1. RBAC rules
        if user_role == 'seller' and tx_type == 'wholesale':
            raise serializers.ValidationError("Продавцам запрещено оформлять оптовые продажи.")

        # 2. Check item list
        if not items_data:
            raise serializers.ValidationError("Сделка должна содержать хотя бы один товар.")

        # 3. Check client requirements
        if tx_type == 'wholesale' and not client:
            raise serializers.ValidationError("Для оптовой продажи необходимо выбрать клиента.")

        if tx_type == 'retail' and client:
            raise serializers.ValidationError("Для розничной продажи клиент не должен указываться.")

        # 4. Validate partial payment
        if payment_status == 'partial_debt':
            if paid_amount is None:
                raise serializers.ValidationError({"paid_amount": "При частичной оплате необходимо указать полученную сумму."})
            total_amount = sum(item['fact_price'] * item['quantity'] for item in items_data)
            if paid_amount > total_amount:
                raise serializers.ValidationError({"paid_amount": "Полученная сумма не может быть больше суммы сделки."})
        elif paid_amount is not None:
            raise serializers.ValidationError({"paid_amount": "Полученная сумма указывается только при статусе оплаты 'partial_debt'."})

        # 5. Check stock level constraints
        for item in items_data:
            product = item['product']
            qty = item['quantity']
            if qty <= 0:
                raise serializers.ValidationError(f"Количество товара {product.name} должно быть больше 0.")
            if product.stock_quantity < qty:
                raise serializers.ValidationError(
                    f"Недостаточно товара {product.name} на складе. Доступно: {product.stock_quantity}, запрошено: {qty}."
                )

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        paid_amount = validated_data.pop('paid_amount', None)
        request = self.context.get('request')
        user = request.user
        tx_type = validated_data['type']
        client = validated_data.get('client')
        payment_status = validated_data['payment_status']

        with transaction.atomic():
            # 1. Lock products
            product_ids = [item['product'].id for item in items_data]
            products_locked = {p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)}

            # Double check stock under lock
            for item in items_data:
                p_id = item['product'].id
                locked_product = products_locked[p_id]
                qty = item['quantity']
                if locked_product.stock_quantity < qty:
                    raise serializers.ValidationError(f"Недостаточно товара {locked_product.name} на складе.")

            total_amount = Decimal('0.00')
            total_owner_profit = Decimal('0.00')
            total_seller_profit = Decimal('0.00')

            item_instances = []

            for item in items_data:
                p_id = item['product'].id
                product = products_locked[p_id]
                qty = item['quantity']
                fact_price = item['fact_price']

                item_total = fact_price * qty
                total_amount += item_total

                if tx_type == 'retail':
                    # Retail Profit: (P_fact - P_opt) * Q
                    profit = (fact_price - product.wholesale_price) * qty
                    # Split: Seller 40%, Owner 60%
                    s_profit = profit * Decimal('0.40')
                    o_profit = profit * Decimal('0.60')

                    total_seller_profit += s_profit
                    total_owner_profit += o_profit
                else:
                    # Wholesale Profit: (P_opt_fact - cost_price) * Q
                    # 100% to Owner.
                    profit = (fact_price - product.cost_price) * qty
                    total_owner_profit += profit

                # Deduct stock
                product.stock_quantity -= qty
                product.save()

                item_instances.append(TransactionItem(
                    product=product,
                    quantity=qty,
                    fact_price=fact_price
                ))

            # 2. Handle client debt for wholesale
            if tx_type == 'wholesale' and client:
                locked_client = Client.objects.select_for_update().get(id=client.id)
                if payment_status == 'debt':
                    locked_client.current_debt += total_amount
                    locked_client.save()
                elif payment_status == 'partial_debt':
                    debt_to_add = total_amount - paid_amount
                    locked_client.current_debt += debt_to_add
                    locked_client.save()

            # 3. Create transaction
            tx = Transaction.objects.create(
                type=tx_type,
                client=client,
                created_by=user,
                total_amount=total_amount,
                owner_profit=total_owner_profit,
                seller_profit=total_seller_profit,
                payment_status=payment_status
            )

            # 4. Save items linking them to transaction
            for item_inst in item_instances:
                item_inst.transaction = tx
                item_inst.save()

            # 5. Apply retail profit to seller unpaid balance
            if tx_type == 'retail' and user.role == 'seller' and total_seller_profit > 0:
                locked_user = User.objects.select_for_update().get(id=user.id)
                locked_user.unpaid_balance += total_seller_profit
                locked_user.save()

        return tx

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'amount', 'description', 'created_at']

class DebtRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtRepayment
        fields = ['id', 'client', 'amount', 'created_at', 'created_by']
        read_only_fields = ['id', 'created_by', 'created_at']

    def validate(self, attrs):
        client = attrs.get('client')
        amount = attrs.get('amount')

        if amount <= 0:
            raise serializers.ValidationError("Сумма погашения долга должна быть больше 0.")

        # Lock client to verify debt
        locked_client = Client.objects.filter(id=client.id).first()
        if not locked_client:
            raise serializers.ValidationError("Клиент не найден.")

        if locked_client.current_debt < amount:
            raise serializers.ValidationError(
                f"Сумма погашения ({amount}) превышает текущий долг клиента ({locked_client.current_debt})."
            )

        return attrs

    def create(self, validated_data):
        client = validated_data['client']
        amount = validated_data['amount']
        request = self.context.get('request')
        user = request.user

        with transaction.atomic():
            locked_client = Client.objects.select_for_update().get(id=client.id)
            if locked_client.current_debt < amount:
                raise serializers.ValidationError("Сумма погашения превышает текущий долг клиента.")
            
            # Deduct debt
            locked_client.current_debt -= amount
            locked_client.save()

            # Log repayment
            repayment = DebtRepayment.objects.create(
                client=locked_client,
                amount=amount,
                created_by=user
            )

        return repayment

class SalaryPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryPayout
        fields = ['id', 'seller', 'amount', 'created_at', 'created_by']
        read_only_fields = ['id', 'created_by', 'created_at']

    def validate(self, attrs):
        seller = attrs.get('seller')
        amount = attrs.get('amount')

        if seller.role != 'seller':
            raise serializers.ValidationError("Выплаты могут производиться только пользователям с ролью 'seller'.")

        if amount <= 0:
            raise serializers.ValidationError("Сумма выплаты должна быть больше 0.")

        if seller.unpaid_balance < amount:
            raise serializers.ValidationError(
                f"Недостаточно средств для выплаты. Текущий баланс продавца: {seller.unpaid_balance}, запрос: {amount}."
            )

        return attrs

    def create(self, validated_data):
        seller = validated_data['seller']
        amount = validated_data['amount']
        request = self.context.get('request')
        user = request.user

        with transaction.atomic():
            locked_seller = User.objects.select_for_update().get(id=seller.id)
            if locked_seller.unpaid_balance < amount:
                raise serializers.ValidationError("Недостаточно средств на балансе продавца.")

            # Deduct balance
            locked_seller.unpaid_balance -= amount
            locked_seller.save()

            # Log payout
            payout = SalaryPayout.objects.create(
                seller=locked_seller,
                amount=amount,
                created_by=user
            )

        return payout
