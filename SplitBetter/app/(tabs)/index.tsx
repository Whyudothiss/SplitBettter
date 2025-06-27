import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/components/AuthContext';
import CreateSplitModal from '@/components/CreateSplitModal';
import SplitDetailsScreen from '@/components/SplitDetailsScreen';

interface Split {
  id: string;
  title: string;
  currency: string;
  budget: number;
  participants: string[];
  createdAt: any;
}

function HomeScreen() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch splits from Firebase
  const fetchSplits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let splitsData: Split[] = [];
      
      // Try different query strategies in order of preference
      try {
        // Strategy 1: Get splits where user is a participant (with ordering)
        const splitsQuery = query(
          collection(db, 'splits'),
          where('participants', 'array-contains', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(splitsQuery);
        querySnapshot.forEach((doc) => {
          splitsData.push({
            id: doc.id,
            ...doc.data()
          } as Split);
        });
        
        console.log('Successfully fetched splits with participants query');
      } catch (participantsError) {
        console.log('Participants query failed, trying createdBy query...');
        
        try {
          // Strategy 2: Get splits created by user (with ordering)
          const createdByQuery = query(
            collection(db, 'splits'),
            where('createdBy', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          
          const querySnapshot = await getDocs(createdByQuery);
          querySnapshot.forEach((doc) => {
            splitsData.push({
              id: doc.id,
              ...doc.data()
            } as Split);
          });
          
          console.log('Successfully fetched splits with createdBy query');
        } catch (createdByError) {
          console.log('CreatedBy query failed, trying simple queries...');
          
          // Strategy 3: Simple queries without ordering
          try {
            // Try participants without ordering
            const simpleParticipantsQuery = query(
              collection(db, 'splits'),
              where('participants', 'array-contains', user.uid)
            );
            
            const querySnapshot = await getDocs(simpleParticipantsQuery);
            querySnapshot.forEach((doc) => {
              splitsData.push({
                id: doc.id,
                ...doc.data()
              } as Split);
            });
            
            console.log('Successfully fetched splits with simple participants query');
          } catch (simpleParticipantsError) {
            console.log('Simple participants query failed, trying createdBy without ordering...');
            
            try {
              // Try createdBy without ordering
              const simpleCreatedByQuery = query(
                collection(db, 'splits'),
                where('createdBy', '==', user.uid)
              );
              
              const querySnapshot = await getDocs(simpleCreatedByQuery);
              querySnapshot.forEach((doc) => {
                splitsData.push({
                  id: doc.id,
                  ...doc.data()
                } as Split);
              });
              
              console.log('Successfully fetched splits with simple createdBy query');
            } catch (simpleCreatedByError) {
              console.log('All specific queries failed, trying to fetch all splits...');
              
              // Strategy 4: Get all splits and filter client-side
              const allSplitsQuery = collection(db, 'splits');
              const querySnapshot = await getDocs(allSplitsQuery);
              
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Filter on client side
                if (data.participants?.includes(user.uid) || data.createdBy === user.uid) {
                  splitsData.push({
                    id: doc.id,
                    ...data
                  } as Split);
                }
              });
              
              console.log('Successfully fetched and filtered all splits');
            }
          }
        }
      }
      
      // Sort client-side by createdAt if we have the data
      splitsData.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return 0;
      });
      
      setSplits(splitsData);
      
    } catch (error) {
      console.error('All queries failed:', error);
      setSplits([]); // Set empty array if everything fails
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSplits();
  }, [user]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchSplits();
  };

  // Handle split creation
  const handleSplitCreated = () => {
    fetchSplits(); // Refresh the list when a new split is created
  };

  // Handle split press (navigate to split details)
  const handleSplitPress = (split: Split) => {
    setSelectedSplitId(split.id);
  };

  // Handle back from split details
  const handleBackFromSplitDetails = () => {
    setSelectedSplitId(null);
  };

  // Render split item
  const renderSplitItem = (split: Split) => (
    <TouchableOpacity 
      key={split.id} 
      style={styles.tripButton}
      onPress={() => handleSplitPress(split)}
    >
      <View style={styles.splitContent}>
        <Text style={styles.tripButtonText}>{split.title}</Text>
        <Text style={styles.splitSubtitle}>
          {split.currency} {split.budget} • {split.participants.length} participants
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading splits...</Text>
      </View>
    );
  }

  // Show split details if a split is selected
  if (selectedSplitId) {
    return (
      <SplitDetailsScreen 
        splitId={selectedSplitId} 
        onBack={handleBackFromSplitDetails}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SplitBetter</Text>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {splits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No splits yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Create your first split to start tracking expenses with friends!
            </Text>
          </View>
        ) : (
          splits.map(renderSplitItem)
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.navIcon}>➕</Text>
          <Text style={styles.navLabel}>ADD SPLITS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Create Split Modal */}
      <CreateSplitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSplitCreated={handleSplitCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginTop: 80,
    marginBottom: 20,
    textAlign: 'center',
    color: '#4169E1',
    fontSize: 34,
    fontWeight: 'bold'
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tripButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  splitContent: {
    flex: 1,
  },
  tripButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  splitSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#4169E1',
  },
});

export default HomeScreen;