import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import BookingCard from '@/components/bookings/BookingCard';
import StatusFilter from '@/components/bookings/StatusFilter';
import { Ionicons } from '@expo/vector-icons';
import { useFirebaseNotifications } from '@/hooks/useFirebaseNotifications';
import { useBookingUpdates } from '@/hooks/useBookingUpdates';

export default function BookingsScreen() {
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['guest-bookings', selectedStatus],
        queryFn: async () => {
            return await auth.getGuestBookings({
                status: selectedStatus,
                page: 1,
                page_size: 10,
            });
        },
    });

    // Get Firebase notifications
    const { unreadCount } = useFirebaseNotifications();

    const bookingIds = data?.data?.map((booking: any) => booking.id) || [];
    const firstBookingId = bookingIds.length > 0 ? bookingIds[0] : undefined;

	useBookingUpdates(firstBookingId);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background-DEFAULT">
                <View className="flex-1 justify-center items-center px-6">
                    <View className="bg-background-elevated rounded-2xl p-8 items-center shadow-sm border border-border-subtle">
                        <ActivityIndicator size="large" color="#6F00FF" />
                        <Text className="text-text-secondary font-montserrat-bold text-base mt-4">
                            Loading your bookings...
                        </Text>
                        <Text className="text-text-muted font-montserrat text-sm mt-2 text-center">
                            Please wait while we fetch your booking history
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-background-DEFAULT">
                <View className="flex-1 justify-center items-center px-6">
                    <View className="bg-background-elevated rounded-2xl p-8 items-center shadow-sm border border-border-subtle">
                        <Ionicons name="alert-circle" size={48} color="#dc2626" />
                        <Text className="text-feedback-error-DEFAULT font-montserrat-bold text-lg mt-4 text-center">
                            Failed to load bookings
                        </Text>
                        <Text className="text-text-muted font-montserrat text-sm mt-2 text-center">
                            {error instanceof Error ? error.message : 'Something went wrong while fetching your bookings'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => refetch()}
                            className="bg-feedback-error-DEFAULT px-8 py-4 rounded-xl mt-6 shadow-sm active:bg-red-600"
                        >
                            <View className="flex-row items-center">
                                <Ionicons
                                    name="refresh"
                                    size={18}
                                    color="white"
                                    style={{ marginRight: 8 }}
                                />
                                <Text className="text-white font-montserrat-bold text-base">
                                    Try Again
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-6 py-6 bg-background border-b border-border-subtle">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-3xl font-playfair-bold text-text-primary">
                        My Bookings
                    </Text>
                    {/* Show notification count if there are unread notifications */}
                    {unreadCount > 0 && (
                        <View className="bg-interactive-primary-DEFAULT rounded-full px-3 py-1">
                            <Text className="text-white font-montserrat-bold text-sm">
                                {unreadCount} new
                            </Text>
                        </View>
                    )}
                </View>
                <View className="flex-row items-center">
                    <Ionicons
                        name="information-circle"
                        size={16}
                        color="#6b7280"
                        style={{ marginRight: 6 }}
                    />
                    <Text className="text-text-muted font-montserrat text-sm flex-1">
                        Manage your hotel reservations and track their status in real-time
                    </Text>
                </View>
            </View>

            {/* Status Filter */}
            <StatusFilter 
                selectedStatus={selectedStatus} 
                onStatusChange={setSelectedStatus} 
            />

            {/* Bookings List */}
            <FlatList
                data={data?.data || []}
                keyExtractor={(item) => item.id?.toString()}
                renderItem={({ item }) => <BookingCard item={item} />}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 100,
                    flexGrow: 1,
                }}
                refreshControl={
                    <RefreshControl 
                        refreshing={isFetching} 
                        onRefresh={refetch}
                        colors={['#6F00FF']}
                        tintColor="#6F00FF"
                    />
                }
                ListEmptyComponent={() => (
                    <View className="flex-1 justify-center items-center py-12">
                        <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
                        <Text className="text-text-muted font-montserrat-bold text-lg mt-4">
                            No bookings found
                        </Text>
                        <Text className="text-text-muted font-montserrat text-sm mt-2 text-center px-8">
                            {selectedStatus 
                                ? `No bookings with status "${selectedStatus}"`
                                : "Start planning your next stay with us"
                            }
                        </Text>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}