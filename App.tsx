import './src/utils/polyfills';
import { registerRootComponent } from 'expo';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AudioService } from './src/services/AudioService';
import { Logger } from './src/services/Logger';

export default function App() {
  useEffect(() => {
    AudioService.initialize().catch((error) => {
      Logger.error('Audio initialization failed', Logger.fromError(error));
    });
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

registerRootComponent(App);
