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

    const renderStatusFilter = ({ item }: { item: typeof statusFilters[0] }) => (
        <TouchableOpacity
            onPress={() => setSelectedStatus(item.value)}
            className={`px-4 py-2 mr-2 rounded-full border ${
                selectedStatus === item.value
                    ? 'bg-violet-600 border-violet-600'
                    : 'bg-neutral-50 border-neutral-200'
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
                <Text className="text-2xl font-montserrat-bold text-neutral-800">
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
                renderItem={({ item }) => <BookingCard item={item} />}
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