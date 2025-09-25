import { ScrollView, View, Text, Image, ActivityIndicator, TouchableOpacity, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/services/UserAuth";
import { useAuth } from "@/hooks/useAuth";
import { GuestResponse, IsVerified } from "@/types/GuestUser.types";
import { getVerificationDisplay } from "@/utils/formatters";
import { useAuthMutations } from "@/hooks/useAuthMutations";

export default function ProfileScreen() {
    const { user } = useAuth();

    const { logoutMutation } = useAuthMutations();

    const { data, isLoading, error } = useQuery<GuestResponse>({
        queryKey: ['userProfile', user?.id],
        queryFn: async () => {
            return await auth.getGuestProfile(user?.id as number);
        },
        enabled: !!user?.id,
    });

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-background-default">
                <View className="flex-1 justify-center items-center">
                    <View className="bg-surface-default rounded-3xl p-8 shadow-lg items-center">
                        <ActivityIndicator size="large" color="#6F00FF" />
                        <Text className="text-text-muted mt-4 font-montserrat text-lg">Loading your profile...</Text>
                        <View className="w-32 h-2 bg-neutral-200 rounded-full mt-4 overflow-hidden">
                            <View className="h-full bg-brand-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-background-default">
                <View className="flex-1 justify-center items-center p-6">
                    <View className="bg-surface-default rounded-3xl p-8 shadow-lg items-center max-w-sm">
                        <View className="w-16 h-16 bg-feedback-error-light rounded-full items-center justify-center mb-4">
                            <Text className="text-feedback-error-DEFAULT text-2xl">!</Text>
                        </View>
                        <Text className="text-feedback-error-DEFAULT text-xl font-playfair-bold text-center mb-2">
                            Oops! Something went wrong
                        </Text>
                        <Text className="text-text-muted font-montserrat text-center mb-6">
                            We couldn&apos;t load your profile. Please check your connection and try again.
                        </Text>
                        <TouchableOpacity className="bg-brand-primary px-6 py-3 rounded-xl">
                            <Text className="text-text-inverse font-montserrat-bold">Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView className="flex-1 bg-background-default">
                <View className="flex-1 justify-center items-center p-6">
                    <View className="bg-surface-default rounded-3xl p-8 shadow-lg items-center">
                        <Text className="text-text-muted font-playfair text-lg">No profile data found</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const guest = data.data;
    const verificationStatus = getVerificationDisplay(guest.is_verified);

    return (
        <SafeAreaView className="flex-1 bg-background-default">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Enhanced Header with Gradient Effect */}
                <View className="bg-brand-primary px-6 pb-12 pt-6 relative">
                    <View className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-secondary opacity-90" />
                    <View className="relative z-10">
                        <Text className="text-4xl font-playfair-bold text-text-inverse mb-2">
                            My Profile
                        </Text>
                        <Text className="text-brand-accent font-montserrat text-lg opacity-90">
                            Manage your account information
                        </Text>
                    </View>
                    {/* Decorative Elements */}
                    <View className="absolute top-8 right-6 w-20 h-20 rounded-full bg-brand-accent opacity-10" />
                    <View className="absolute top-16 right-16 w-12 h-12 rounded-full bg-brand-accent opacity-20" />
                </View>

                {/* Enhanced Profile Card with Glassmorphism Effect */}
                <View className="mx-4 -mt-10 bg-surface-default/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-border-subtle">
                    {/* Profile Image and Basic Info with Enhanced Layout */}
                    <View className="items-center mb-8">
                        <View className="relative mb-4">
                            <View className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary p-1">
                                <Image
                                    source={{ uri: guest.profile_image, cache: 'default' }}
                                    className="w-full h-full rounded-full bg-neutral-200"
                                />
                            </View>
                            <View className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${verificationStatus.color}`}>
                                <Text className="text-white text-xs font-bold">{verificationStatus.icon}</Text>
                            </View>
                        </View>
                        <Text className="text-3xl font-playfair-bold text-text-primary text-center mb-2">
                            {guest.first_name} {guest.last_name}
                        </Text>
                        <Text className="text-text-secondary font-montserrat text-lg text-center">
                            {guest.email}
                        </Text>
                    </View>

                    {/* Enhanced Verification Status with Better Visual Hierarchy */}
                    <View className={`p-6 rounded-2xl mb-6 border-l-4 ${verificationStatus.bgColor} ${verificationStatus.borderColor}`}>
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                                <View className={`w-3 h-3 rounded-full mr-3 ${verificationStatus.color}`} />
                                <Text className={`font-playfair-semibold text-lg ${verificationStatus.textColor}`}>
                                    ID Verification
                                </Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${verificationStatus.color}`}>
                                <Text className="text-white font-montserrat-bold text-xs">
                                    {verificationStatus.text}
                                </Text>
                            </View>
                        </View>
                        {(guest.is_verified === IsVerified.REJECTED || guest.is_verified === IsVerified.PENDING) && guest.valid_id_rejection_reason && (
                            <View className="mt-3 p-3 bg-feedback-error-DEFAULT/10 rounded-xl">
                                <Text className="text-feedback-error-dark font-montserrat-bold text-sm mb-1">
                                    {guest.is_verified === IsVerified.REJECTED ? 'Rejection Reason:' : 'Note:'}
                                </Text>
                                <Text className="text-feedback-error-dark font-montserrat text-sm">
                                    {guest.valid_id_rejection_reason}
                                </Text>
                            </View>
                        )}
                        {guest.is_verified === IsVerified.UNVERIFIED && (
                            <View className="mt-3 p-3 bg-feedback-info-light rounded-xl">
                                <Text className="text-feedback-info-DEFAULT font-montserrat text-sm">
                                    Please upload your valid ID documents to verify your account and access all features.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Enhanced Information Cards */}
                    <View className="space-y-4">
                        {[
                            { label: 'ID Type', value: guest.valid_id_type_display || 'Not provided', icon: '🆔' },
                            { label: 'Senior/PWD Status', value: guest.is_senior_or_pwd ? 'Eligible' : 'Not applicable', icon: '👥', highlight: guest.is_senior_or_pwd },
                            { label: 'Last Booking', value: guest.last_booking_date ? new Date(guest.last_booking_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No bookings yet', icon: '📅' },
                            { label: 'Member Since', value: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), icon: '⭐' }
                        ].map((item, index) => (
                            <View key={index} className="bg-background-default/50 rounded-2xl p-4 flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <Text className="text-2xl mr-3">{item.icon}</Text>
                                    <View className="flex-1">
                                        <Text className="text-text-muted font-montserrat text-sm mb-1">{item.label}</Text>
                                        <Text className={`font-playfair-semibold text-base ${item.highlight ? 'text-feedback-success-DEFAULT' : 'text-text-primary'}`}>
                                            {item.value}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Enhanced ID Documents Section */}
                {(guest.valid_id_front || guest.valid_id_back) && (
                    <View className="mx-4 bg-surface-default/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-border-subtle">
                        <View className="flex-row items-center mb-6">
                            <Text className="text-2xl mr-3">📄</Text>
                            <Text className="text-2xl font-playfair-bold text-text-primary">
                                ID Documents
                            </Text>
                        </View>
                        <View className="flex-row justify-between space-x-4">
                            {guest.valid_id_front && (
                                <View className="flex-1">
                                    <View className="bg-brand-primary/10 rounded-xl p-3 mb-3">
                                        <Text className="text-brand-primary font-montserrat-bold text-center text-sm">FRONT SIDE</Text>
                                    </View>
                                    <View className="rounded-2xl overflow-hidden shadow-lg border border-border-subtle">
                                        <Image
                                            source={{ uri: guest.valid_id_front }}
                                            className="w-full h-32 bg-neutral-200"
                                        />
                                    </View>
                                </View>
                            )}
                            {guest.valid_id_back && (
                                <View className="flex-1">
                                    <View className="bg-brand-primary/10 rounded-xl p-3 mb-3">
                                        <Text className="text-brand-primary font-montserrat-bold text-center text-sm">BACK SIDE</Text>
                                    </View>
                                    <View className="rounded-2xl overflow-hidden shadow-lg border border-border-subtle">
                                        <Image
                                            source={{ uri: guest.valid_id_back }}
                                            className="w-full h-32 bg-neutral-200"
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Enhanced Account Details */}
                <View className="mx-4 bg-surface-default/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-8 border border-border-subtle">
                    <View className="flex-row items-center mb-6">
                        <Text className="text-2xl mr-3">⚙️</Text>
                        <Text className="text-2xl font-playfair-bold text-text-primary">
                            Account Details
                        </Text>
                    </View>
                    <View className="space-y-4">
                        <View className="bg-background-default/50 rounded-2xl p-4 flex-row justify-between items-center">
                            <Text className="text-text-muted font-montserrat">User ID</Text>
                            <View className="bg-brand-primary/10 px-3 py-1 rounded-full">
                                <Text className="text-brand-primary font-montserrat-bold">#{guest.id}</Text>
                            </View>
                        </View>
                        <View className="bg-background-default/50 rounded-2xl p-4 flex-row justify-between items-center">
                            <Text className="text-text-muted font-montserrat">Account Status</Text>
                            <View className={`px-4 py-2 rounded-full ${verificationStatus.isVerified ? 'bg-feedback-success-DEFAULT' : 'bg-feedback-warning-DEFAULT'}`}>
                                <Text className="text-white font-montserrat-bold text-sm">
                                    {verificationStatus.isVerified ? 'ACTIVE' : 'VERIFICATION REQUIRED'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="mx-4 mb-8 items-center">
                    <Pressable
                        onPress={() => logoutMutation.mutate()}
                        className="bg-feedback-error-DEFAULT px-8 py-4 rounded-xl shadow-sm active:bg-red-600"
                    >
                        <Text>
                            Logout
                        </Text>
                    </Pressable>
                </View>

                {/* Bottom Spacing for better scroll experience */}
                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
}