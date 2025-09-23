import { useRef } from 'react';
import { ScrollView, FlatList } from 'react-native';
import { useTabVisibilityStore } from '@/store/ScrollStore';

export function ScrollAwareView({ children, type = 'scroll', ...props }: any) {
    const scrollOffset = useRef(0);

    const handleScroll = (e: any) => {
        const currentOffset = e.nativeEvent.contentOffset.y;
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';
        scrollOffset.current = currentOffset;

        if (direction === 'down' && currentOffset > 10) {
            useTabVisibilityStore.getState().setVisible('hidden');
        } else if (direction === 'up') {
            useTabVisibilityStore.getState().setVisible('visible');
        }
    };

    if (type === 'flatlist') {
        return (
            <FlatList
                {...props}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            />
        );
    }

    return (
        <ScrollView
            {...props}
            onScroll={handleScroll}
            scrollEventThrottle={16}
        >
            {children}
        </ScrollView>
    );
}