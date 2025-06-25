import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { createSplit } from '../utils/firestore'; 
import { collection, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from './AuthContext';

interface CreateSplitModalProps {
  visible: boolean;
  onClose: () => void;
  onSplitCreated?: () => void; // Optional callback for when split is created
}

interface User {
  uid: string;
  username?: string;
  email?: string;
}

const currencyOptions = [
  { label: 'Singapore Dollar', code: 'SGD' },
  { label: 'US Dollar', code: 'USD' },
  { label: 'Euro', code: 'EUR' },
  { label: 'Japanese Yen', code: 'JPY' },
  { label: 'British Pound', code: 'GBP' }
];

export default function CreateSplitModal({ visible, onClose, onSplitCreated }: CreateSplitModalProps) {
  const [slideAnim] = useState(new Animated.Value(300));
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions[0]);
  const [currencyDropdownVisible, setCurrencyDropdownVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Add participant search modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!visible || !user) return;
    setTitle('');
    setBudget('');
    setSelectedCurrency(currencyOptions[0]);
    setCurrencyDropdownVisible(false);
    setIsLoading(false);
    setSelectedUserIds([user.uid]); // ensure user is always selected
    setSelectedParticipants([]);

    // Slide up animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setLoadingUsers(true);
    getDocs(collection(db, 'users')).then(snapshot => {
      const users = snapshot.docs
        .map(doc => ({ ...doc.data(), uid: doc.id }))
        .filter(u => u.uid !== user.uid); // prevent selecting ownself again
      setAllUsers(users);
      setLoadingUsers(false);
    });
  }, [visible, user]);

  useEffect(() => {
    if (searchText.trim().length === 0) {
      setFilteredUsers([]);
      return;
    }
    const lowered = searchText.toLowerCase();
    const results = allUsers.filter(
      u =>
        ((u.username && u.username.toLowerCase().includes(lowered)) ||
        (u.email && u.email.toLowerCase().includes(lowered)))
        && !selectedUserIds.includes(u.uid)
    );
    setFilteredUsers(results);
  }, [searchText, allUsers, selectedUserIds]);

  const closeModal = () => {
    if (isLoading) return; // Prevent closing while loading
    
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };
  const handleRemoveParticipant = (uid: string) => {
    setSelectedParticipants(prev => prev.filter(u => u.uid !== uid));
    setSelectedUserIds(prev => prev.filter(id => id !== uid));
  };

  const addParticipant = (userToAdd: User) => {
    if (!selectedUserIds.includes(userToAdd.uid)) {
      setSelectedParticipants(prev => [...prev, userToAdd]);
      setSelectedUserIds(prev => [...prev, userToAdd.uid]);
    }
  };
  
  const validateForm = () => {
    // If no title
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the split');
      return false;
    }
    
    // If never include budget
    if (!budget.trim() || isNaN(Number(budget)) || Number(budget) <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return false;
    }
    
    // Check if users are correct
    if (!selectedUserIds || selectedUserIds.length === 0) {
      Alert.alert('Error', 'Please add at least one participant');
      return false;
    }
    
    return true;
  };

  const handleCreateSplit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Filter out empty participants
      const splitData = {
        title: title.trim(),
        currency: selectedCurrency.code,
        budget: Number(budget),
        participants: selectedUserIds,
      };

      console.log('Creating split:', splitData);
      
      // Call Firestore function
      const splitId = await createSplit(splitData);
      
      Alert.alert(
        'Success!', 
        'Split created successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSplitCreated) {
                onSplitCreated(); // Refresh the splits list
              }
              closeModal();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error creating split:', error);
      Alert.alert(
        'Error', 
        'Failed to create split. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal animationType="none" transparent={true} visible={visible} onRequestClose={closeModal}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={closeModal} disabled={isLoading}>
                <Text style={[styles.cancelButton, isLoading && styles.disabledText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Splits</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={[styles.textInput, isLoading && styles.disabledInput]}
                  placeholder="E.g. Japan Trip"
                  value={title}
                  onChangeText={setTitle}
                  editable={!isLoading}
                />
              </View>

              {/* Currency Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Currency</Text>
                <TouchableOpacity
                  style={[styles.dropdown, isLoading && styles.disabledInput]}
                  onPress={() => !isLoading && setCurrencyDropdownVisible(!currencyDropdownVisible)}
                  disabled={isLoading}
                >
                  <Text style={styles.dropdownText}>{selectedCurrency.label}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {currencyDropdownVisible && !isLoading && (
                  <View style={styles.dropdownMenu}>
                    {currencyOptions.map((currency) => (
                      <TouchableOpacity
                        key={currency.code}
                        onPress={() => {
                          setSelectedCurrency(currency);
                          setCurrencyDropdownVisible(false);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text>{currency.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Budget */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Budget</Text>
                <TextInput
                  style={[styles.textInput, isLoading && styles.disabledInput]}
                  placeholder="E.g. 100"
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>

              {/* Participants */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Participants</Text>
                <ScrollView horizontal style={{ flexDirection: 'row', marginBottom: 10 }}>
                  {/* Always show yourself as selected */}
                  <View style={[styles.participantChip, { backgroundColor: '#007AFF' }]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Me</Text>
                  </View>
                  {selectedParticipants.map(participant => (
                    <View key={participant.uid} style={styles.participantChip}>
                      <Text style={{ color: '#007AFF' }}>
                        {participant.username || participant.email}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeChip}
                        onPress={() => handleRemoveParticipant(participant.uid)}
                      >
                        <Text style={{ color: '#007AFF', fontWeight: 'bold' }}> × </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addChip}
                    onPress={() => setAddModalVisible(true)}
                  >
                    <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>+ Add Participant</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </ScrollView>

            {/* Create Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.createButton, isLoading && styles.disabledButton]}
                onPress={handleCreateSplit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create Split</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Add Participant Modal */}
        <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
          <View style={styles.searchModalBackdrop}>
            <View style={styles.searchModal}>
              <TextInput
                placeholder="Search username or email"
                value={searchText}
                onChangeText={setSearchText}
                style={styles.searchInput}
              />
              {loadingUsers ? (
                <ActivityIndicator style={{ marginTop: 10 }} />
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                  {filteredUsers.length === 0 && searchText.length > 0 && (
                    <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 20 }}>No users found</Text>
                  )}
                  {filteredUsers.map(user => (
                    <TouchableOpacity
                      key={user.uid}
                      style={styles.searchResult}
                      onPress={() => {
                        addParticipant(user);
                        setAddModalVisible(false);
                        setSearchText('');
                      }}
                    >
                      <Text>{user.username || user.email}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={{ color: '#007AFF', marginTop: 10, textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginTop: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  addChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeChip: {
    marginLeft: 4,
    paddingHorizontal: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 15,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    zIndex: 10,
    elevation: 5,
    marginTop: 5,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  // Loading/Disabled styles
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  disabledText: {
    color: '#999',
  },
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    padding: 20,
    maxHeight: 400
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  searchResult: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  }
});