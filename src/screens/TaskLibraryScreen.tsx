import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TaskLibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>TaskLibraryScreen</Text>
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
