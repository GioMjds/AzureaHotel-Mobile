from ipware import get_client_ip # type: ignore

class ClientIPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get client IP from request
        ip, _ = get_client_ip(request)
        # Attach IP to the request object for access in views
        request.client_ip = ip
        return self.get_response(request)