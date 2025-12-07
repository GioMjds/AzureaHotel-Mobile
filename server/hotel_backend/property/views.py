from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from .models import Rooms, Areas, Amenities
from .serializers import RoomSerializer, AreaSerializer, AmenitySerializer

# Create your views here.
@api_view(['GET'])
def fetch_rooms(request):
    try:
        rooms = Rooms.objects.all().order_by('id')

        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 6)
        paginator = Paginator(rooms, page_size)

        try:
            paginated_rooms = paginator.page(page)
        except PageNotAnInteger:
            paginated_rooms = paginator.page(1)
        except EmptyPage:
            paginated_rooms = paginator.page(paginator.num_pages)

        serializer = RoomSerializer(paginated_rooms, many=True)
        return Response({
            "data": serializer.data,
            "pagination": {
                "total_pages": paginator.num_pages,
                "current_page": int(page),
                "total_items": paginator.count,
                "page_size": int(page_size),
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def fetch_room_detail(request, id):
    try:
        room = Rooms.objects.get(id=id)
        serializer = RoomSerializer(room, context={'request': request})
        return Response({
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def fetch_amenities(request):
    try:
        amenities = Amenities.objects.all()
        serializer = AmenitySerializer(amenities, many=True)
        return Response({
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def fetch_areas(request):
    try:
        areas = Areas.objects.all().order_by('id')

        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 6)
        paginator = Paginator(areas, page_size)

        try:
            paginated_areas = paginator.page(page)
        except PageNotAnInteger:
            paginated_areas = paginator.page(1)
        except EmptyPage:
            paginated_areas = paginator.page(paginator.num_pages)

        serializer = AreaSerializer(paginated_areas, many=True)
        return Response({
            "data": serializer.data,
            "pagination": {
                "total_pages": paginator.num_pages,
                "current_page": int(page),
                "total_items": paginator.count,
                "page_size": int(page_size),
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def fetch_area_detail(request, id):
    try:
        area = Areas.objects.get(id=id)
        serializer = AreaSerializer(area, context={'request': request})
        return Response({
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
