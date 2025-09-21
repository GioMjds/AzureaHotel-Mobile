import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface TabItem {
    name: string;
    route: string;
    icon: keyof typeof FontAwesome.glyphMap;
}

const tabs: TabItem[] = [
    { name: 'Home', route: '/(screens)', icon: 'home' },
    { name: 'Rooms', route: '/(screens)/rooms', icon: 'bed' },
    { name: 'Areas', route: '/(screens)/areas', icon: 'map-marker' },
    { name: 'My Bookings', route: '/(screens)/bookings', icon: 'calendar' },
    { name: 'Profile', route: '/(screens)/profile', icon: 'user' },
];

const { width: screenWidth } = Dimensions.get('window');
const tabWidth = screenWidth / tabs.length;

export default function Tabs() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    const handleTabPress = (route: string) => {
        router.push(route as any);
    }

    const isActiveTab = (route: string) => {
        if (route === '/(screens)') {
            return pathname === '/(screens)' || pathname === '/(screens)/index';
        }
        return pathname === route;
    }

    return (
        <View>
            {/* Gradient backdrop with blur effect */}
            <BlurView intensity={80} tint="light" className="absolute inset-0" />
            
            {/* Main tab container with gradient border */}
            <LinearGradient
                colors={['rgba(139, 92, 246, 0.05)', 'rgba(124, 58, 237, 0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="border-t border-violet-200/30"
            >
                <View className="flex-row bg-white/95 px-2 py-3 pb-6">
                    {tabs.map((tab, index) => {
                        const isActive = isActiveTab(tab.route);
                        
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                onPress={() => handleTabPress(tab.route)}
                                className="flex-1 items-center justify-center"
                                activeOpacity={0.7}
                                style={{ minHeight: 56 }}
                            >
                                <View className="items-center relative px-2 py-1">
                                    {/* Active tab background gradient */}
                                    {isActive && (
                                        <LinearGradient
                                            colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            className="absolute inset-0 rounded-2xl opacity-10"
                                            style={{
                                                width: tabWidth - 16,
                                                height: '100%',
                                                transform: [{ scale: 1.1 }]
                                            }}
                                        />
                                    )}
                                    
                                    {/* Icon container */}
                                    <View className="relative mb-1">
                                        <View className="p-2.5 rounded-xl bg-neutral-100/80">
                                            <FontAwesome
                                                name={tab.icon}
                                                size={20}
                                                color="#78716c"
                                            />
                                        </View>
                                        {/* Active indicator dot */}
                                        {isActive && (
                                            <View className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                                                <LinearGradient
                                                    colors={['#d946ef', '#8b5cf6']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    className="w-1 h-1 rounded-full"
                                                />
                                            </View>
                                        )}
                                    </View>
                                    
                                    {/* Tab label */}
                                    <Text 
                                        className={`text-xs mt-1 ${
                                            isActive 
                                                ? 'font-montserrat-bold text-violet-700' 
                                                : 'font-montserrat text-neutral-500'
                                        }`}
                                        numberOfLines={1}
                                    >
                                        {tab.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </LinearGradient>
            
            {/* Bottom gradient fade for iPhone gesture area */}
            <LinearGradient
                colors={['rgba(139, 92, 246, 0.03)', 'transparent']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            />
        </View>
    )
}