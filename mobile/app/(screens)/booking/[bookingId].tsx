import { useLocalSearchParams, useRouter } from "expo-router";
import { 
    ActivityIndicator, 
    ScrollView, 
    Text, 
    TouchableOpacity, 
    View,
    Alert,
    Image,
    RefreshControl
} from "react-native";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { booking } from "@/services/Booking";
import { UserBooking } from "@/types/Bookings.types";
import { pesoFormatter, formatDate } from "@/utils/formatters";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import CancellationModal from "@/components/ui/CancellationModal";
import { guestCancellationReasons } from "@/constants/dropdown-options";

export default function BookingDetailsScreen() {
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState<boolean>(false);
    
    const { bookingId } = useLocalSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['bookingDetails', bookingId],
        queryFn: () => booking.getBookingDetail(bookingId as string),
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
    });

    const cancelMutation = useMutation({
        mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) => {
            return booking.cancelBooking(bookingId, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookingDetails', bookingId] });
            queryClient.invalidateQueries({ queryKey: ['userBookings'] });
            
            Alert.alert(
                "Cancellation Submitted",
                "Your cancellation request has been submitted successfully.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        },
        onError: (error) => {
            Alert.alert(
                "Cancellation Failed",
                error.message || "Failed to cancel booking. Please try again.",
                [{ text: "OK" }]
            );
        }
    })

    const bookingData: UserBooking = data?.data;

    const handleGenerateEReceipt = async () => {
        Alert.alert("E-Receipt", "E-Receipt generation feature will be implemented soon");
    };

    const handleCancelBooking = () => {
        if (bookingData?.status === 'pending') {
            setIsCancellationModalOpen(true);
        } else {
            Alert.alert(
                "Cancel Booking",
                "Are you sure you want to cancel this booking?",
                [
                    { text: "No", style: "cancel" },
                    { 
                        text: "Yes", 
                        style: "destructive", 
                        onPress: async () => {
                            try {
                                await cancelMutation.mutateAsync({
                                    bookingId: bookingData.id.toString(),
                                    reason: "Guest requested cancellation"
                                });
                            } catch (error) {
                                console.error(`Cancellation error: ${error}`);
                            }
                        }
                    }
                ]
            );
        }
    };

    const handleConfirmCancellation = async (reason: string) => {
        if (!reason.trim()) {
            Alert.alert("Cancellation Reason Required", "Please provide a reason for cancellation.");
            return;
        }

        try {
            await cancelMutation.mutateAsync({
                bookingId: bookingData.id.toString(),
                reason: reason.trim()
            });
        } catch (error) {
            console.error(`Cancellation error: ${error}`);
        }
    };

    const calculateNights = () => {
        if (!bookingData?.check_in_date || !bookingData?.check_out_date) return 0;
        const checkIn = new Date(bookingData.check_in_date);
        const checkOut = new Date(bookingData.check_out_date);
        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getStatusIcon = (status: string) => {
        const iconProps = { size: 20, color: "white" };
        switch (status) {
            case 'confirmed': return <Ionicons name="checkmark-circle" {...iconProps} />;
            case 'pending': return <Ionicons name="time" {...iconProps} />;
            case 'cancelled': return <Ionicons name="close-circle" {...iconProps} />;
            case 'checked_in': return <Ionicons name="log-in" {...iconProps} />;
            case 'checked_out': return <Ionicons name="log-out" {...iconProps} />;
            default: return <Ionicons name="alert-circle" {...iconProps} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500';
            case 'pending': return 'bg-yellow-500';
            case 'cancelled': return 'bg-red-500';
            case 'checked_in': return 'bg-blue-500';
            case 'checked_out': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text className="text-violet-600 font-montserrat mt-4">
                    Loading booking details...
                </Text>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center px-6">
                <Ionicons name="alert-circle" size={60} color="#ef4444" />
                <Text className="text-red-500 font-montserrat-bold text-lg text-center mt-4">
                    Error loading booking details
                </Text>
                <Text className="text-neutral-600 font-montserrat mt-2 text-center">
                    {error?.message || 'Please try again later'}
                </Text>
                <TouchableOpacity 
                    className="bg-violet-600 px-6 py-3 rounded-2xl mt-6"
                    onPress={() => refetch()}
                >
                    <Text className="text-white font-montserrat-bold">Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!bookingData) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <Ionicons name="document-text" size={60} color="#6b7280" />
                <Text className="text-neutral-500 font-montserrat mt-4">
                    Booking not found
                </Text>
            </SafeAreaView>
        );
    }

    const isVenueBooking = bookingData.is_venue_booking;
    const propertyName = isVenueBooking 
        ? bookingData.area_details?.area_name
        : bookingData.room_details?.room_name;
    const propertyImage = isVenueBooking
        ? bookingData.area_details?.images?.[0]?.area_image
        : bookingData.room_details?.images?.[0]?.room_image;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-200">
                <View className="flex-row items-center justify-between px-4 py-3">
                    <TouchableOpacity 
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        onPress={() => router.back()}
                    >
                        <FontAwesome name="arrow-left" size={24} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1 ml-4">
                        <Text className="text-3xl font-playfair-bold text-gray-900">
                            Booking Details
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={() => refetch()} />
                }
            >
                <View className="p-4 space-y-6">
                    {/* Booking Status Banner */}
                    <View className={`${getStatusColor(bookingData.status)} rounded-2xl p-4`}>
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center space-x-3">
                                {getStatusIcon(bookingData.status)}
                                <View>
                                    <Text className="text-white font-montserrat-bold text-lg capitalize">
                                        {bookingData.status.replace('_', ' ')}
                                    </Text>
                                    <Text className="text-white/90 font-montserrat text-sm">
                                        Booking Reference: #{bookingData.id}
                                    </Text>
                                </View>
                            </View>
                            {bookingData.status === 'pending' && (
                                <View className="bg-white/20 px-3 py-1 rounded-full">
                                    <Text className="text-white font-montserrat-bold text-xs">
                                        Awaiting Confirmation
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Property Image & Info */}
                    <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {propertyImage && (
                            <View className="h-48 relative">
                                <Image 
                                    source={{ uri: propertyImage }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                                <View className="absolute inset-0 bg-black/20" />
                                <View className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full">
                                    <Text className="text-white font-montserrat-bold text-sm capitalize">
                                        {isVenueBooking ? 'Venue' : 'Room'} Booking
                                    </Text>
                                </View>
                            </View>
                        )}
                        <View className="p-6">
                            <View className="flex-row items-start space-x-3">
                                <Ionicons name="location" size={20} color="#8b5cf6" className="mt-1" />
                                <View className="flex-1">
                                    <Text className="text-4xl font-playfair-bold text-gray-900 mb-1">
                                        {propertyName}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Booking Dates */}
                    <View className="bg-white rounded-2xl shadow-sm p-6">
                        <View className="flex-row items-center space-x-3 mb-4">
                            <Ionicons name="calendar" size={20} color="#8b5cf6" />
                            <Text className="text-lg font-playfair-bold text-gray-900">
                                {isVenueBooking ? 'Event Dates' : 'Stay Dates'}
                            </Text>
                        </View>
                        
                        <View className="flex-row space-x-4">
                            <View className="flex-1 space-y-1">
                                <Text className="text-xs text-gray-500 uppercase tracking-wide font-montserrat-bold">
                                    {isVenueBooking ? 'Event Start' : 'Check-in'}
                                </Text>
                                <Text className="text-lg font-playfair-bold text-gray-900">
                                    {bookingData.check_in_date ? formatDate(bookingData.check_in_date) : 'N/A'}
                                </Text>
                                <Text className="text-sm text-gray-600 font-montserrat">
                                    {isVenueBooking ? 'As scheduled' : 'After 3:00 PM'}
                                </Text>
                            </View>
                            
                            <View className="flex-1 space-y-1">
                                <Text className="text-xs text-gray-500 uppercase tracking-wide font-montserrat-bold">
                                    {isVenueBooking ? 'Event End' : 'Check-out'}
                                </Text>
                                <Text className="text-lg font-playfair-bold text-gray-900">
                                    {bookingData.check_out_date ? formatDate(bookingData.check_out_date) : 'N/A'}
                                </Text>
                                <Text className="text-sm text-gray-600 font-montserrat">
                                    {isVenueBooking ? 'As scheduled' : 'Before 12:00 PM'}
                                </Text>
                            </View>
                        </View>

                        {!isVenueBooking && (
                            <View className="mt-4 pt-4 border-t border-gray-200">
                                <Text className="text-sm text-gray-600 font-montserrat">
                                    Duration: {calculateNights()} night{calculateNights() !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Guest & Payment Info */}
                    <View className="flex-row space-x-4">
                        <View className="flex-1 bg-white rounded-2xl shadow-sm p-6">
                            <View className="flex-row items-center space-x-3 mb-3">
                                <Ionicons name="people" size={20} color="#8b5cf6" />
                                <Text className="font-montserrat-bold text-gray-900 ml-2">
                                    {isVenueBooking ? 'Event Guests' : 'No. of Guests'}
                                </Text>
                            </View>
                            <Text className="text-2xl font-montserrat-bold text-gray-900">
                                {bookingData.number_of_guests}
                            </Text>
                            <Text className="text-sm text-gray-600 font-montserrat">
                                {bookingData.number_of_guests === 1 ? 'Guest' : 'Guests'}
                            </Text>
                        </View>

                        <View className="flex-1 bg-white rounded-2xl shadow-sm p-6">
                            <View className="flex-row items-center space-x-3 mb-3">
                                <Ionicons name="card" size={20} color="#8b5cf6" />
                                <Text className="font-montserrat-bold text-gray-900 ml-2">Payment Method</Text>
                            </View>
                            <Text className="text-lg font-montserrat-bold text-gray-900 capitalize">
                                {bookingData.payment_method.replace('_', ' ')}
                            </Text>
                            <Text className="text-sm text-gray-600 font-montserrat">
                                Paid on {formatDate(bookingData.payment_date)}
                            </Text>
                        </View>
                    </View>

                    {/* Pricing Breakdown */}
                    <View className="bg-white rounded-2xl shadow-sm p-6">
                        <Text className="text-lg font-montserrat-bold text-gray-900 mb-4">Pricing Details</Text>
                        <View className="space-y-4">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-600 font-montserrat">
                                    {isVenueBooking ? 'Venue Rate' : `Room Rate (${calculateNights()} nights)`}
                                </Text>
                                <Text className="font-montserrat-bold text-gray-900">
                                    {pesoFormatter.format(bookingData.original_price)}
                                </Text>
                            </View>
                            
                            {bookingData.discount_percent > 0 && (
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-gray-600 font-montserrat">
                                        Discount ({bookingData.discount_percent}% off)
                                    </Text>
                                    <Text className="font-montserrat-bold text-green-600">
                                        -{pesoFormatter.format(bookingData.original_price - (bookingData.discounted_price || bookingData.total_price))}
                                    </Text>
                                </View>
                            )}

                            {bookingData.down_payment && (
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-gray-600 font-montserrat">Down Payment</Text>
                                    <Text className="font-montserrat-bold text-blue-600">
                                        {pesoFormatter.format(parseInt(bookingData.down_payment))}
                                    </Text>
                                </View>
                            )}
                            
                            <View className="border-t border-gray-200 pt-4">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-lg font-playfair-bold text-gray-900">Total Amount</Text>
                                    <Text className="text-xl font-playfair-bold text-violet-600">
                                        {pesoFormatter.format(bookingData.discounted_price || bookingData.total_price)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Contact Information */}
                    <View className="bg-white rounded-2xl shadow-sm p-6">
                        <Text className="text-lg font-playfair-bold text-gray-900 mb-4">Contact Information</Text>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-600 font-montserrat">Phone Number</Text>
                            <Text className="font-montserrat-bold text-gray-900">{bookingData.phone_number}</Text>
                        </View>
                    </View>

                    {/* Special Requests */}
                    {bookingData.special_request && (
                        <View className="bg-white rounded-2xl shadow-sm p-6">
                            <View className="flex-row items-center space-x-3 mb-3">
                                <Ionicons name="document-text" size={20} color="#8b5cf6" />
                                <Text className="text-lg font-playfair-bold text-gray-900">Special Request</Text>
                            </View>
                            <View className="bg-gray-50 p-4 rounded-lg">
                                <Text className="text-gray-700 font-montserrat leading-relaxed">
                                    {bookingData.special_request}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Booking Timeline */}
                    <View className="bg-white rounded-2xl shadow-sm p-6">
                        <View className="flex-row items-center space-x-3 mb-4">
                            <Ionicons name="time" size={20} color="#8b5cf6" />
                            <Text className="text-lg font-playfair-bold text-gray-900">Booking Timeline</Text>
                        </View>
                        
                        <View className="space-y-4">
                            <View className="flex-row justify-between items-center">
                                <View className="flex-1">
                                    <Text className="font-montserrat-bold text-gray-900">Booking Created</Text>
                                    <Text className="text-sm text-gray-600 font-montserrat">Initial booking made</Text>
                                </View>
                                <Text className="text-sm font-montserrat-bold text-gray-900">
                                    {formatDate(bookingData.created_at)}
                                </Text>
                            </View>
                            
                            {bookingData.updated_at !== bookingData.created_at && (
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="font-montserrat-bold text-gray-900">Last Updated</Text>
                                        <Text className="text-sm text-gray-600 font-montserrat">Booking modified</Text>
                                    </View>
                                    <Text className="text-sm font-montserrat-bold text-gray-900">
                                        {formatDate(bookingData.updated_at)}
                                    </Text>
                                </View>
                            )}
                            
                            {bookingData.cancellation_date && (
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="font-montserrat-bold text-red-600">Booking Cancelled</Text>
                                        <Text className="text-sm text-gray-600 font-montserrat">Cancellation processed</Text>
                                    </View>
                                    <Text className="text-sm font-montserrat-bold text-red-600">
                                        {formatDate(bookingData.cancellation_date)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* E-Receipt Button */}
                    {bookingData.status === 'checked_out' && (
                        <TouchableOpacity 
                            className="bg-green-600 active:bg-green-700 py-4 px-6 rounded-2xl flex-row items-center justify-center space-x-3"
                            onPress={handleGenerateEReceipt}
                        >
                            <Ionicons name="download" size={20} color="white" />
                            <Text className="text-white font-montserrat-bold text-lg">
                                Download E-Receipt
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Action Buttons */}
                    {(bookingData.status === 'confirmed' || bookingData.status === 'pending') && (
                        <View className="flex-row space-x-4">
                            <TouchableOpacity 
                                className="flex-1 bg-red-600 active:bg-red-700 py-4 px-6 rounded-2xl items-center"
                                onPress={handleCancelBooking}
                            >
                                <Text className="text-white font-montserrat-bold">
                                    {bookingData.status === 'pending' ? 'Request Cancellation' : 'Cancel Booking'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Cancellation Modal for Pending Bookings */}
            <CancellationModal
                isOpen={isCancellationModalOpen}
                onClose={() => setIsCancellationModalOpen(false)}
                onConfirm={handleConfirmCancellation}
                title="Request Cancellation"
                description="Your booking is currently pending confirmation. Please provide a reason for your cancellation request."
                reasonLabel="Select cancellation reason"
                reasonPlaceholder="Please specify your reason for cancellation..."
                confirmButtonText="Submit Cancellation"
                reasons={guestCancellationReasons}
            />
        </SafeAreaView>
    );
}