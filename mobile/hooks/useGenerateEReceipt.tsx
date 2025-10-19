import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Linking } from 'react-native';
import { Paths, File as FileSystemFile, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { booking } from '@/services/Booking';

export const useGenerateEReceipt = () => {
    const mutation = useMutation<any, any, string>({
        mutationFn: async (bookingId: string) => {
            return await booking.generateEReceipt(bookingId);
        },
        onSuccess: async (response: any, bookingId?: string) => {
            try {
                const responseData = response?.data ?? response;

                // Helper function to save and share PDF
                const saveAndSharePDF = async (
                    base64String: string,
                    filename = `Azurea_E-Receipt_${bookingId || Date.now()}.pdf`
                ) => {
                    try {
                        // Clean base64 string (remove data URI prefix if present)
                        const cleaned = base64String.indexOf('base64,') >= 0
                            ? base64String.split('base64,')[1]
                            : base64String;

                        // Create directory and file references using new API
                        const receiptsDir = new Directory(Paths.document, 'receipts');
                        const pdfFile = new FileSystemFile(receiptsDir, filename);

                        try {
                            await receiptsDir.create();
                        } catch (dirError: any) {
                            console.warn('Directory creation note:', dirError);
                        }

                        // Write the base64 PDF to file
                        console.log('Writing PDF to:', pdfFile.uri);
                        
                        // Convert base64 to binary data
                        const binaryString = atob(cleaned);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        
                        // Write using the new API
                        const writeStream = pdfFile.writableStream();
                        const writer = writeStream.getWriter();
                        await writer.write(bytes);
                        await writer.close();

                        console.log('E-Receipt saved successfully:', pdfFile.uri);

                        // Show success message with file location
                        Alert.alert(
                            '✓ E-Receipt Downloaded',
                            `Your e-receipt has been successfully downloaded and saved to your device.\n\n📄 File: ${filename}\n📁 Location: Documents/receipts\n\nYou can access it anytime from your Files app.`,
                            [
                                {
                                    text: 'Share File',
                                    onPress: async () => {
                                        try {
                                            const available = await Sharing.isAvailableAsync();
                                            if (available) {
                                                await Sharing.shareAsync(pdfFile.uri, {
                                                    mimeType: 'application/pdf',
                                                    dialogTitle: 'Share E-Receipt',
                                                    UTI: 'com.adobe.pdf',
                                                });
                                                console.log('E-Receipt shared successfully');
                                            } else {
                                                Alert.alert('Info', 'Sharing is not available on this device');
                                            }
                                        } catch (error) {
                                            console.error('Error sharing file:', error);
                                            Alert.alert('Share Error', 'Could not share the file');
                                        }
                                    }
                                },
                                {
                                    text: 'OK',
                                    onPress: () => console.log('E-Receipt saved'),
                                    style: 'default'
                                }
                            ]
                        );

                    } catch (error: any) {
                        console.error('PDF save/share error:', error);
                        
                        // Show user-friendly error message
                        Alert.alert(
                            'E-Receipt Processing Error',
                            `Unable to save receipt locally: ${error.message}\n\nThe receipt was generated successfully on the server. Please check your email or contact support.`,
                            [{ text: 'OK' }]
                        );
                        
                        throw error;
                    }
                };

                // Case 1: Direct data URI string (from backend as base64 data URL)
                if (typeof responseData === 'string' && responseData.startsWith('data:')) {
                    await saveAndSharePDF(responseData, `Azurea_E-Receipt_${bookingId || Date.now()}.pdf`);
                    return;
                }

                // Case 2: URL-based PDF (for web fallback)
                const url = responseData?.url || responseData?.pdf_url;
                if (url && typeof url === 'string' && (url.startsWith('http') || url.startsWith('file'))) {
                    const supported = await Linking.canOpenURL(url);
                    if (supported) {
                        await Linking.openURL(url);
                        Alert.alert('E-Receipt', 'Opening PDF viewer...');
                        return;
                    }
                }

                // Case 3: Common base64 field names
                const base64Fields = [
                    'file_base64',
                    'pdf_base64',
                    'data_base64',
                    'base64',
                    'pdf',
                    'data'
                ];

                for (const field of base64Fields) {
                    const base64Value = responseData?.[field];
                    if (base64Value && typeof base64Value === 'string') {
                        await saveAndSharePDF(base64Value, `Azurea_E-Receipt_${bookingId || Date.now()}.pdf`);
                        return;
                    }
                }

                // Case 4: Binary data (ArrayBuffer from axios)
                if (responseData && (
                    responseData instanceof ArrayBuffer || 
                    (responseData.buffer && responseData.buffer instanceof ArrayBuffer)
                )) {
                    const arrayBuffer = responseData instanceof ArrayBuffer 
                        ? responseData 
                        : responseData.buffer || responseData.data;
                    const bytes = new Uint8Array(arrayBuffer);

                    // Convert binary to base64
                    let binary = '';
                    const chunkSize = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        const chunk = bytes.subarray(i, i + chunkSize);
                        binary += String.fromCharCode.apply(null, Array.from(chunk));
                    }

                    let b64 = '';
                    if (typeof btoa === 'function') {
                        b64 = btoa(binary);
                    } else if (typeof Buffer !== 'undefined') {
                        // @ts-ignore
                        b64 = Buffer.from(binary, 'binary').toString('base64');
                    }

                    if (b64) {
                        await saveAndSharePDF(b64, `Azurea_E-Receipt_${bookingId || Date.now()}.pdf`);
                        return;
                    }
                }

                // Fallback: Show success message if we couldn't process the PDF
                Alert.alert(
                    'E-Receipt Generated',
                    'Your e-receipt has been generated successfully. Please check your email or downloads folder.'
                );

            } catch (err) {
                console.error('E-Receipt handling error:', err);
                Alert.alert(
                    'E-Receipt',
                    'E-Receipt was generated but could not be processed. It may have been sent to your email.'
                );
            }
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || 
                          error?.response?.data?.error ||
                          error?.message || 
                          'Failed to generate e-receipt';
            
            Alert.alert('E-Receipt Error', message);
            console.error('E-Receipt generation error:', error);
        }
    });

    const generate = useCallback(async (bookingId: string) => {
        if (!bookingId) {
            Alert.alert('E-Receipt', 'Invalid booking ID');
            return;
        }

        return mutation.mutateAsync(bookingId);
    }, [mutation]);

    return {
        ...mutation,
        generate,
        isPending: mutation.isPending,
        isLoading: mutation.isPending,
        error: mutation.error,
        isError: mutation.isError,
    };
};