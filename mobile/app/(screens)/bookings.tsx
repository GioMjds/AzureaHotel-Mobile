import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import { UserBooking } from '@/types/Bookings.types';
import { pesoFormatter, formatDate, getStatusColor } from '@/utils/formatters';
import { Link } from 'expo-router';

export default function BookingsScreen() {
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['guest-bookings', selectedStatus],
        queryFn: async () => {
            return await auth.getGuestBookings({
                status: selectedStatus,
                page: 1,
                page_size: 10
            });
        },
    });

    const statusFilters = [
        { label: 'All', value: '' },
        { label: 'Pending', value: 'pending' },
        { label: 'Reserved', value: 'reserved' },
        { label: 'Checked In', value: 'checked_in' },
        { label: 'Checked Out', value: 'checked_out' },
        { label: 'Completed', value: 'completed' },
    ];

    const renderBookingCard = ({ item }: { item: UserBooking }) => {
        const isVenueBooking = item.is_venue_booking;

        const propertyName = isVenueBooking 
            ? (item.area_details)?.area_name
            : (item.room_details)?.room_name;

        const propertyImage = isVenueBooking
            ? (item.area_details)?.images?.[0].area_image
            : (item.room_details)?.images?.[0].room_image;

        return (
            <View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-neutral-200">
                {/* Property Image */}
                <View className="h-40 bg-neutral-100">
                    {propertyImage && (
                        <Image
                            source={{ uri: propertyImage }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    )}

                    {/* Status Badge */}
                    <View className="absolute top-3 left-3">
                        <View className={`px-3 py-2 rounded-full ${getStatusColor(item.status)}`}>
                            <Text className="text-white font-bold text-sm uppercase">
                                {item.status.replace('_', ' ')}
                            </Text>
                        </View>
                    </View>

                    {/* Booking Type Badge */}
                    <View className="absolute top-3 right-3 bg-white/90 rounded-full px-3 py-1">
                        <Text className="text-neutral-700 font-semibold text-sm">
                            {isVenueBooking ? 'Area' : 'Room'}
                        </Text>
                    </View>
                </View>

                {/* Booking Details */}
                <View className="p-4">
                    {/* Property Name */}
                    <Text className="text-2xl font-bold text-neutral-800 mb-2">
                        {propertyName || 'Unknown Property'}
                    </Text>

                    {/* Booking Information */}
                    <View className="space-y-2 mb-4">
                        {/* Check-in/Check-out Dates */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-neutral-500 font-montserrat text-xs">
                                    Check-in
                                </Text>
                                <Text className="text-neutral-800 font-montserrat-bold text-sm">
                                    {item.check_in_date ? formatDate(item.check_in_date) : 'N/A'}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-neutral-500 font-montserrat text-xs">
                                    Check-out
                                </Text>
                                <Text className="text-neutral-800 font-montserrat-bold text-sm">
                                    {item.check_out_date ? formatDate(item.check_out_date) : 'N/A'}
                                </Text>
                            </View>
                        </View>

                        {/* Guests and Payment Method */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-neutral-500 font-montserrat text-xs">
                                    Guests
                                </Text>
                                <Text className="text-neutral-800 font-montserrat-bold text-sm">
                                    {item.number_of_guests} {item.number_of_guests === 1 ? 'guest' : 'guests'}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-neutral-500 font-montserrat text-xs">
                                    Payment
                                </Text>
                                <Text className="text-neutral-800 font-montserrat-bold text-sm capitalize">
                                    {item.payment_method}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Pricing */}
                    <View className="border-t border-neutral-200 pt-4">
                        <View className="flex-row items-center justify-between">
                            <View>
                                {item.discount_percent > 0 && item.discounted_price ? (
                                    <View>
                                        <Text className="text-neutral-400 font-montserrat text-sm line-through">
                                            {pesoFormatter.format(item.original_price)}
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Text className="text-violet-600 font-black text-lg">
                                                {pesoFormatter.format(item.discounted_price)}
                                            </Text>
                                            <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                                                <Text className="text-green-700 font-montserrat-bold text-xs">
                                                    {item.discount_percent}% OFF
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <Text className="text-violet-600 font-black text-lg">
                                        {pesoFormatter.format(item.total_price)}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity className="bg-violet-600 px-4 py-2 rounded-full">
                                <Link href={`/booking/${item.id}` as any} asChild>
                                    <Text className="text-white font-semibold text-md">
                                        View Details
                                    </Text>
                                </Link>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Special Request */}
                    {item.special_request && (
                        <View className="mt-3 pt-3 border-t border-neutral-100">
                            <Text className="text-neutral-500 font-montserrat text-xs mb-1">
                                Special Request
                            </Text>
                            <Text className="text-neutral-700 font-montserrat text-sm">
                                {item.special_request}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderStatusFilter = ({ item }: { item: typeof statusFilters[0] }) => (
        <TouchableOpacity
            onPress={() => setSelectedStatus(item.value)}
            className={`px-4 py-2 mr-2 rounded-full border ${
                selectedStatus === item.value
                    ? 'bg-violet-600 border-violet-600'
                    : 'bg-white border-neutral-200'
            }`}
        >
            <Text
                className={`font-montserrat-bold text-sm ${
                    selectedStatus === item.value ? 'text-white' : 'text-neutral-600'
                }`}
            >
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text className="text-violet-600 font-montserrat mt-2">
                        Loading bookings...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-red-500 font-montserrat-bold text-lg text-center">
                        Error loading bookings
                    </Text>
                    <Text className="text-neutral-600 font-montserrat mt-2 text-center">
                        Please try again later
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        className="bg-violet-600 px-6 py-2 rounded-full mt-4"
                    >
                        <Text className="text-white font-montserrat-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="px-4 py-2 bg-white border-b border-neutral-200">
                <Text className="text-2xl font-playfair-bold text-neutral-800">
                    My Bookings
                </Text>
                <Text className="text-neutral-600 font-montserrat text-sm mt-1">
                    {data?.data?.length || 0} total booking{data?.data?.length || 0 > 1 ? 's' : ''}
                </Text>
            </View>

            {/* Status Filters */}
            <View className="py-4">
                <FlatList
                    data={statusFilters}
                    renderItem={renderStatusFilter}
                    keyExtractor={(item) => item.value}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                />
            </View>

            {/* Bookings List */}
            <FlatList
                data={data?.data}
                renderItem={renderBookingCard}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching}
                        onRefresh={refetch}
                        colors={['#8b5cf6']}
                    />
                }
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center py-20">
                        <Text className="text-neutral-500 font-montserrat text-center">
                            {selectedStatus 
                                ? `No ${selectedStatus} bookings found`
                                : 'No bookings found'
                            }
                        </Text>
                        <Text className="text-neutral-400 font-montserrat text-sm text-center mt-1">
                            Start by booking a room or venue
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}