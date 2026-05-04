import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function VocabularyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>VocabularyScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f1a',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});
