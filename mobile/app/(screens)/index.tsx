import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
    BackHandler
} from 'react-native';
import { useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import BookingCard from '@/components/bookings/BookingCard';
import StatusFilter from '@/components/bookings/StatusFilter';
import { Ionicons } from '@expo/vector-icons';
import { useBookingUpdates } from '@/hooks/useBookingUpdates';
import FeedbackModal from '@/components/bookings/FeedbackModal';
import StyledAlert from '@/components/ui/StyledAlert';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

export default function BookingsScreen() {
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);
    const [selectedBookingForFeedback, setSelectedBookingForFeedback] = useState<any>(null);
    const [exitAlertVisible, setExitAlertVisible] = useState<boolean>(false);

    const { 
        data,  
        isLoading, 
        error, 
        refetch, 
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['guest-bookings', selectedStatus],
        queryFn: async ({ pageParam = 1 }) => {
            return await auth.getGuestBookings({
                status: selectedStatus,
                page: pageParam,
                page_size: 5,
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            const currentPage = lastPage?.pagination?.current_page || allPages.length;
            const totalPages = lastPage?.pagination?.total_pages || 0;
            
            return currentPage < totalPages ? currentPage + 1 : undefined;
        },
        initialPageParam: 1,
        refetchIntervalInBackground: false,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });

    const allBookings = data?.pages?.flatMap(page => page.data) || [];
    const bookingIds = allBookings.map((booking: any) => booking.id) || [];
    const firstBookingId = bookingIds.length > 0 ? bookingIds[0] : undefined;

    useFocusEffect(
        useCallback(() => {
            const backAction = () => {
                setExitAlertVisible(true);
                return true;
            };

            const backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                backAction
            );

            // Cleanup when screen loses focus
            return () => backHandler.remove();
        }, [])
    );

    const handleExitApp = () => {
        setExitAlertVisible(false);
        setTimeout(() => {
            BackHandler.exitApp();
        }, 100);
    };

    useBookingUpdates(firstBookingId);

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    };

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        
        return (
            <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#6F00FF" />
                <Text className="text-text-muted font-montserrat text-sm mt-2">
                    Loading more bookings...
                </Text>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background">
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
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-background">
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
            </View>
        );
    }

    const handleLeaveFeedback = (booking: any) => {
        setSelectedBookingForFeedback(booking);
        setFeedbackModalVisible(true);
    };

    const handleCloseFeedbackModal = () => {
        setFeedbackModalVisible(false);
        setSelectedBookingForFeedback(null);
    };

    return (
        <View className="flex-1 bg-background">
            <StatusBar style="dark" animated backgroundColor={feedbackModalVisible ? 'rgba(0, 0, 0, 0.4)' : 'transparent'} />

            {/* Status Filter */}
            <StatusFilter 
                selectedStatus={selectedStatus} 
                onStatusChange={setSelectedStatus} 
            />

            {/* Bookings List */}
            <FlatList
                data={allBookings}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item }) => (
                    <BookingCard item={item} onLeaveFeedback={handleLeaveFeedback} />
                )}
                refreshControl={
                    <RefreshControl 
                        refreshing={isFetching && !isFetchingNextPage} 
                        onRefresh={refetch}
                        colors={['#6F00FF']}
                        tintColor="#6F00FF"
                    />
                }
                contentContainerStyle={{ paddingBottom: 140, paddingTop: 55 }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
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

            {/* Feedback Modal (global) */}
            {selectedBookingForFeedback && (
                <FeedbackModal
                    visible={feedbackModalVisible}
                    onClose={handleCloseFeedbackModal}
                    bookingItem={selectedBookingForFeedback}
                />
            )}

            <StyledAlert
                visible={exitAlertVisible}
                type="warning"
                title="Exit App"
                message="Are you sure you want to exit Azurea Hotel?"
                buttons={[
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => setExitAlertVisible(false)
                    },
                    {
                        text: 'Exit',
                        style: 'destructive',
                        onPress: handleExitApp
                    }
                ]}
                onDismiss={() => setExitAlertVisible(false)}
            />
        </View>
    );
}