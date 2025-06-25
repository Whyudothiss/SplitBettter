import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../components/AuthContext';
import AuthScreen from '../../components/AuthScreen';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  } 

  return (
    <View style={styles.container}>
      {/* Your Profile content */}
      <Text style={styles.profileText}>Welcome, {user?.displayName}</Text>

      {/* Sign Out Button at the bottom */}
      <Pressable style={styles.signOutButton} onPress={handleLogout}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#FF6347',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
