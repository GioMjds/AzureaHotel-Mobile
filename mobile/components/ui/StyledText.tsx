import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

type FontVariant =
	| 'playfair-regular'
	| 'playfair-medium'
	| 'playfair-semibold'
	| 'playfair-bold'
	| 'playfair-extrabold'
	| 'playfair-black'
	| 'montserrat-regular'
	| 'montserrat-bold'
	| 'raleway-regular'
	| 'raleway-bold'
	| 'system';

interface StyledTextProps extends RNTextProps {
	variant?: FontVariant;
}

const FONT_MAP: Record<FontVariant, string> = {
	'playfair-regular': 'PlayfairDisplay_400Regular',
	'playfair-medium': 'PlayfairDisplay_500Medium',
	'playfair-semibold': 'PlayfairDisplay_600SemiBold',
	'playfair-bold': 'PlayfairDisplay_700Bold',
	'playfair-extrabold': 'PlayfairDisplay_800ExtraBold',
	'playfair-black': 'PlayfairDisplay_900Black',
	'montserrat-regular': 'Montserrat_400Regular',
	'montserrat-bold': 'Montserrat_700Bold',
	'raleway-regular': 'Raleway_400Regular',
	'raleway-bold': 'Raleway_700Bold',
	system: '',
};

export default function StyledText({
	variant = 'system',
	style,
	children,
	...rest
}: StyledTextProps) {
	const fontFamily = variant === 'system' ? undefined : FONT_MAP[variant];

	return (
		<RNText {...rest} style={[fontFamily ? { fontFamily } : {}, style]}>
			{children}
		</RNText>
	);
}

