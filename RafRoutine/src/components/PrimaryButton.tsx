/**
 * PrimaryButton — a pressable action button.
 *
 * variant 'solid' = warm accent fill with dark text.
 * variant 'ghost' = translucent surface with light text.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {tokens} from '../theme/tokens';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

function PrimaryButton({
  title,
  onPress,
  variant = 'solid',
  loading = false,
  disabled = false,
}: PrimaryButtonProps): React.JSX.Element {
  const isSolid = variant === 'solid';
  const isDisabled = disabled || loading;
  const textColor = isSolid ? tokens.text.onGradientDark : tokens.text.body;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled, busy: loading}}
      style={({pressed}) => [
        styles.base,
        isSolid ? styles.solid : styles.ghost,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} style={styles.spinner} />
        ) : null}
        <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solid: {
    backgroundColor: tokens.accent.warm,
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: tokens.card.border,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default PrimaryButton;
