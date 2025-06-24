import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '../../components/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  // Redirect to auth if not authenticated
  useEffect(() => {
    console.log('TabLayout useEffect - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    
    // Only redirect when we're sure the user is not authenticated
    if (!isLoading && isAuthenticated === false && !hasRedirected.current) {
      console.log('Redirecting to auth screen...');
      hasRedirected.current = true;
      
      // Use replace to prevent going back to tabs after logout
      router.replace('/');
    }
    
    // Reset the flag when user becomes authenticated
    if (isAuthenticated === true) {
      console.log('User authenticated, resetting redirect flag');
      hasRedirected.current = false;
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth state
  if (isLoading) {
    console.log('TabLayout - showing loading state');
    return null;
  }

  // Don't render tabs if not authenticated
  if (!isAuthenticated) {
    console.log('TabLayout - user not authenticated, returning null');
    return null;
  }

  console.log('TabLayout - rendering tabs for authenticated user');
  
  return (
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
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}