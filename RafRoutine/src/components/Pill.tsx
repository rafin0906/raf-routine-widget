/**
 * Pill — a small rounded label chip used for "AI", status tags, and type
 * badges. Colors default to a translucent neutral chip; override via props.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {tokens} from '../theme/tokens';

export interface PillProps {
  text: string;
  /** Text color. Defaults to a soft secondary tone. */
  color?: string;
  /** Background color. Defaults to a translucent white chip. */
  bg?: string;
}

function Pill({text, color, bg}: PillProps): React.JSX.Element {
  return (
    <View style={[styles.pill, bg ? {backgroundColor: bg} : null]}>
      <Text
        style={[styles.text, {color: color ?? tokens.text.secondary}]}
        numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default Pill;
