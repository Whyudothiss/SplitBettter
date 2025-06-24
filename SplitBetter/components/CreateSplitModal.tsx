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
  SafeAreaView
} from 'react-native';

interface CreateSplitModalProps {
  visible: boolean;
  onClose: () => void;
}

const currencyOptions = ['Singapore Dollar', 'US Dollar', 'Euro', 'Japanese Yen', 'British Pound'];

export default function CreateSplitModal({ visible, onClose }: CreateSplitModalProps) {
  const [slideAnim] = useState(new Animated.Value(300));
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [participants, setParticipants] = useState(['']);

  const [selectedCurrency, setSelectedCurrency] = useState('Singapore Dollar');
  const [currencyDropdownVisible, setCurrencyDropdownVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const addParticipant = () => {
    setParticipants([...participants, '']);
  };

  const updateParticipant = (index: number, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = value;
    setParticipants(newParticipants);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      const newParticipants = participants.filter((_, i) => i !== index);
      setParticipants(newParticipants);
    }
  };

  const handleCreateSplit = () => {
    console.log('Creating split:', { title, budget, selectedCurrency, participants });
    closeModal();
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
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Add Splits</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g. Japan Trip"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Currency Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Currency</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setCurrencyDropdownVisible(!currencyDropdownVisible)}
                >
                  <Text style={styles.dropdownText}>{selectedCurrency}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {currencyDropdownVisible && (
                  <View style={styles.dropdownMenu}>
                    {currencyOptions.map((currency) => (
                      <TouchableOpacity
                        key={currency}
                        onPress={() => {
                          setSelectedCurrency(currency);
                          setCurrencyDropdownVisible(false);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text>{currency}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Budget */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Budget</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E.g. 100"
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                />
              </View>

              {/* Participants */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Participants</Text>
                {participants.map((participant, index) => (
                  <View key={index} style={styles.participantRow}>
                    <TextInput
                      style={[styles.textInput, styles.participantInput]}
                      placeholder="Participant Name"
                      value={participant}
                      onChangeText={(value) => updateParticipant(index, value)}
                    />
                    {index === 0 && (
                      <View style={styles.meTag}>
                        <Text style={styles.meTagText}>Me</Text>
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addParticipantButton} onPress={addParticipant}>
                  <Text style={styles.addParticipantText}>Add Another Participant</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Create Button */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateSplit}>
                <Text style={styles.createButtonText}>Create Split</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
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
    width: 50, // To balance the header
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
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  participantInput: {
    flex: 1,
  },
  meTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },
  meTagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addParticipantButton: {
    marginTop: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addParticipantText: {
    color: '#007AFF',
    fontSize: 16,
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
});