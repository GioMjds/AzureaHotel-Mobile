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
import { useNetwork } from '@/components/NetworkProvider';

export default function BookingsScreen() {
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);
    const [selectedBookingForFeedback, setSelectedBookingForFeedback] = useState<any>(null);
    const [exitAlertVisible, setExitAlertVisible] = useState<boolean>(false);

    const { isOffline } = useNetwork();

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
        queryFn: async ({ pageParam }) => {
            return await auth.getGuestBookings({
                status: selectedStatus,
                page: pageParam,
                page_size: 5,
            });
        },
        getNextPageParam: (lastPage) => {
            const currentPage = lastPage?.pagination?.current_page;
            const totalPages = lastPage?.pagination?.total_pages;
            
            // Only return next page number if there are more pages
            if (currentPage && totalPages && currentPage < totalPages) {
                return currentPage + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
        gcTime: 10 * 60 * 1000, // 10 minutes - cache time
        refetchOnMount: false, // Don't refetch on component mount
        refetchOnWindowFocus: false, // Don't refetch when window gains focus
        refetchOnReconnect: true, // Only refetch when reconnecting to network
        enabled: true
    });

    const allBookings = data?.pages?.flatMap(page => page.data) || [];
    const bookingIds = allBookings.map((booking: any) => booking.id);
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

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const renderFooter = useCallback(() => {
        if (!isFetchingNextPage) return null;
        
        return (
            <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#6F00FF" />
                <Text className="text-text-muted font-montserrat text-sm mt-2">
                    Loading more bookings...
                </Text>
            </View>
        );
    }, [isFetchingNextPage]);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <BookingCard item={item} onLeaveFeedback={handleLeaveFeedback} />
    ), []);

    const handleLeaveFeedback = useCallback((booking: any) => {
        setSelectedBookingForFeedback(booking);
        setFeedbackModalVisible(true);
    }, []);

    const handleCloseFeedbackModal = useCallback(() => {
        setFeedbackModalVisible(false);
        setSelectedBookingForFeedback(null);
    }, []);

    const keyExtractor = useCallback((item: any, index: number) => `${item.id}-${index}`, []);

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

    if (error || isOffline) {
        return (
            <View className="flex-1 bg-background">
                <View className="flex-1 justify-center items-center px-6">
                    <View className="bg-background-elevated rounded-2xl p-8 items-center shadow-sm border border-border-subtle">
                        <Ionicons 
                            name={isOffline ? "cloud-offline" : "alert-circle"} 
                            size={48} 
                            color={isOffline ? "#F59E0B" : "#dc2626"} 
                        />
                        <Text className={`font-montserrat-bold text-lg mt-4 text-center ${isOffline ? 'text-feedback-warning-DEFAULT' : 'text-feedback-error-DEFAULT'}`}>
                            {isOffline ? 'No internet connection' : 'Failed to load bookings'}
                        </Text>
                        <Text className="text-text-muted font-montserrat text-sm mt-2 text-center">
                            {isOffline 
                                ? 'Please check your connection and try again' 
                                : (error instanceof Error ? error.message : 'Something went wrong while fetching your bookings')
                            }
                        </Text>
                        <TouchableOpacity
                            onPress={() => refetch()}
                            className={`px-8 py-4 rounded-xl mt-6 shadow-sm ${isOffline ? 'bg-feedback-warning-DEFAULT active:bg-yellow-600' : 'bg-feedback-error-DEFAULT active:bg-red-600'}`}
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

    return (
        <View className="flex-1 bg-background">
            <StatusBar style="dark" animated backgroundColor={feedbackModalVisible ? 'rgba(0, 0, 0, 0.4)' : 'transparent'} />

            <StatusFilter 
                selectedStatus={selectedStatus} 
                onStatusChange={setSelectedStatus} 
            />

            <FlatList
                data={allBookings}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
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
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={5}
            />

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