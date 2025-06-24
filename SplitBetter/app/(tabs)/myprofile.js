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
      <Text style={styles.profileText}>Welcome, {user?.name}</Text>

      {/* Sign Out Button at the bottom */}
      <Pressable style={styles.signOutButton} onPress={handleLogout}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,  // This ensures the View takes up full screen
    alignItems: 'center',  // Center the content horizontally
    padding: 20,
  },
  profileText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,  // Add space between the profile info and sign out button
  },
  signOutButton: {
    backgroundColor: '#FF6347', // Red color for the button
    padding: 15,
    borderRadius: 10,
    width: '100%', // Make button take up full width or adjust as needed
    alignItems: 'center', // Center text within button
    marginBottom: 20,  // Add margin for spacing
  },
  signOutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
