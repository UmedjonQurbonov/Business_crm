from django.urls import path, include
from rest_framework.routers import DefaultRouter
from crm.views import (
    CustomObtainAuthToken, ProductViewSet, ClientViewSet, 
    TransactionViewSet, ExpenseViewSet, SellerViewSet, 
    AnalyticsDailyView
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'sellers', SellerViewSet, basename='seller')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', CustomObtainAuthToken.as_view(), name='login'),
    path('analytics/daily/', AnalyticsDailyView.as_view(), name='analytics_daily'),
]
