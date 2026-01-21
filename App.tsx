import './src/utils/polyfills';
import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AudioService } from './src/services/AudioService';

export default function App() {
  useEffect(() => {
    AudioService.initialize();
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

registerRootComponent(App);
