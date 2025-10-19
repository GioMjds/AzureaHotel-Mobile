import { FontAwesome, Ionicons } from "@expo/vector-icons";
import StyledText from "../ui/StyledText";
import { TouchableOpacity, View } from "react-native";
import { formatDistanceToNow } from "date-fns";

interface NotificationItemProps {
    title: string;
    message: string;
    type: 'booking' | 'payment' | 'general' | 'system';
    is_read: boolean;
    created_at: string;
    onPress: () => void;
    onMarkAsRead: () => void;
}

const NotificationItem = ({
    title,
    message,
    type,
    is_read,
    created_at,
    onPress,
    onMarkAsRead
}: NotificationItemProps) => {
    const getNotificationIcon = () => {
        switch (type) {
            case 'booking':
                return { name: 'calendar', color: '#6F00FF' };
            case 'payment':
                return { name: 'credit-card', color: '#10B981' };
            case 'system':
                return { name: 'cog', color: '#F59E0B' };
            default:
                return { name: 'bell', color: '#3B82F6' };
        }
    };

    const icon = getNotificationIcon();
    const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`mb-3 rounded-2xl border ${
                is_read 
                    ? 'bg-background-elevated border-border-subtle' 
                    : 'bg-violet-light/20 border-brand-primary'
            }`}
            activeOpacity={0.7}
        >
            <View className="p-4">
                <View className="flex-row items-start">
                    {/* Icon Container */}
                    <View 
                        className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                            is_read ? 'bg-neutral-100' : 'bg-brand-primary/10'
                        }`}
                    >
                        <FontAwesome name={icon.name as any} size={20} color={icon.color} />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                        <StyledText 
                            variant="montserrat-regular"
                            className={`text-md mb-2 ${
                                is_read ? 'text-black' : 'text-text-secondary'
                            }`}
                            numberOfLines={2}
                        >
                            {message}
                        </StyledText>
                        {!is_read && (
                            <View className="w-2 h-2 rounded-full bg-brand-primary ml-2" />
                        )}

                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Ionicons name="time-outline" size={14} color="#000" />
                                <StyledText 
                                    variant="raleway-regular"
                                    className="text-xs text-black ml-1"
                                >
                                    {timeAgo}
                                </StyledText>
                            </View>

                            {!is_read && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onMarkAsRead();
                                    }}
                                    className="px-3 py-1 rounded-full bg-brand-primary/10"
                                    activeOpacity={0.7}
                                >
                                    <StyledText 
                                        variant="raleway-bold"
                                        className="text-xs text-brand-primary"
                                    >
                                        Mark as Read
                                    </StyledText>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default NotificationItem;