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
import { useQuery } from '@tanstack/react-query';
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
import StyledText from '@/components/ui/StyledText';
import useAuthStore from '@/store/AuthStore';

export default function BookingsScreen() {
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState<boolean>(false);
    const [selectedBookingForFeedback, setSelectedBookingForFeedback] = useState<any>(null);
    const [exitAlertVisible, setExitAlertVisible] = useState<boolean>(false);

    const { isOffline } = useNetwork();
    const { user } = useAuthStore();

    const { 
        data,  
        isLoading, 
        error, 
        refetch, 
        isFetching
    } = useQuery({
        queryKey: ['guest-bookings', selectedStatus, currentPage],
        queryFn: () => {
            return auth.getGuestBookings({
                status: selectedStatus,
                page: currentPage,
                page_size: 10,
            });
        },
        enabled: !!user,
    });

    const allBookings = data?.data || [];
    const pagination = data?.pagination;
    const bookingIds = allBookings.map((booking: any) => booking.id);
    const firstBookingId = bookingIds.length > 0 ? bookingIds[0] : undefined;

    const handleStatusChange = useCallback((newStatus: string) => {
        setSelectedStatus(newStatus);
        setCurrentPage(1);
    }, []);

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
        BackHandler.exitApp();
    };

    useBookingUpdates(firstBookingId);

    const handleNextPage = useCallback(() => {
        if (pagination && currentPage < pagination.total_pages) {
            setCurrentPage(prev => prev + 1);
        }
    }, [pagination, currentPage]);

    const handlePreviousPage = useCallback(() => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    const renderPagination = useCallback(() => {
        if (!pagination || pagination.total_pages <= 1) return null;

        return (
            <View className="flex-row items-center justify-center py-4 px-4 bg-background-elevated border-t border-border-subtle">
                <TouchableOpacity
                    onPress={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg mr-2 ${
                        currentPage === 1 
                            ? 'bg-gray-200' 
                            : 'bg-interactive-primary active:bg-interactive-primary-pressed'
                    }`}
                >
                    <Ionicons 
                        name="chevron-back" 
                        size={20} 
                        color={currentPage === 1 ? '#9CA3AF' : '#FFF1F1'} 
                    />
                </TouchableOpacity>

                <View className="px-4">
                    <StyledText variant='montserrat-bold' className="text-md text-text-primary text-center">
                        Page {currentPage} of {pagination.total_pages}
                    </StyledText>
                    <StyledText variant='montserrat-regular' className="text-sm text-text-muted text-center">
                        {pagination.total_items} total bookings
                    </StyledText>
                </View>

                <TouchableOpacity
                    onPress={handleNextPage}
                    disabled={currentPage === pagination.total_pages}
                    className={`px-4 py-2 rounded-lg ml-2 ${
                        currentPage === pagination.total_pages 
                            ? 'bg-gray-200' 
                            : 'bg-interactive-primary active:bg-interactive-primary-pressed'
                    }`}
                >
                    <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={currentPage === pagination.total_pages ? '#9CA3AF' : '#FFF1F1'} 
                    />
                </TouchableOpacity>
            </View>
        );
    }, [pagination, currentPage, handleNextPage, handlePreviousPage]);

    const handleLeaveFeedback = useCallback((booking: any) => {
        setSelectedBookingForFeedback(booking);
        setFeedbackModalVisible(true);
    }, []);

    const handleCloseFeedbackModal = useCallback(() => {
        setFeedbackModalVisible(false);
        setSelectedBookingForFeedback(null);
    }, []);

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
        const isLast = index === allBookings.length - 1;

        return (
            <BookingCard
                item={item}
                onLeaveFeedback={handleLeaveFeedback}
                footer={isLast ? renderPagination() : undefined}
            />
        );
    }, [allBookings.length, handleLeaveFeedback, renderPagination]);

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
                onStatusChange={handleStatusChange} 
            />

            <FlatList
                data={allBookings}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl 
                        refreshing={isFetching} 
                        onRefresh={refetch}
                        colors={['#6F00FF']}
                        tintColor="#6F00FF"
                    />
                }
                contentContainerStyle={{ paddingBottom: 140, paddingTop: 55 }}
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
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={10}
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