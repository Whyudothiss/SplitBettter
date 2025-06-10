import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../components/AuthContext';
import AuthScreen from '../../components/AuthScreen';

export default function ProfileScreen() {
  const { user, isAuthenticated, signOut, isLoading } = useAuth();

// Show auth screen if not authenticated
if (!isAuthenticated) {
    return <AuthScreen />;
  }
}