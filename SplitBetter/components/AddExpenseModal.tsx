import React, {useState, useEffect} from 'react';
import {addExpense} from '../utils/firestore';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Modal, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/components/AuthContext';
import CurrencyExchange from '../utils/CurrencyExchange';

// Categories data 
const categories = ["Transport", "Food", "Entertainment", "Others"];

const currencies = [
    { code: 'SGD', label: 'SGD $' },
    { code: 'USD', label: 'USD $' },
    { code: 'EUR', label: 'EURO €' },
    { code: 'JPY', label: 'YEN ¥' },
    { code: 'GBP', label: 'GBP £' },
];

interface Participant {
  id: string;
  name: string;
}

interface Split {
  id: string;
  title: string;
  currency: string;
  budget: number;
  participants: string[];
  participantsNames?: Record<string, string>;
  createdAt: any;
}

interface AddExpenseModalProps {
  splitId: string;
  onClose: () => void;
}

export default function AddExpenseModal({ splitId, onClose }: AddExpenseModalProps) {
    const { user } = useAuth();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [split, setSplit] = useState<Split | null>(null);

    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(currencies[0]);
    const [currencyModal, setCurrencyModal] = useState(false);

    const [category, setCategory] = useState('');
    const [categoryModal, setCategoryModal] = useState(false);

    const [paidBy, setPaidBy] = useState('');
    const [paidByModal, setPaidByModal] = useState(false);

    const [splitType, setSplitType] = useState("Equally");
    const [splitTypeModal, setSplitTypeModal] = useState(false);

    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    
    // Currency conversion states
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
    const [conversionRate, setConversionRate] = useState<number | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    // Fetch split data to get actual participants and split currency
    useEffect(() => {
        const fetchSplitData = async () => {
            try {
                const splitDoc = await getDoc(doc(db, 'splits', splitId));
                if (splitDoc.exists()) {
                    const splitData = splitDoc.data() as Split;
                    setSplit({
                        ...splitData,
                        id: splitDoc.id,
                    });
                    
                    // Set default currency to split currency
                    const splitCurrency = currencies.find(c => c.code === splitData.currency);
                    if (splitCurrency) {
                        setCurrency(splitCurrency);
                    }
                    
                    // Create participants array with actual user IDs and names
                    const participantsList: Participant[] = [];
                    
                    if (splitData.participants) {
                        for (const participantId of splitData.participants) {
                            if (participantId === user?.uid) {
                                const userDoc = await getDoc(doc(db, 'users', participantId));
                                let username = user?.email // fallback
                                if (userDoc.exists()) {
                                    const userData = userDoc.data();
                                    username = userData.username
                                }
                                participantsList.push({
                                    id: participantId,
                                    name: username || 'Unknown'
                                });
                            } else {
                                // Fetch user doc
                                const userDoc = await getDoc(doc(db, 'users', participantId));
                                let username = `User ${participantId.slice(0, 6)}`;
                                if (userDoc.exists()) {
                                    const userData = userDoc.data();
                                    username = userData.username || userData.displayName || username;
                                }
                                participantsList.push({
                                    id: participantId,
                                    name: username
                                });
                            }
                        }
                    }
                    
                    setParticipants(participantsList);
                    setSelectedParticipants(participantsList.map(p => p.id));
                    
                    // Set default paid by to current user
                    const currentUserParticipant = participantsList.find(p => p.id === user?.uid);
                    if (currentUserParticipant) {
                        setPaidBy(currentUserParticipant.id); 
                    }
                }
            } catch (error) {
                console.error('Error fetching split data:', error);
            } finally {
                setFetchingData(false);
            }
        };

        if (splitId && user) {
            fetchSplitData();
        }
    }, [splitId, user]);

    // Handle currency conversion when amount or currency changes
    useEffect(() => {
        const performConversion = async () => {
            if (!amount || !split || currency.code === split.currency) {
                setConvertedAmount(null);
                setConversionRate(null);
                return;
            }

            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                setConvertedAmount(null);
                setConversionRate(null);
                return;
            }

            setIsConverting(true);
            try {
                const conversion = await CurrencyExchange.convertCurrency(
                    numAmount,
                    currency.code,
                    split.currency
                );
                setConvertedAmount(conversion.convertedAmount);
                setConversionRate(conversion.conversionRate);
            } catch (error) {
                console.error('Currency conversion error:', error);
                Alert.alert(
                    'Conversion Error',
                    'Failed to convert currency. Please check your internet connection and try again.'
                );
                setConvertedAmount(null);
                setConversionRate(null);
            } finally {
                setIsConverting(false);
            }
        };

        performConversion();
    }, [amount, currency, split]);

    const toggleParticipants = (id: string) => {
        setSelectedParticipants(selected => 
            selected.includes(id)
            ? selected.filter(pid => pid !== id)
            : [...selected, id]
        );
    }
    
    const handleAddExpense = async () => {
        if (!title.trim() || !amount.trim()) {
            Alert.alert('Validation Error', 'Please fill in both title and amount');
            return;
        }

        if (!split) {
            Alert.alert('Error', 'Split data not loaded');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const paidByParticipant = participants.find(p => p.id === paidBy);
            
            // Prepare expense data
            const expenseData: any = {
                title: title.trim(),
                category,
                paidBy: paidBy, // Store user ID
                paidByName: paidByParticipant?.name || 'Unknown', // Store name for display
                participants: selectedParticipants,
                participantCount: selectedParticipants.length,
                splitType,
            };

            // Handle currency conversion
            if (currency.code === split.currency) {
                // No conversion needed
                expenseData.amount = numAmount;
                expenseData.currency = currency.code;
            } else {
                // Conversion needed
                if (convertedAmount === null || conversionRate === null) {
                    Alert.alert('Conversion Error', 'Currency conversion failed. Please try again.');
                    return;
                }
                
                expenseData.amount = convertedAmount; // Amount in split currency
                expenseData.currency = split.currency; // Split currency
                expenseData.originalAmount = numAmount; // Original amount entered by user
                expenseData.originalCurrency = currency.code; // Original currency selected by user
                expenseData.conversionRate = conversionRate; // Rate used for conversion
            }
            
            await addExpense(splitId, expenseData);
            Alert.alert('Success', 'Expense added successfully!');
            
            // Reset form
            setTitle('');
            setAmount('');
            const splitCurrency = currencies.find(c => c.code === split.currency);
            if (splitCurrency) {
                setCurrency(splitCurrency);
            }
            setCategory('');
            const currentUserParticipant = participants.find(p => p.id === user?.uid);
            if (currentUserParticipant) {
                setPaidBy(currentUserParticipant.id);
            }
            setSplitType("Equally");
            setSelectedParticipants(participants.map(p => p.id));
            setConvertedAmount(null);
            setConversionRate(null);
            
            // Close modal
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to add expense. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (fetchingData) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
       <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
                <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Expense</Text>
            <View style={{width: 24}}/>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Title */}
            <View style={styles.section}>
                <Text style={styles.label}>Title</Text>
                <View style={styles.titleInputContainer}>
                    <TextInput 
                        style={styles.titleInput} 
                        placeholder="E.g Drinks" 
                        value={title} 
                        onChangeText={setTitle} 
                    />
                    <TouchableOpacity>
                        <Ionicons name="camera-outline" size={48} color="black" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Amount */}
            <View style={styles.section}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountContainer}>
                    <TouchableOpacity onPress={() => setCurrencyModal(true)} style={styles.currencyBox}>
                        <Text style={styles.currencyText}>{currency.label}</Text>
                        <Ionicons name="chevron-down" size={16} color="#666" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    <TextInput 
                        style={styles.titleInput} 
                        placeholder='0.00' 
                        value={amount} 
                        keyboardType="decimal-pad" 
                        onChangeText={setAmount} 
                    />
                </View>
                
                {/* Currency Conversion Info */}
                {split && currency.code !== split.currency && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                    <View style={styles.conversionInfo}>
                        {isConverting ? (
                            <Text style={styles.conversionText}>Converting...</Text>
                        ) : convertedAmount !== null ? (
                            <Text style={styles.conversionText}>
                                = {split.currency} {convertedAmount.toFixed(2)} (Rate: {conversionRate?.toFixed(4)})
                            </Text>
                        ) : (
                            <Text style={styles.conversionError}>Conversion failed</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Currency Modal */} 
            <Modal visible={currencyModal} transparent animationType='slide'>
                <TouchableOpacity style={styles.modalOverlay} onPress={() =>setCurrencyModal(false)} activeOpacity={1}>
                    <View style={styles.modalBox}>
                        {currencies.map(cur => (
                            <TouchableOpacity key={cur.code} style={styles.modalItem} onPress={() => {setCurrency(cur), setCurrencyModal(false)}}>
                                <Text style={{fontSize: 18}}>{cur.label}</Text>
                                {split && cur.code === split.currency && (
                                    <Text style={styles.splitCurrencyLabel}>(Split Currency)</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Category */}
            <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity style={styles.dropDown} onPress={() => setCategoryModal(true)}>
                    <Text style={styles.dropDownText}>{category || 'Select Category'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            </View>
            
            {/* Category Modal */}
            <Modal visible={categoryModal} transparent animationType='slide'>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setCategoryModal(false)} activeOpacity={1}>
                    <View style={styles.modalBox}>
                        {categories.map(cat => (
                            <TouchableOpacity key={cat} style={styles.modalItem} onPress={() => {setCategory(cat), setCategoryModal(false)}}>
                                <Text style={{fontSize: 18}}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Paid By */}
            <View style={styles.section}>
                <Text style={styles.label}>Paid By</Text>
                <TouchableOpacity style={styles.dropDown} onPress={() => setPaidByModal(true)}>
                    <Text style={styles.dropDownText}>
                        {participants.find(p => p.id === paidBy)?.name || 'Select Participant'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            </View>
            
            {/* Paid By Modal */}
            <Modal visible={paidByModal} transparent animationType='slide'>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setPaidByModal(false)} activeOpacity={1}>
                    <View style={styles.modalBox}>
                        {participants.map(p => (
                            <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => {setPaidBy(p.id), setPaidByModal(false)}}>
                                <Text style={{fontSize: 18}}>{p.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Splits */}
            <View style={styles.section}>
                <View style={styles.splitsHeader}>
                    <Text style={styles.label}>Splits</Text>
                    <TouchableOpacity style={styles.splitTypeButton} onPress={() => setSplitTypeModal(true)}>
                        <Text style={{fontSize: 18}}>{splitType}</Text>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Split Type Modal */}
                <Modal visible={splitTypeModal} transparent animationType='slide'>
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setSplitTypeModal(false)} activeOpacity={1}>
                        <View style={styles.modalBox}>
                            <TouchableOpacity style={styles.modalItem} onPress={() => { setSplitType("Equally"),setSplitTypeModal(false)}}>
                                <Text style={{fontSize: 18}}>Equally</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* List of people in Split */}
                {participants.map(p => (
                    <TouchableOpacity 
                        key={p.id} 
                        style={[styles.participantRow, selectedParticipants.includes(p.id) && styles.participantRowSelected]} 
                        onPress={() => toggleParticipants(p.id)}
                    >
                        <Text style={styles.checkbox}>
                            {selectedParticipants.includes(p.id) ? "✓" : "○"}
                        </Text>
                        <Text style={styles.participantName}>{p.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Add Expense Button */}
            <TouchableOpacity 
                style={[styles.addButton, loading && styles.addButtonDisabled]} 
                onPress={handleAddExpense}
                disabled={loading}
            >
                <Text style={styles.addButtonText}>
                    {loading ? 'Adding Expense...' : 'Add Expense'}
                </Text>
            </TouchableOpacity>

        </ScrollView>

       </View>
    )
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#fff'},
    loadingContainer: {justifyContent: 'center', alignItems: 'center'},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',paddingTop: 60, paddingHorizontal: 20, paddingBottom:20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'},
    headerTitle: {fontSize: 18, fontWeight:'bold', color: '#000'},
    content: {flex: 1, paddingHorizontal: 20},
    section: {marginTop: 30},
    label: {fontSize:18, fontWeight:'semibold', marginBottom:8},
    titleInputContainer: {flexDirection: 'row', alignItems:'center', gap:12},
    titleInput: {flex: 1, borderWidth: 1, borderRadius: 8, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, borderColor: '#e0e0e0'},
    amountContainer: {flexDirection: 'row', gap:12},
    currencyBox: {flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center', paddingHorizontal:12, paddingVertical: 10, backgroundColor: '#fafbfc', marginRight: 4},
    currencyText: {fontSize: 16, color: '#333', marginRight: 2},
    conversionInfo: {marginTop: 8, paddingHorizontal: 4},
    conversionText: {fontSize: 14, color: '#4169E1', fontStyle: 'italic'},
    conversionError: {fontSize: 14, color: '#e74c3c', fontStyle: 'italic'},
    dropDown: {flexDirection: 'row', alignItems:'center',justifyContent:'space-between', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal:16, paddingVertical: 14 },
    dropDownText: { fontSize: 18 },
    splitsHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
    splitTypeButton: {flexDirection: 'row', alignItems:'center', gap: 4},
    addButton: {backgroundColor: '#4169E1', borderRadius: 12, paddingVertical: 16, marginHorizontal: 20, marginBottom: 40, alignItems: 'center'},
    addButtonDisabled: {backgroundColor: '#ccc'},
    addButtonText: {fontSize: 18, fontWeight: '600', color: '#fff'},
    participantRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: 'white' },
    participantRowSelected: { backgroundColor: '#eef5ff', borderColor: '#4169E1' },
    checkbox: { marginRight: 8, fontSize: 18 },
    participantName: { fontSize: 16, color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: 'white', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    splitCurrencyLabel: { fontSize: 14, color: '#4169E1', fontWeight: '500' },
});