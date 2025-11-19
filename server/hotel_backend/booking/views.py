import json
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Bookings, Reviews, CraveOnItem
from property.models import Rooms, Areas
from property.serializers import AreaSerializer, RoomSerializer
from .serializers import (
    BookingSerializer, 
    BookingRequestSerializer,
    ReviewSerializer,
)
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from datetime import datetime
from django.db import transaction, connections
from django.db.models import Q
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from .craveon_integration import CraveOnIntegration
from .pdf_generator import EReceiptGenerator
import base64
import imghdr
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from .service import paymongo as paymongo_service
from django.http import HttpResponseRedirect
import uuid
from django.utils.http import urlencode
from user_roles.models import CustomUsers
from .models import Transactions
from property.models import Rooms
from property.models import Areas

logger = logging.getLogger(__name__)

# Create your views here.
@api_view(['GET'])
def fetch_availability(request):
    arrival_date = request.query_params.get('arrival') or request.data.get('arrival')
    departure_date = request.query_params.get('departure') or request.data.get('departure')
    exclude_statuses = request.query_params.get('exclude_statuses', '').split(',')
    
    if not exclude_statuses or '' in exclude_statuses:
        exclude_statuses = ['reserved', 'checked_in']
    
    if not arrival_date or not departure_date:
        return Response({
            "error": "Please provide both arrival and departure dates"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        arrival = datetime.strptime(arrival_date, "%Y-%m-%d")
        departure = datetime.strptime(departure_date, "%Y-%m-%d")
    except ValueError:
        return Response({
            "error": "Invalid date format. Use YYYY-MM-DD"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if departure <= arrival:
        return Response({
            'error': "Departure date should be greater than arrival date"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    rooms = Rooms.objects.filter(status='available')
    
    booked_room_ids = Bookings.objects.filter(
        ~Q(status__in=['cancelled', 'rejected', 'checked_out', 'no_show']),
        Q(check_in_date__lt=departure) & Q(check_out_date__gt=arrival),
        is_venue_booking=False
    ).values_list('room_id', flat=True)
    
    rooms = rooms.exclude(id__in=booked_room_ids)
    
    areas = Areas.objects.filter(status='available')
    
    booked_area_ids = Bookings.objects.filter(
        ~Q(status__in=['cancelled', 'rejected', 'checked_out', 'no_show']),
        Q(check_in_date__lt=departure) & Q(check_out_date__gt=arrival),
        is_venue_booking=True
    ).values_list('area_id', flat=True)
    
    areas = areas.exclude(id__in=booked_area_ids)
    
    room_serializer = RoomSerializer(rooms, many=True, context={'request': request})
    area_serializer = AreaSerializer(areas, many=True)
    
    return Response({
        "rooms": room_serializer.data,
        "areas": area_serializer.data
    }, status=status.HTTP_200_OK)

@api_view(['GET', 'POST'])
def bookings_list(request):
    try:
        if request.method == 'GET':
            if not request.user.is_authenticated:
                return Response({
                    "error": "Authentication required to view bookings"
                }, status=status.HTTP_401_UNAUTHORIZED)

            page = request.query_params.get('page', 1)
            page_size = request.query_params.get('page_size', 10)
            status_filter = request.query_params.get('status')
            bookings = Bookings.objects.all().order_by('-created_at')
            
            if status_filter:
                bookings = bookings.filter(status=status_filter)
                
            if request.user.role == 'guest':
                bookings = bookings.filter(user=request.user)
            
            paginator = Paginator(bookings, page_size)
            try:
                paginated_bookings = paginator.page(page)
            except PageNotAnInteger:
                paginated_bookings = paginator.page(1)
            except EmptyPage:
                paginated_bookings = paginator.page(paginator.num_pages)
            
            serializer = BookingSerializer(paginated_bookings, many=True)
            
            return Response({
                "data": serializer.data,
                "pagination": {
                    "total_pages": paginator.num_pages,
                    "current_page": int(page),
                    "total_items": paginator.count,
                    "page_size": int(page_size)
                }
            }, status=status.HTTP_200_OK)
            
        elif request.method == 'POST':
            # Log incoming payload for debugging
            try:
                logger.info('Incoming booking POST: %s', json.dumps(request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)))
            except Exception:
                logger.info('Incoming booking POST (raw): %s', str(request.data))

            # Log files with details
            file_keys = list(request.FILES.keys())
            logger.info('Incoming files keys: %s', file_keys)
            for fk in file_keys:
                try:
                    f = request.FILES.get(fk)
                    logger.info('File key=%s, name=%s, content_type=%s, size=%s', fk, getattr(f, 'name', None), getattr(f, 'content_type', None), getattr(f, 'size', None))
                except Exception:
                    logger.info('File key=%s could not be logged in detail', fk)

            request_data = request.data.copy()

            # Backwards compatibility: ensure uploaded file is available under 'paymentProof'
            # The serializer expects to read the file from request.FILES.get('paymentProof')
            try:
                # If client uploaded under snake_case 'payment_proof', mirror it to camelCase in the underlying WSGI request
                if 'payment_proof' in request.FILES and 'paymentProof' not in request.FILES:
                    try:
                        # request._request is the original HttpRequest which holds a mutable FILES dict
                        request._request.FILES['paymentProof'] = request._request.FILES.get('payment_proof')
                        logger.info('Mirrored request.FILES["payment_proof"] to request.FILES["paymentProof"]')
                    except Exception as e:
                        logger.warning('Could not mirror payment_proof to paymentProof: %s', str(e))

                # If client used camelCase already, nothing to do
            except Exception:
                logger.exception('Error while normalizing uploaded file keys')
            unauthenticated = not (request.user and request.user.is_authenticated)
            
            try:
                serializer = BookingRequestSerializer(
                    data=request_data, 
                    context={
                        'request': request,
                        'unauthenticated': unauthenticated
                    }
                )
                
                if serializer.is_valid():
                    booking = serializer.save()
                    booking_data = BookingSerializer(booking).data
                    
                    return Response({
                        "id": booking.id,
                        "message": "Booking created successfully",
                        "data": booking_data
                    }, status=status.HTTP_201_CREATED)
                else:
                    logger.warning('Booking creation validation errors: %s', serializer.errors)
                    return Response({
                        "error": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def booking_detail(request, booking_id):
    if not booking_id.isdigit():
        return Response({"error": "Invalid booking ID"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        booking = Bookings.objects.get(id=booking_id)
    except Bookings.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        booking_serializer = BookingSerializer(booking)
        data = booking_serializer.data
        
        if booking.is_venue_booking and booking.area:
            area_serializer = AreaSerializer(booking.area)
            data['area'] = area_serializer.data
        elif booking.room:
            room_serializer = RoomSerializer(booking.room)
            data['room'] = room_serializer.data

        return Response({
            "data": data
        }, status=status.HTTP_200_OK)
    elif request.method == 'PUT':
        serializer = BookingSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == "DELETE":
        booking.delete()
        return Response({
            "message": "Booking deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
def reservation_list(request):
    try:
        if request.method == 'GET':
            if not request.user.is_authenticated:
                return Response({
                    "error": "Authentication required to view reservations"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            bookings = Bookings.objects.all()
            serializer = BookingSerializer(bookings, many=True)
            return Response({
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        elif request.method == 'POST':
            serializer = BookingRequestSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                booking = serializer.save()
                booking_data = BookingSerializer(booking).data
                
                return Response({
                    "id": booking.id,
                    "message": "Booking created successfully",
                    "data": booking_data
                }, status=status.HTTP_201_CREATED)
            return Response({
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def reservation_detail(request, reservation_id):
    try:
        booking = Bookings.objects.get(id=reservation_id)
    except Bookings.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = BookingSerializer(booking)
        return Response(serializer.data)
    elif request.method == 'PUT':
        serializer = BookingSerializer(booking, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response({
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        booking.delete()
        return Response({
            "message": "Reservation deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
def area_reservations(request):
    try:
        if request.method == 'GET':
            if not request.user.is_authenticated:
                return Response({
                    "error": "Authentication required to view area reservations"
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            bookings = Bookings.objects.filter(is_venue_booking=True).order_by('-created_at')
            serializer = BookingSerializer(bookings, many=True)
            return Response({
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        elif request.method == 'POST':
            serializer = BookingRequestSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                booking = serializer.save()
                booking_data = BookingSerializer(booking).data
                
                return Response({
                    "id": booking.id,
                    "message": "Venue booking created successfully",
                    "data": booking_data
                }, status=status.HTTP_201_CREATED)
            return Response({
                "error": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def area_detail(request, area_id):
    try:
        area = Areas.objects.get(id=area_id)
        
        serializer = AreaSerializer(area, context={'request': request})
        serialized_data = serializer.data
        
        return Response({
            "data": serialized_data
        }, status=status.HTTP_200_OK)
    except Areas.DoesNotExist:
        return Response({"error": "Area not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def room_detail(request, room_id):
    try:
        room = Rooms.objects.get(id=room_id)
        serializer = RoomSerializer(room, context={'request': request})
        return Response({
            "data": serializer.data
        }, status=status.HTTP_200_OK)
    except Rooms.DoesNotExist:
        return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def user_bookings(request):
    try:
        user = request.user
        bookings = Bookings.objects.filter(user=user).order_by('-created_at')
        
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 5)
        
        paginator = Paginator(bookings, page_size)
        
        try:
            paginated_bookings = paginator.page(page)
        except PageNotAnInteger:
            paginated_bookings = paginator.page(1)
        except EmptyPage:
            paginated_bookings = paginator.page(paginator.num_pages)
            
        booking_data = []
        for booking in paginated_bookings:
            booking_serializer = BookingSerializer(booking)
            data = booking_serializer.data
            
            if booking.is_venue_booking and booking.area:
                area_serializer = AreaSerializer(booking.area)
                data['area'] = area_serializer.data
            elif booking.room:
                room_serializer = RoomSerializer(booking.room)
                data['room'] = room_serializer.data
            
            booking_data.append(data)
        
        return Response({
            "data": booking_data,
            "pagination": {
                "total_pages": paginator.num_pages,
                "current_page": int(page),
                "total_items": paginator.count,
                "page_size": int(page_size)
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def cancel_booking(request, booking_id):
    try:
        booking = Bookings.objects.get(id=booking_id)
    except Bookings.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role == 'guest':
        if booking.user != request.user:
            return Response({"error": "You do not have permission to cancel this booking"},
                            status=status.HTTP_403_FORBIDDEN)
        if booking.status.lower() != 'pending':
            return Response({"error": "You can only cancel bookings that are pending"},
                            status=status.HTTP_400_BAD_REQUEST)
    else:
        if booking.status.lower() == 'cancelled':
            return Response({"error": "Booking is already cancelled"},
                            status=status.HTTP_400_BAD_REQUEST)

    reason = request.data.get('reason', '').strip()
    if not reason:
        return Response({"error": "A cancellation reason is required"},
                        status=status.HTTP_400_BAD_REQUEST)

    booking.status = 'cancelled'
    booking.cancellation_reason = reason
    booking.cancellation_date = timezone.now()
    booking.save()

    if booking.status.lower() == 'reserved':
        if booking.is_venue_booking and booking.area:
            booking.area.status = 'available'
            booking.area.save()
        elif booking.room:
            booking.room.status = 'available'
            booking.room.save()

    serializer = BookingSerializer(booking)
    return Response({
        "message": "Booking cancelled successfully",
        "data": serializer.data
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
def fetch_room_bookings(request, room_id):
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        query = Q(room_id=room_id) & ~Q(status__in=['cancelled', 'rejected'])

        if start_date and end_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                end = datetime.strptime(end_date, "%Y-%m-%d")
                
                query = query & Q(check_in_date__lte=end) & Q(check_out_date__gte=start)
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, 
                               status=status.HTTP_400_BAD_REQUEST)
        
        bookings = Bookings.objects.filter(query)
        
        booking_data = []
        for booking in bookings:
            booking_data.append({
                'id': booking.id,
                'check_in_date': booking.check_in_date,
                'check_out_date': booking.check_out_date,
                'status': booking.status
            })
        
        return Response({
            "data": booking_data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def fetch_area_bookings(request, area_id):
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        query = Q(area_id=area_id) & ~Q(status__in=['cancelled', 'rejected'])
        
        if start_date and end_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                end = datetime.strptime(end_date, "%Y-%m-%d")
                
                query = query & Q(check_in_date__lte=end) & Q(check_out_date__gte=start)
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, 
                               status=status.HTTP_400_BAD_REQUEST)
        
        bookings = Bookings.objects.filter(query)
        
        booking_data = []
        for booking in bookings:
            booking_data.append({
                'id': booking.id,
                'check_in_date': booking.check_in_date,
                'check_out_date': booking.check_out_date,
                'status': booking.status,
                'start_time': booking.start_time,
                'end_time': booking.end_time
            })
        
        return Response({
            "data": booking_data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def booking_reviews(request, booking_id):
    try:
        booking = Bookings.objects.get(id=booking_id)
    except Bookings.DoesNotExist:
        return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if booking.user.id != request.user.id and not request.user.is_staff:
        return Response({"error": "You don't have permission to access these reviews"}, 
                    status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        reviews = Reviews.objects.filter(booking=booking)
        serializer = ReviewSerializer(reviews, many=True)
        return Response({"data": serializer.data}, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        if booking.status != 'checked_out':
            return Response({
                "error": "Reviews can only be submitted for checked-out bookings"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if Reviews.objects.filter(booking=booking, user=request.user).exists():
            return Response({
                "error": "You have already submitted a review for this booking"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = request.data.copy()
        data['booking'] = booking.id 
        
        serializer = ReviewSerializer(data=data, context={'request': request, 'booking': booking})
        if serializer.is_valid():
            review = serializer.save(user=request.user)
            if booking.is_venue_booking:
                review.area = booking.area
            else:
                review.room = booking.room
            review.save()
            return Response({
                "message": "Review submitted successfully",
                "data": ReviewSerializer(review).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def user_reviews(request):
    reviews = Reviews.objects.filter(user=request.user).order_by('-created_at')
    serializer = ReviewSerializer(reviews, many=True)
    return Response({"data": serializer.data}, status=status.HTTP_200_OK)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def review_detail(request, review_id):
    try:
        review = Reviews.objects.get(id=review_id)
    except Reviews.DoesNotExist:
        return Response({"error": "Review not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if review.user.id != request.user.id and not request.user.is_staff:
        return Response({"error": "You don't have permission to access this review"}, 
                    status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        serializer = ReviewSerializer(review)
        return Response({"data": serializer.data}, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = ReviewSerializer(review, data=request.data, partial=True, 
                                     context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"data": serializer.data}, status=status.HTTP_200_OK)
        return Response({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        review.delete()
        return Response({"message": "Review deleted successfully"}, 
                       status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
def room_reviews(request, room_id):
    try:
        page = int(request.query_params.get('page'))
        page_size = int(request.query_params.get('page_size'))
        
        reviews = Reviews.objects.filter(room_id=room_id).order_by('-created_at')
        paginator = Paginator(reviews, page_size)
        
        try:
            page_obj = paginator.page(page)
        except EmptyPage:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReviewSerializer(page_obj, many=True)
        return Response({
            "data": serializer.data,
            "total": paginator.count,
            "page": page_obj.number,
            "page_size": page_size,
            "total_pages": paginator.num_pages
        }, status=status.HTTP_200_OK)
    except Rooms.DoesNotExist:
        return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def area_reviews(request, area_id):
    try:
        page = int(request.query_params.get('page'))
        page_size = int(request.query_params.get('page_size'))
        
        reviews = Reviews.objects.filter(area_id=area_id).order_by('-created_at')
        paginator = Paginator(reviews, page_size)
        
        try:
            page_obj = paginator.page(page)
        except EmptyPage:
            return Response({"error": "Page not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReviewSerializer(page_obj, many=True)
        return Response({
            "data": serializer.data,
            "total": paginator.count,
            "page": page_obj.number,
            "page_size": page_size,
            "total_pages": paginator.num_pages
        }, status=status.HTTP_200_OK)
    
    except Areas.DoesNotExist:
        return Response({"error": "Area not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def generate_checkout_e_receipt(request, booking_id):
    try:
        try:
            booking = Bookings.objects.get(id=booking_id)
        except Bookings.DoesNotExist:
            return Response(
                {"error": "Booking not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has permission to view this booking
        if request.user.role == 'guest' and booking.user != request.user:
            return Response(
                {"error": "You don't have permission to access this booking"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if booking is checked out
        if booking.status.lower() != 'checked_out':
            return Response(
                {"error": "E-Receipt can only be generated for checked-out bookings"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare booking data for E-Receipt
        booking_serializer = BookingSerializer(booking)
        booking_data = booking_serializer.data
        
        if booking.is_venue_booking and booking.area:
            area_serializer = AreaSerializer(booking.area)
            booking_data['area_details'] = area_serializer.data
            booking_data['property_type'] = 'Area'
            booking_data['property_name'] = booking.area.area_name
            booking_data['property_capacity'] = booking.area.capacity
        elif booking.room:
            room_serializer = RoomSerializer(booking.room)
            booking_data['room_details'] = room_serializer.data
            booking_data['property_type'] = 'Room'
            booking_data['property_name'] = booking.room.room_name
            booking_data['property_capacity'] = booking.room.max_guests
        
        # Calculate stay duration
        if booking.check_in_date and booking.check_out_date:
            check_in = booking.check_in_date
            check_out = booking.check_out_date
            if booking.is_venue_booking:
                # For venues, calculate hours
                if booking.start_time and booking.end_time:
                    start_datetime = datetime.combine(check_in, booking.start_time)
                    end_datetime = datetime.combine(check_out, booking.end_time)
                    duration_hours = (end_datetime - start_datetime).total_seconds() / 3600
                    booking_data['duration'] = f"{int(duration_hours)} hours"
                else:
                    booking_data['duration'] = "1 hour"
            else:
                duration_days = (check_out - check_in).days
                booking_data['duration'] = f"{duration_days} night{'s' if duration_days != 1 else ''}"
        
        booking_data['receipt_data'] = {
            'receipt_number': f"REC-{booking.id}-{timezone.now().strftime('%Y%m%d')}",
            'generated_at': timezone.now().isoformat(),
            'generated_by': f"{request.user.first_name} {request.user.last_name}",
            'hotel_info': {
                'name': 'Azurea: Hotel Management',
                'address': 'Brgy. Dayap, Calauan, Laguna',
                'phone': '+63 912 345 6789',
                'email': 'azureahotelmanagement@gmail.com'
            }
        }
        
        total_amount = float(booking.total_price or 0)
        down_payment = float(booking.down_payment or 0)
        remaining_balance = total_amount - down_payment
        
        booking_data['payment_breakdown'] = {
            'total_amount': total_amount,
            'down_payment': down_payment,
            'remaining_balance': remaining_balance,
            'payment_method': booking.get_payment_method_display(),
            'payment_status': booking.payment_status
        }
        
        # Generate PDF as base64
        try:
            pdf_generator = EReceiptGenerator()
            pdf_base64 = pdf_generator.generate_pdf_base64(booking_data)
            
            return Response({
                "success": True,
                "message": "E-Receipt PDF generated successfully",
                "data": pdf_base64  # Returns data URL with embedded PDF
            }, status=status.HTTP_200_OK)
        except Exception as pdf_error:
            # Fallback: return booking data if PDF generation fails
            # Frontend can still display booking details
            logger.error(f"PDF generation failed for booking {booking_id}: {str(pdf_error)}")
            return Response({
                "success": True,
                "message": "E-Receipt data generated successfully (PDF generation failed)",
                "data": booking_data,  # Return raw data as fallback
                "warning": "PDF generation encountered an issue. Displaying booking data instead."
            }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"E-Receipt generation error for booking {booking_id}: {str(e)}")
        return Response({
            "success": False,
            "error": f"Failed to generate E-Receipt: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fetch_foods(request):
    try:
        items = CraveOnItem.objects.using('SystemInteg').filter(
            is_archived=False
        ).select_related('category')
        data = []
        for item in items:
            image_type = imghdr.what(None, h=item.image)
            mime_type = f"image/{image_type}"
            image_base64 = ""
            if item.image:
                image_base64 = base64.b64encode(item.image).decode('utf-8')
            data.append({
                "item_id": item.item_id,
                "name": item.item_name,
                "price": float(item.price),
                "image": image_base64,
                "image_mime": mime_type,
                "category_id": item.category.category_id if item.category else None,
                "category_name": item.category.category_name if item.category else "",
            })
        return Response({
            "message": "Food items fetched successfully.",
            "data": data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_food_order(request):
    try:
        booking_id = request.data.get('booking_id')
        cart_items_str = request.data.get('items', '[]')
        payment_ss = request.FILES.get('payment_ss')

        if not booking_id:
            return Response({"error": "Booking ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            cart_items = json.loads(cart_items_str) if isinstance(cart_items_str, str) else cart_items_str
        except json.JSONDecodeError:
            return Response({"error": "Invalid items format"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not cart_items:
            return Response({"error": "Cart items are required"}, status=status.HTTP_400_BAD_REQUEST)
        if not payment_ss:
            return Response({"error": "Payment screenshot is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Bookings.objects.get(id=booking_id)
        except Bookings.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        if booking.status.lower() != 'checked_in':
            return Response({
                "error": "Food orders can only be placed for checked-in bookings"
            }, status=status.HTTP_400_BAD_REQUEST)

        hotel_user = request.user

        validation_result = CraveOnIntegration.validate_cart_items(cart_items)
        if not validation_result['valid']:
            return Response({"error": validation_result['error']}, status=status.HTTP_400_BAD_REQUEST)
        
        total_amount = validation_result['total_amount']

        try:
            payment_ss_data = base64.b64encode(payment_ss.read()).decode('utf-8')
        except Exception as e:
            return Response({
                "error": f"Failed to process payment screenshot: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic(using='SystemInteg'):
            craveon_user_id = CraveOnIntegration.get_or_create_craveon_user(hotel_user, booking)
            order_id = CraveOnIntegration.create_craveon_order(
                craveon_user_id, 
                total_amount, 
                payment_ss_data, 
                booking.id,
                hotel_user,
                booking
            )
            CraveOnIntegration.add_order_items(order_id, cart_items)

        booking.has_food_order = True
        booking.save()

        return Response({
            "message": "Food order placed successfully!",
            "success": True,
            "user_id": craveon_user_id,
            "order_id": order_id,
            "total_amount": total_amount,
            "hotel_booking_info": {
                "hotel_booking_id": booking.id,
                "hotel_user_id": hotel_user.id,
                "guest_name": f"{hotel_user.first_name} {hotel_user.last_name}",
                "guest_email": hotel_user.email,
                "room_or_area": booking.room.room_name if booking.room else (booking.area.area_name if booking.area else "Unknown"),
                "check_in_date": str(booking.check_in_date),
                "check_out_date": str(booking.check_out_date),
            },
            "craveon_order_info": {
                "craveon_user_id": craveon_user_id,
                "craveon_order_id": order_id,
                "items_count": len(cart_items),
                "status": "Pending"
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def fetch_food_orders(request):
    try:        
        booking_id = request.query_params.get('booking_id')
        if booking_id:
            user_bookings = Bookings.objects.filter(
                id=booking_id,
                user=request.user,
                has_food_order=True
            )
        else:
            user_bookings = Bookings.objects.filter(
                user=request.user,
                has_food_order=True
            )

        all_orders = []
        for booking in user_bookings:
            with connections['SystemInteg'].cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM orders WHERE booking_id = %s ORDER BY ordered_at DESC",
                    [booking.id]
                )
                order_rows = cursor.fetchall()
                columns = [col[0] for col in cursor.description]
                for order_row in order_rows:
                    order = dict(zip(columns, order_row))

                    cursor.execute(
                        """
                        SELECT oi.order_item_id, oi.order_id, oi.item_id, oi.quantity, 
                                i.item_name AS name, i.price, i.image, c.category_id, c.category_name
                                FROM order_items oi
                                JOIN items i ON oi.item_id = i.item_id
                                LEFT JOIN categories c ON i.category_id = c.category_id
                                WHERE oi.order_id = %s
                        """,
                        [order['order_id']]
                    )
                    item_rows = cursor.fetchall()
                    
                    items = []
                    for item_row in item_rows:
                        image_base64 = ""
                        image_mime = "image/jpeg"
                        if item_row[6]:
                            image_type = imghdr.what(None, h=item_row[6])
                            if image_type:
                                image_mime = f"image/{image_type}"
                            image_base64 = base64.b64encode(item_row[6]).decode('utf-8')
                        
                        items.append({
                            "order_item_id": item_row[0],
                            "order_id": item_row[1], 
                            "item_id": item_row[2],
                            "quantity": item_row[3],
                            "name": item_row[4],
                            "price": float(item_row[5]),
                            "image": image_base64,
                            "image_mime": image_mime,
                            "category_id": item_row[7] if item_row[7] else None,
                            "category_name": item_row[8] if item_row[8] else ""
                        })                    
                    order['items'] = items
                    order['booking_info'] = {
                        'id': booking.id,
                        'room_name': booking.room.room_name if booking.room else None,
                        'area_name': booking.area.area_name if booking.area else None,
                        'check_in_date': booking.check_in_date,
                        'check_out_date': booking.check_out_date,
                        'is_venue_booking': booking.is_venue_booking
                    }
                    order['id'] = order['order_id']
                    order['total_amount'] = float(order['total_amount'])
                    order['created_at'] = order['ordered_at']
                    order['updated_at'] = order.get('updated_at', order['ordered_at'])
                    all_orders.append(order)
        return Response({
            "data": all_orders,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            "error": f"Failed to fetch food orders: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_food_order(request):
    try:
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'error': 'Order ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order_id = int(order_id)
        except (ValueError, TypeError):
            return Response({
                'error': 'Order ID must be a valid number'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cursor = connections['SystemInteg'].cursor()
        cursor.execute("""
            SELECT guest_email, status, guest_name, total_amount, hotel_room_area 
            FROM orders 
            WHERE order_id = %s
        """, [order_id])
        
        order_result = cursor.fetchone()
        if not order_result:
            return Response({
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        guest_email, order_status, guest_name, total_amount, hotel_room_area = order_result
        
        if guest_email != request.user.email:
            return Response({
                'error': 'You can only review your own orders'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if order_status.lower() != 'completed':
            return Response({
                'error': 'Only completed orders can be reviewed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        cursor.execute("""
            SELECT id FROM reviews WHERE order_id = %s
        """, [order_id])
        
        existing_review = cursor.fetchone()
        if existing_review:
            return Response({
                'error': 'This order has already been reviewed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return Response({
                'error': 'Rating must be an integer between 1 and 5'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if comment is None:
            comment = ''
        elif not isinstance(comment, str):
            comment = str(comment)
        
        try:
            # Insert the review
            cursor.execute("""
                INSERT INTO reviews (order_id, rating, comment, created_at)
                VALUES (%s, %s, %s, NOW())
            """, [order_id, rating, comment])
            
            # Update order status
            cursor.execute("""
                UPDATE orders 
                SET status = 'Reviewed', Reviewed = TRUE 
                WHERE order_id = %s
            """, [order_id])
            
            cursor.connection.commit()
            
            review_id = cursor.lastrowid
            
            return Response({
                'success': True,
                'message': 'Food order review submitted successfully',
                'review': {
                    'id': review_id,
                    'order_id': order_id,
                    'rating': rating,
                    'comment': comment,
                    'order_details': {
                        'guest_name': guest_name,
                        'total_amount': float(total_amount),
                        'hotel_room_area': hotel_room_area,
                        'status': 'reviewed'
                    }
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as db_error:
            cursor.connection.rollback()
            raise db_error
        finally:
            cursor.close()
    except Exception as e:
        return Response({
            'error': f"Failed to review food order: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_food_order_reviews(request):
    try:
        cursor = connections['SystemInteg'].cursor()
        cursor.execute("""
            SELECT r.id, r.order_id, r.rating, r.comment, r.created_at,
                    o.total_amount, o.guest_name, o.hotel_room_area, o.ordered_at
            FROM reviews r
            JOIN orders o ON r.order_id = o.order_id
            WHERE o.guest_email = %s
            ORDER BY r.created_at DESC
        """, [request.user.email])
        
        reviews = []
        for row in cursor.fetchall():
            reviews.append({
                'id': row[0],
                'order_id': row[1],
                'rating': row[2],
                'comment': row[3],
                'created_at': row[4],
                'order_details': {
                    'total_amount': float(row[5]),
                    'guest_name': row[6],
                    'hotel_room_area': row[7],
                    'ordered_at': row[8]
                }
            })
        
        return Response({
            'success': True,
            'reviews': reviews,
            'count': len(reviews)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_user_food_order_reviews: {str(e)}")
        return Response({
            'error': f"Failed to fetch food order reviews: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reviewable_food_orders(request):
    """
    Get all completed food orders that haven't been reviewed yet for the authenticated user.
    """
    try:
        from django.db import connections
        
        cursor = connections['SystemInteg'].cursor()
        cursor.execute("""
            SELECT o.order_id, o.total_amount, o.guest_name, o.hotel_room_area, 
                   o.ordered_at, o.status
            FROM orders o
            LEFT JOIN reviews r ON o.order_id = r.order_id
            WHERE o.guest_email = %s 
            AND o.status = 'Completed' 
            AND r.id IS NULL
            ORDER BY o.ordered_at DESC
        """, [request.user.email])
        
        orders = []
        for row in cursor.fetchall():
            orders.append({
                'order_id': row[0],
                'total_amount': float(row[1]),
                'guest_name': row[2],
                'hotel_room_area': row[3],
                'ordered_at': row[4],
                'status': row[5]
            })
        
        return Response({
            'success': True,
            'reviewable_orders': orders,
            'count': len(orders)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in get_reviewable_food_orders: {str(e)}")
        return Response({
            'error': f"Failed to fetch reviewable food orders: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def create_paymongo_source(request, booking_id):
    try:
        try:
            booking = Bookings.objects.get(id=booking_id)
        except Bookings.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        # Only allow for bookings that are unpaid
        if booking.payment_status and booking.payment_status.lower() == 'paid':
            return Response({"error": "Booking already paid"}, status=status.HTTP_400_BAD_REQUEST)

        # amount in PHP to centavos (only if provided by client)
        amount_from_request = request.data.get('amount', None)
        if amount_from_request is not None and str(amount_from_request).strip() != '':
            try:
                amount_php = float(amount_from_request)
                amount_centavos = int(round(amount_php * 100))
            except Exception:
                logger.warning('Invalid amount provided to create_paymongo_source: %s', amount_from_request)
                return Response({'error': 'Invalid amount value'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            amount_centavos = None

        # Build redirect urls (frontend should supply; if not, construct absolute fallbacks)
        success_url = request.data.get('success_url')
        failed_url = request.data.get('failed_url')

        # If frontend didn't supply, construct minimal absolute URLs using request.build_absolute_uri
        # Ensure both are non-empty strings if we plan to pass them to PayMongo
        if not success_url:
            try:
                success_url = request.build_absolute_uri(f'/booking/paymongo/redirect/success?booking_id={booking.id}')
            except Exception:
                success_url = ''

        if not failed_url:
            try:
                failed_url = request.build_absolute_uri(f'/booking/paymongo/redirect/failed?booking_id={booking.id}')
            except Exception:
                failed_url = ''

        metadata = {
            'booking_id': str(booking.id),
            'user_id': str(booking.user.id)
        }

        # Create source using paymongo service
        logger.info('create_paymongo_source called for booking_id=%s amount_centavos=%s metadata=%s', booking_id, amount_centavos, metadata)
        try:
            # Only pass redirect URLs when both success and failed are non-empty
            redirect_kwargs = {}
            if success_url and failed_url:
                redirect_kwargs = {
                    'redirect_success': success_url,
                    'redirect_failed': failed_url
                }

            source_resp = paymongo_service.create_source(
                amount=amount_centavos,
                currency='PHP',
                source_type='gcash',
                metadata=metadata,
                **redirect_kwargs
            )
            logger.info('PayMongo create_source response: %s', json.dumps(source_resp))
        except Exception as e:
            # If the exception contains response text, include it in the response for debugging
            logger.exception('PayMongo create_source exception: %s', str(e))
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        
        # Save source_id to booking
        source_data = source_resp.get('data', {}) if isinstance(source_resp, dict) else {}
        source_id = source_data.get('id')
        if source_id:
            booking.paymongo_source_id = source_id
            booking.save()

        return Response({
            'success': True,
            'data': source_resp
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.exception('create_paymongo_source failed')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def verify_paymongo_source(request, source_id):
    try:
        source_data = paymongo_service.retrieve_source(source_id)
        logger.info(f'Retrieved PayMongo source {source_id}: {source_data}')
        
        source = source_data.get('data', {})
        source_attrs = source.get('attributes', {})
        source_status = source_attrs.get('status')
        metadata = source_attrs.get('metadata', {})
        
        is_prebooking = metadata.get('prebooking') == 'true'
        booking_id = metadata.get('booking_id')
        
        if is_prebooking and not booking_id and source_status in ['chargeable', 'paid']:
            logger.info(f'Source {source_id} is {source_status}, creating booking from metadata')
            
            try:
                booking_data_json = metadata.get('booking_data')
                if not booking_data_json:
                    return Response(
                        {'error': 'No booking_data in source metadata'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                booking_data = json.loads(booking_data_json)
                user_id = booking_data.get('user_id')
                
                if not user_id:
                    return Response(
                        {'error': 'No user_id in booking_data'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if booking already exists for this source
                existing_booking = Bookings.objects.filter(paymongo_source_id=source_id).first()
                if existing_booking:
                    logger.info(f'Booking already exists for source {source_id}: {existing_booking.id}')
                    return Response({
                        'status': source_status,
                        'booking_id': existing_booking.id,
                        'booking_created': False,
                        'message': 'Booking already exists'
                    })
                
                try:
                    user = CustomUsers.objects.get(id=int(user_id))
                except CustomUsers.DoesNotExist:
                    return Response(
                        {'error': f'User {user_id} not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                paid_amount_centavos = source_attrs.get('amount')
                paid_php = float(paid_amount_centavos) / 100.0 if paid_amount_centavos else 0
                
                booking = Bookings()
                booking.user = user
                booking.first_name = booking_data.get('first_name', '')
                booking.last_name = booking_data.get('last_name', '')
                booking.phone_number = booking_data.get('phone_number', '')
                booking.special_requests = booking_data.get('special_requests', '')
                booking.number_of_guests = booking_data.get('number_of_guests', 1)
                booking.total_price = booking_data.get('total_price', 0)
                booking.down_payment = paid_php
                booking.payment_method = 'paymongo'
                booking.payment_status = 'paid' if source_status == 'paid' else 'pending'
                booking.payment_date = timezone.now() if source_status == 'paid' else None
                booking.status = 'confirmed' if source_status == 'paid' else 'pending'
                booking.paymongo_source_id = source_id
                
                if 'room_id' in booking_data:
                    room = Rooms.objects.get(id=int(booking_data['room_id']))
                    booking.room = room
                    
                    check_in_str = booking_data.get('check_in')
                    check_out_str = booking_data.get('check_out')
                    arrival_time_str = booking_data.get('arrival_time', '')
                    
                    if check_in_str:
                        try:
                            # Handle ISO format date strings
                            check_in_dt = datetime.fromisoformat(check_in_str.replace('Z', '+00:00'))
                            booking.check_in_date = check_in_dt.date()
                        except ValueError:
                            # Handle YYYY-MM-DD format
                            booking.check_in_date = datetime.strptime(check_in_str, '%Y-%m-%d').date()
                    
                    if check_out_str:
                        try:
                            # Handle ISO format date strings
                            check_out_dt = datetime.fromisoformat(check_out_str.replace('Z', '+00:00'))
                            booking.check_out_date = check_out_dt.date()
                        except ValueError:
                            # Handle YYYY-MM-DD format
                            booking.check_out_date = datetime.strptime(check_out_str, '%Y-%m-%d').date()
                    
                    if arrival_time_str:
                        try:
                            # Try parsing as ISO datetime first
                            arrival_dt = datetime.fromisoformat(arrival_time_str.replace('Z', '+00:00'))
                            booking.time_of_arrival = arrival_dt.time()
                        except ValueError:
                            # If that fails, try parsing as HH:MM format
                            try:
                                booking.time_of_arrival = datetime.strptime(arrival_time_str, '%H:%M').time()
                            except ValueError:
                                logger.warning(f'Could not parse arrival_time: {arrival_time_str}')
                    
                    booking.is_venue_booking = False
                    
                elif 'area_id' in booking_data:
                    area = Areas.objects.get(id=int(booking_data['area_id']))
                    booking.area = area
                    
                    start_time_str = booking_data.get('start_time')
                    end_time_str = booking_data.get('end_time')
                    
                    if start_time_str and end_time_str:
                        start_dt = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                        end_dt = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
                        
                        booking.check_in_date = start_dt.date()
                        booking.check_out_date = end_dt.date()
                        
                        booking.start_time = start_dt.time()
                        booking.end_time = end_dt.time()
                    
                    booking.is_venue_booking = True
                    
                else:
                    return Response(
                        {'error': 'Neither room_id nor area_id in booking_data'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                booking.save()
                logger.info(f'Created booking {booking.id} from PayMongo source {source_id}')

                Transactions.objects.create(
                    booking=booking,
                    user=booking.user,
                    transaction_type='booking',
                    amount=paid_php,
                    transaction_date=timezone.now(),
                    status='completed'
                )
                
                return Response({
                    'status': source_status,
                    'booking_id': booking.id,
                    'booking_created': True,
                    'down_payment': paid_php,
                    'message': 'Booking created successfully'
                })
                
            except Exception as e:
                logger.exception(f'Error creating booking from source {source_id}: {str(e)}')
                return Response(
                    {'error': f'Failed to create booking: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # If booking exists, return its status
        if booking_id:
            try:
                booking = Bookings.objects.get(id=int(booking_id))
                return Response({
                    'status': source_status,
                    'booking_id': booking.id,
                    'payment_status': booking.payment_status,
                    'booking_created': False
                })
            except Bookings.DoesNotExist:
                pass
        
        # Return source status
        return Response({
            'status': source_status,
            'source_id': source_id,
            'is_prebooking': is_prebooking,
            'message': 'Source retrieved successfully'
        })
        
    except Exception as e:
        logger.exception(f'Error verifying PayMongo source {source_id}: {str(e)}')
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def create_paymongo_source_prebooking(request):
    try:
        amount_from_request = request.data.get('amount')
        if not amount_from_request:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_php = float(amount_from_request)
            amount_centavos = int(round(amount_php * 100))
        except Exception:
            return Response({'error': 'Invalid amount value'}, status=status.HTTP_400_BAD_REQUEST)
        
        booking_data = request.data.get('booking_data', {})
        if not booking_data:
            return Response({'error': 'Booking data is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        booking_data['user_id'] = str(request.user.id)
        
        success_url = request.data.get('success_url', '')
        failed_url = request.data.get('failed_url', '')
        
        if not success_url or not failed_url:
            return Response({'error': 'Both success_url and failed_url are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        metadata = {
            'prebooking': 'true',  # Flag to indicate this is a pre-booking payment
            'booking_data': json.dumps(booking_data),  # Serialize booking data
            'user_id': str(request.user.id)
        }
        
        logger.info('create_paymongo_source_prebooking: amount_centavos=%s metadata=%s', amount_centavos, metadata)
        
        try:
            source_resp = paymongo_service.create_source(
                amount=amount_centavos,
                currency='PHP',
                source_type='gcash',
                metadata=metadata,
                redirect_success=success_url,
                redirect_failed=failed_url
            )
            logger.info('PayMongo create_source (prebooking) response: %s', json.dumps(source_resp))
        except Exception as e:
            logger.exception('PayMongo create_source (prebooking) exception: %s', str(e))
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        
        return Response({
            'success': True,
            'data': source_resp
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.exception('create_paymongo_source_prebooking failed')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
def paymongo_webhook(request):
    if request.method != 'POST':
        return HttpResponse(status=405)
    
    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        logger.error('PayMongo webhook: Invalid JSON payload')
        return HttpResponse(status=400)

    try:
        event_data = payload.get('data', {})
        event_attrs = event_data.get('attributes', {})
        event_type = event_attrs.get('type')
        
        resource = event_attrs.get('data', {})
        resource_id = resource.get('id')
        resource_attrs = resource.get('attributes', {})
        
        logger.info(f'PayMongo webhook received: event_type={event_type}, resource_id={resource_id}')
        
        metadata = resource_attrs.get('metadata', {})
        is_prebooking = metadata.get('prebooking') == 'true'
        booking_id = metadata.get('booking_id')
        
        if is_prebooking and not booking_id:
            logger.info('PayMongo webhook: Processing pre-booking payment, creating booking from metadata')
            
            try:
                booking_data_json = metadata.get('booking_data')
                if not booking_data_json:
                    logger.error('PayMongo webhook: No booking_data in metadata for pre-booking')
                    return HttpResponse(status=400)
                
                booking_data = json.loads(booking_data_json)
                user_id = booking_data.get('user_id')
                
                if not user_id:
                    logger.error('PayMongo webhook: No user_id in booking_data')
                    return HttpResponse(status=400)

                try:
                    user = CustomUsers.objects.get(id=int(user_id))
                except CustomUsers.DoesNotExist:
                    logger.error(f'PayMongo webhook: User {user_id} not found')
                    return HttpResponse(status=404)
                
                paid_amount_centavos = resource_attrs.get('amount')
                paid_php = float(paid_amount_centavos) / 100.0 if paid_amount_centavos else 0
                
                booking = Bookings()
                booking.user = user
                booking.first_name = booking_data.get('first_name', '')
                booking.last_name = booking_data.get('last_name', '')
                booking.phone_number = booking_data.get('phone_number', '')
                booking.special_requests = booking_data.get('special_requests', '')
                booking.number_of_guests = booking_data.get('number_of_guests', 1)
                booking.total_price = booking_data.get('total_price', 0)
                booking.down_payment = paid_php
                booking.payment_method = 'paymongo'
                booking.payment_status = 'pending'
                booking.status = 'pending'
                booking.paymongo_source_id = resource_id
                
                if 'room_id' in booking_data:
                    room = Rooms.objects.get(id=int(booking_data['room_id']))
                    booking.room = room
                    
                    check_in_str = booking_data.get('check_in')
                    check_out_str = booking_data.get('check_out')
                    arrival_time_str = booking_data.get('arrival_time', '')
                    
                    if check_in_str:
                        try:
                            # Handle ISO format or YYYY-MM-DD format
                            check_in_dt = datetime.fromisoformat(check_in_str.replace('Z', '+00:00'))
                            booking.check_in_date = check_in_dt.date()
                        except ValueError:
                            booking.check_in_date = datetime.strptime(check_in_str, '%Y-%m-%d').date()
                    
                    if check_out_str:
                        try:
                            check_out_dt = datetime.fromisoformat(check_out_str.replace('Z', '+00:00'))
                            booking.check_out_date = check_out_dt.date()
                        except ValueError:
                            booking.check_out_date = datetime.strptime(check_out_str, '%Y-%m-%d').date()
                    
                    if arrival_time_str:
                        try:
                            # Try parsing as ISO datetime first
                            arrival_dt = datetime.fromisoformat(arrival_time_str.replace('Z', '+00:00'))
                            booking.time_of_arrival = arrival_dt.time()
                        except ValueError:
                            # Try HH:MM format
                            try:
                                booking.time_of_arrival = datetime.strptime(arrival_time_str, '%H:%M').time()
                            except ValueError:
                                logger.warning(f'Could not parse arrival_time: {arrival_time_str}')
                    
                    booking.is_venue_booking = False
                elif 'area_id' in booking_data:
                    area = Areas.objects.get(id=int(booking_data['area_id']))
                    booking.area = area
                    booking.start_time = booking_data.get('start_time')
                    booking.end_time = booking_data.get('end_time')
                    booking.is_venue_booking = True
                else:
                    logger.error('PayMongo webhook: Neither room_id nor area_id in booking_data')
                    return HttpResponse(status=400)
                
                booking.save()
                booking_id = str(booking.id)
                logger.info(f'PayMongo webhook: Created booking {booking_id} from pre-booking payment')
                
            except Exception as e:
                logger.exception(f'PayMongo webhook: Failed to create booking from pre-booking metadata: {str(e)}')
                return HttpResponse(status=500)
        
        # Now proceed with existing booking if booking_id exists
        if not booking_id:
            logger.warning('PayMongo webhook: No booking_id and not a pre-booking')
            return HttpResponse(status=200)  # Acknowledge but don't process
        
        try:
            booking = Bookings.objects.get(id=int(booking_id))
        except Bookings.DoesNotExist:
            logger.error(f'PayMongo webhook: Booking {booking_id} not found')
            return HttpResponse(status=404)
        
        # Handle different event types
        if event_type == 'source.chargeable':
            # Source is ready to be charged (for GCash, this means user completed payment)
            source_id = resource_id
            source_status = resource_attrs.get('status')

            if source_status == 'chargeable':
                booking.paymongo_source_id = source_id
                booking.payment_status = 'paid'
                booking.payment_date = timezone.now()

                # Try to capture the actual amount from resource attributes (amount in centavos)
                try:
                    paid_amount_centavos = resource_attrs.get('amount')
                    if paid_amount_centavos is not None:
                        # Convert to PHP decimal
                        paid_php = float(paid_amount_centavos) / 100.0
                        booking.down_payment = paid_php
                except Exception:
                    logger.exception('Failed to extract paid amount from source resource')

                booking.save()

                # Create transaction record with the actual paid amount when available
                from .models import Transactions
                trans_amount = booking.down_payment or booking.total_price or 0
                Transactions.objects.create(
                    booking=booking,
                    user=booking.user,
                    transaction_type='booking',
                    amount=trans_amount,
                    transaction_date=timezone.now(),
                    status='completed'
                )

                logger.info(f'Booking {booking_id} marked as paid via source {source_id} amount={trans_amount}')

        elif event_type == 'payment.paid':
            # Payment was successfully processed
            payment_id = resource_id
            payment_status = resource_attrs.get('status')

            if payment_status == 'paid':
                booking.paymongo_payment_id = payment_id
                booking.payment_status = 'paid'
                booking.payment_date = timezone.now()

                # Try to get actual paid amount from payment resource attributes
                try:
                    paid_amount_centavos = resource_attrs.get('amount')
                    if paid_amount_centavos is not None:
                        paid_php = float(paid_amount_centavos) / 100.0
                        booking.down_payment = paid_php
                except Exception:
                    logger.exception('Failed to extract paid amount from payment resource')

                booking.save()

                # Create transaction record if not exists, using actual paid amount if available
                from .models import Transactions
                if not Transactions.objects.filter(booking=booking, transaction_type='booking', status='completed').exists():
                    trans_amount = booking.down_payment or booking.total_price or 0
                    Transactions.objects.create(
                        booking=booking,
                        user=booking.user,
                        transaction_type='booking',
                        amount=trans_amount,
                        transaction_date=timezone.now(),
                        status='completed'
                    )

                logger.info(f'Booking {booking_id} payment confirmed with payment_id {payment_id} amount={booking.down_payment}')

        elif event_type == 'payment.failed':
            # Payment failed
            payment_id = resource_id
            booking.paymongo_payment_id = payment_id
            booking.payment_status = 'failed'
            booking.save()

            logger.warning(f'Booking {booking_id} payment failed with payment_id {payment_id}')

        else:
            # Log unknown event type but acknowledge
            logger.info(f'PayMongo webhook: Unhandled event type {event_type}')

        return HttpResponse(status=200)
    
    except Exception as e:
        logger.exception(f'Error handling PayMongo webhook: {str(e)}')
        return HttpResponse(status=500)

@api_view(['GET'])
def enter_amount(request):
    return_to = request.GET.get('return_to', '')
    total = request.GET.get('total', '')
    area_id = request.GET.get('area_id', '')

    html = f"""
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Enter Down Payment</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
    </head>
    <body>
      <h1>Enter Down Payment</h1>
      <p>Total: {total}</p>
      <form method="post" action="/booking/paymongo/create_from_entry">
        <label>Amount (PHP): <input name="amount" type="number" step="0.01" value="{total}" /></label>
        <input type="hidden" name="return_to" value="{return_to}" />
        <input type="hidden" name="area_id" value="{area_id}" />
        <button type="submit">Proceed to Pay</button>
      </form>
    </body>
    </html>
    """

    # Log the incoming request path and query for debugging why clients may hit 404
    try:
        logger.info('enter_amount called: path=%s query=%s method=%s', request.path, request.META.get('QUERY_STRING', ''), request.method)
    except Exception:
        # best-effort logging
        logger.info('enter_amount called')

    return HttpResponse(html, content_type='text/html')

@csrf_exempt
@api_view(['POST'])
def create_from_entry(request):
    amount_raw = request.POST.get('amount') or request.data.get('amount')
    return_to = request.POST.get('return_to') or request.data.get('return_to')
    area_id = request.POST.get('area_id') or request.data.get('area_id')

    if not amount_raw:
        return Response({'error': 'amount is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount_float = float(amount_raw)
        amount_centavos = int(round(amount_float * 100))
    except Exception:
        return Response({'error': 'invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

    temp_ref = str(uuid.uuid4())

    params = {
        'status': 'entered',
        'amount': str(amount_centavos),
        'temp_ref': temp_ref,
    }

    if area_id:
        params['area_id'] = str(area_id)

    if return_to:
        sep = '&' if '?' in return_to else '?'
        try:
            return HttpResponseRedirect(f"{return_to}{sep}{urlencode(params)}")
        except Exception:
            link = f"{return_to}{sep}{urlencode(params)}"
            html = f"<html><body><p>Open app with amount: <a href=\"{link}\">{link}</a></p></body></html>"
            return HttpResponse(html, content_type='text/html')

    return Response({'status': 'entered', 'amount': amount_centavos, 'temp_ref': temp_ref}, status=status.HTTP_200_OK)


@api_view(['GET'])
def paymongo_redirect_success(request):
    temp_ref = request.GET.get('temp_ref')
    return_to = request.GET.get('return_to')
    amount = request.GET.get('amount')

    params = {'status': 'paid'}
    if amount:
        params['amount'] = amount
    if temp_ref:
        params['temp_ref'] = temp_ref

    if return_to:
        sep = '&' if '?' in return_to else '?'
        try:
            return HttpResponseRedirect(f"{return_to}{sep}{urlencode(params)}")
        except Exception:
            # Fallback: render simple page with link to open app
            link = f"{return_to}{sep}{urlencode(params)}"
            return HttpResponse(f'<html><body><p>Open app: <a href="{link}">{link}</a></p></body></html>')

    return Response({'status': 'ok', 'params': params})


@api_view(['GET'])
def paymongo_redirect_failed(request):
    temp_ref = request.GET.get('temp_ref')
    return_to = request.GET.get('return_to')
    amount = request.GET.get('amount')

    params = {'status': 'failed'}
    if amount:
        params['amount'] = amount
    if temp_ref:
        params['temp_ref'] = temp_ref

    if return_to:
        sep = '&' if '?' in return_to else '?'
        try:
            return HttpResponseRedirect(f"{return_to}{sep}{urlencode(params)}")
        except Exception:
            link = f"{return_to}{sep}{urlencode(params)}"
            return HttpResponse(f'<html><body><p>Open app: <a href="{link}">{link}</a></p></body></html>')

    return Response({'status': 'failed', 'params': params})

# Redirect fallback (template) for PayMongo payment
def payment_success(request):
    # Extract source_id from the referrer URL or request parameters
    source_id = request.GET.get('source_id', '')
    
    # If not in query params, try to extract from referrer
    if not source_id:
        referrer = request.META.get('HTTP_REFERER', '')
        if 'sources?id=' in referrer:
            try:
                source_id = referrer.split('sources?id=')[1].split('&')[0]
            except Exception:
                logger.warning('Could not extract source_id from referrer')
    
    logger.info(f'payment_success called - source_id={source_id}, redirecting to app via deep link')
    
    # Build deep link with source_id parameter
    deep_link = 'azurea-hotel://payment/success'
    if source_id:
        deep_link += f'?source_id={source_id}'
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Payment Successful - Redirecting...</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #6F00FF 0%, #3B0270 100%);
            }}
            .container {{
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 400px;
            }}
            .success-icon {{
                width: 80px;
                height: 80px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            }}
            .checkmark {{
                color: white;
                font-size: 48px;
                font-weight: bold;
            }}
            h1 {{
                color: #3B0270;
                margin: 0 0 10px 0;
                font-size: 24px;
            }}
            p {{
                color: #6F00FF;
                margin: 0;
                font-size: 14px;
            }}
        </style>
        <script>
            // Automatically redirect to app after a short delay
            setTimeout(function() {{
                window.location.href = '{deep_link}';
            }}, 2000);
        </script>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">
                <span class="checkmark">✓</span>
            </div>
            <h1>Payment Successful!</h1>
            <p>Redirecting you back to the app...</p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html, content_type='text/html')
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Payment Successful</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #6F00FF 0%, #3B0270 100%);
            }}
            .container {{
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 400px;
            }}
            .success-icon {{
                width: 80px;
                height: 80px;
                background: #10B981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 40px;
                color: white;
            }}
            h1 {{
                color: #3B0270;
                margin-bottom: 10px;
            }}
            p {{
                color: #666;
                margin-bottom: 30px;
            }}
            .btn {{
                background: #6F00FF;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }}
        </style>
        <script>
            // Attempt automatic redirect after 2 seconds
            setTimeout(function() {{
                window.location.href = "{deep_link}";
            }}, 2000);
        </script>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Your payment has been processed successfully. Your booking is now confirmed.</p>
            <p style="font-size: 14px; color: #999;">Redirecting back to the app...</p>
            <a href="{deep_link}" class="btn">Return to App</a>
        </div>
    </body>
    </html>
    """
    
    return HttpResponse(html, content_type='text/html')

def payment_failed(request):
    """Handles PayMongo payment failure and redirects back to the app via deep link"""
    logger.info('payment_failed called - redirecting to app via deep link')
    
    # Simple redirect page that sends user back to app
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Payment Failed</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
            }
            .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 400px;
            }
            .error-icon {
                width: 80px;
                height: 80px;
                background: #EF4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            }
            .cross {
                color: white;
                font-size: 48px;
                font-weight: bold;
            }
            h1 {
                color: #DC2626;
                margin: 0 0 10px 0;
                font-size: 24px;
            }
            p {
                color: #666;
                margin: 0;
                font-size: 14px;
            }
        </style>
        <script>
            // Automatically redirect to app after a short delay
            setTimeout(function() {
                window.location.href = 'azurea-hotel://payment/failed';
            }, 3000);
        </script>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">
                <span class="cross">✕</span>
            </div>
            <h1>Payment Failed</h1>
            <p>Redirecting you back to the app...</p>
        </div>
    </body>
    </html>
    """
    
    return HttpResponse(html, content_type='text/html')