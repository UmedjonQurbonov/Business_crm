from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    Allows access only to users with the 'owner' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'owner'

class IsSeller(permissions.BasePermission):
    """
    Allows access only to users with the 'seller' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'seller'
