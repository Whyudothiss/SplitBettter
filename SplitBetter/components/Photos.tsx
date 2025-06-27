import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface PhotosProps {
  splitId: string;
}

export default function Photos({ splitId }: PhotosProps) {
  const handleAddPhotos = () => {
    // TODO: Implement photo upload functionality
    console.log('Add photos for split:', splitId);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Photo Icon */}
          <View style={styles.photoIconContainer}>
            <View style={styles.photoIcon}>
              <View style={styles.mountain1} />
              <View style={styles.mountain2} />
              <View style={styles.sun} />
            </View>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Start sharing Photos</Text>
        </View>

        {/* Add Photos Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddPhotos}>
            <Text style={styles.addButtonText}>Add Photos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40, // Increased top padding
    paddingBottom: 60, // Increased bottom padding for better spacing
  },
  content: {
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    minHeight: 300, // Reduced height for better button positioning
  },
  photoIconContainer: {
    marginBottom: 30
  },
  photoIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#999',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mountain1: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 16,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#999',
    position: 'absolute',
    bottom: 8,
    left: 12
  },
  mountain2: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 14,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#999',
    position: 'absolute',
    bottom: 8,
    right: 8
  },
  sun: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
    position: 'absolute',
    top: 12,
    right: 12
  },
  title: { 
    fontSize: 18, 
    fontWeight: '500', 
    color: '#999',
    textAlign: 'center'
  },
  buttonContainer: {
    marginTop: 30, // Reduced margin for better positioning
    paddingHorizontal: 20, // Added horizontal padding for better button visibility
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 18, // Slightly increased padding for better visibility
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3, // Added shadow for better visibility on Android
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});