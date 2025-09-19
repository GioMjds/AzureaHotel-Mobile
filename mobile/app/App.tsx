import { useFonts } from '@expo-google-fonts/playfair-display';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_800ExtraBold } from '@expo-google-fonts/playfair-display/800ExtraBold';
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display/900Black';
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic';
import { PlayfairDisplay_500Medium_Italic } from '@expo-google-fonts/playfair-display/500Medium_Italic';
import { PlayfairDisplay_600SemiBold_Italic } from '@expo-google-fonts/playfair-display/600SemiBold_Italic';
import { PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display/700Bold_Italic';
import { PlayfairDisplay_800ExtraBold_Italic } from '@expo-google-fonts/playfair-display/800ExtraBold_Italic';
import { PlayfairDisplay_900Black_Italic } from '@expo-google-fonts/playfair-display/900Black_Italic';
import { View, ActivityIndicator } from 'react-native';
import RootLayout from './_layout'; // Import your main layout

import {
	Raleway_400Regular,
	Raleway_700Bold,
	Raleway_400Regular_Italic,
	Raleway_700Bold_Italic,
} from '@expo-google-fonts/raleway';

import {
	Montserrat_400Regular,
	Montserrat_700Bold,
	Montserrat_400Regular_Italic,
	Montserrat_700Bold_Italic,
} from '@expo-google-fonts/montserrat';

export default function App() {
	const [fontsLoaded] = useFonts({
		PlayfairDisplay_400Regular,
		PlayfairDisplay_500Medium,
		PlayfairDisplay_600SemiBold,
		PlayfairDisplay_700Bold,
		PlayfairDisplay_800ExtraBold,
		PlayfairDisplay_900Black,
		PlayfairDisplay_400Regular_Italic,
		PlayfairDisplay_500Medium_Italic,
		PlayfairDisplay_600SemiBold_Italic,
		PlayfairDisplay_700Bold_Italic,
		PlayfairDisplay_800ExtraBold_Italic,
		PlayfairDisplay_900Black_Italic,
        Raleway_400Regular,
        Raleway_700Bold,
        Raleway_400Regular_Italic,
        Raleway_700Bold_Italic,
        Montserrat_400Regular,
        Montserrat_700Bold,
        Montserrat_400Regular_Italic,
        Montserrat_700Bold_Italic,
	});

	if (!fontsLoaded) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return <RootLayout />;
}
