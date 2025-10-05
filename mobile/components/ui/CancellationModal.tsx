import { 
    View, 
    Text, 
    Modal, 
    TouchableOpacity, 
    TextInput, 
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator
} from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
    title: string;
    description: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    confirmButtonText: string;
    reasons: string[];
    isSubmitting?: boolean;
}

const CancellationModal = ({ 
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    reasonLabel,
    reasonPlaceholder,
    confirmButtonText,
    reasons,
    isSubmitting = false
}: CancellationModalProps) => {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

    const handleReasonSelect = (reason: string) => {
        if (reason === 'Other (please specify)') {
            setShowCustomInput(true);
            setSelectedReason(reason);
        } else {
            setShowCustomInput(false);
            setSelectedReason(reason);
            setCustomReason('');
        }
    };

    const handleConfirm = async () => {
        const finalReason = selectedReason === 'Other (please specify)' 
            ? customReason 
            : selectedReason;
        
        if (!finalReason.trim()) {
            return;
        }

        await onConfirm(finalReason);
        resetModal();
    };

    const resetModal = () => {
        setSelectedReason('');
        setCustomReason('');
        setShowCustomInput(false);
    };

    const handleClose = () => {
        if (!isSubmitting) {
            resetModal();
            onClose();
        }
    };

    const isDisabled = !selectedReason || (showCustomInput && !customReason.trim()) || isSubmitting;

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={isSubmitting ? undefined : Keyboard.dismiss}>
                <View 
                    className="flex-1 justify-center items-center px-4"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                >
                    <TouchableWithoutFeedback>
                        <View className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                            {/* Header */}
                            <View className="bg-red-50 px-6 py-4 border-b border-red-100">
                                <View className="flex-row items-center space-x-3">
                                    <Ionicons name="warning" size={24} color="#dc2626" />
                                    <Text className="text-2xl font-playfair-bold text-red-800">
                                        {title}
                                    </Text>
                                </View>
                                <Text className="text-red-600 font-montserrat mt-2">
                                    {description}
                                </Text>
                            </View>

                            {/* Content */}
                            <ScrollView 
                                className="max-h-96"
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={!isSubmitting}
                            >
                                <View className="p-6 space-y-4">
                                    <Text className="text-lg font-montserrat-bold text-gray-900">
                                        {reasonLabel}
                                    </Text>
                                    
                                    {/* Reason Options */}
                                    <View className="space-y-2">
                                        {reasons.map((reason, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                className={`flex-row items-center space-x-3 p-3 rounded-lg border ${
                                                    selectedReason === reason 
                                                        ? 'bg-violet-50 border-violet-300' 
                                                        : 'bg-gray-50 border-gray-200'
                                                } ${isSubmitting ? 'opacity-50' : ''}`}
                                                onPress={() => !isSubmitting && handleReasonSelect(reason)}
                                                disabled={isSubmitting}
                                            >
                                                <Text className={`font-montserrat flex-1 ${
                                                    selectedReason === reason 
                                                        ? 'text-violet-900' 
                                                        : 'text-gray-700'
                                                }`}>
                                                    {reason}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Custom Reason Input */}
                                    {showCustomInput && (
                                        <View className="space-y-2">
                                            <Text className="text-sm font-montserrat-bold text-gray-700">
                                                Please specify your reason
                                            </Text>
                                            <TextInput
                                                className={`bg-gray-50 border border-gray-300 rounded-lg p-4 font-montserrat text-gray-900 min-h-[100px] text-left align-top ${
                                                    isSubmitting ? 'opacity-50' : ''
                                                }`}
                                                placeholder={reasonPlaceholder}
                                                placeholderTextColor="#9ca3af"
                                                multiline
                                                textAlignVertical="top"
                                                value={customReason}
                                                onChangeText={setCustomReason}
                                                editable={!isSubmitting}
                                            />
                                        </View>
                                    )}

                                    {/* Loading Indicator */}
                                    {isSubmitting && (
                                        <View className="flex-row items-center justify-center space-x-2 py-2">
                                            <ActivityIndicator size="small" color="#6F00FF" />
                                            <Text className="text-violet-600 font-montserrat">
                                                Processing cancellation...
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>

                            {/* Footer Actions */}
                            <View className="flex-row border-t border-gray-200 px-6 py-4 space-x-4">
                                <TouchableOpacity
                                    className={`flex-1 bg-gray-100 border-black border active:bg-gray-200 py-3 px-4 rounded-xl items-center ${
                                        isSubmitting ? 'opacity-50' : ''
                                    }`}
                                    onPress={handleClose}
                                    disabled={isSubmitting}
                                >
                                    <Text className="text-gray-700 font-montserrat-bold">
                                        Go Back
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`flex-1 py-3 px-4 rounded-xl border-black border items-center ${
                                        isDisabled
                                            ? 'bg-gray-300' 
                                            : 'bg-red-600 active:bg-red-700'
                                    }`}
                                    onPress={handleConfirm}
                                    disabled={isDisabled}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className={`font-montserrat-bold ${
                                            isDisabled
                                                ? 'text-gray-500' 
                                                : 'text-white'
                                        }`}>
                                            {confirmButtonText}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default CancellationModal;