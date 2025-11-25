import { useMutation } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import * as SecureStore from 'expo-secure-store';
import { Logger } from '@/configs/logger';

const logger = Logger.getInstance({ context: 'useForgotPassword' });

// SecureStore keys
const RESET_EMAIL_KEY = 'reset_email';

export function useForgotPassword() {
    // Send forgot password OTP
    const forgotPasswordMutation = useMutation({
        mutationFn: async (email: string) => {
            return await auth.forgotPassword(email);
        },
        onSuccess: async (data, variables) => {
            await SecureStore.setItemAsync(RESET_EMAIL_KEY, variables);
        },
        onError: (error) => {
            throw error;
        },
    });

    // Verify reset OTP
    const verifyResetOtpMutation = useMutation({
        mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
            return await auth.verifyResetOtp(email, otp);
        },
        onSuccess: (data) => {
            logger.info('Reset OTP verified successfully');
        },
        onError: (error) => {
            throw error;
        },
    });

    // Reset password
    const resetPasswordMutation = useMutation({
        mutationFn: async ({ 
            email, 
            newPassword, 
            confirmNewPassword 
        }: { 
            email: string; 
            newPassword: string; 
            confirmNewPassword: string;
        }) => {
            return await auth.resetPassword(email, newPassword, confirmNewPassword);
        },
        onSuccess: async () => {
            await SecureStore.deleteItemAsync(RESET_EMAIL_KEY);
        },
        onError: (error) => {
            throw error;
        },
    });

    // Helper to get stored email
    const getStoredEmail = async () => {
        try {
            return await SecureStore.getItemAsync(RESET_EMAIL_KEY);
        } catch (error) {
            throw error;
        }
    };

    return {
        forgotPasswordMutation,
        verifyResetOtpMutation,
        resetPasswordMutation,
        getStoredEmail,
    };
}
