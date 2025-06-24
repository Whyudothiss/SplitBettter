import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {AuthContextProvider} from '../../components/AuthContext'
import { useAuth } from '../../components/AuthContext';
import AuthScreen from '../../components/AuthScreen';
import CreateSplitModal from '../../components/CreateSplitModal'; 
import { View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuth();
  const [showCreateSplitModal, setShowCreateSplitModal] = useState(false);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleAddSplitPress = () => {
    setShowCreateSplitModal(true);
    return false; // Prevent default tab navigation
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          // tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="addsplit"
          options={{
            title: 'Add Split',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.app.fill" color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // Prevent default navigation
              setShowCreateSplitModal(true);
            },
          }}
        />
        <Tabs.Screen
          name="myprofile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>
      
      {/* Add the modal here */}
      <CreateSplitModal
        visible={showCreateSplitModal}
        onClose={() => setShowCreateSplitModal(false)}
      />
    </>
  );
}