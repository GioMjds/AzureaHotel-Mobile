from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Rooms, Areas, Amenities
from .serializers import RoomSerializer, AreaSerializer, AmenitySerializer

# Create your views here.
@api_view(['GET'])
def fetch_rooms(request):
    try:
        rooms = Rooms.objects.filter(status='available')
        serializer = RoomSerializer(rooms, many=True)
        return Response({
            "data": serializer.data
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
        areas = Areas.objects.filter(status='available')
        serializer = AreaSerializer(areas, many=True)
        return Response({
            "data": serializer.data
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
