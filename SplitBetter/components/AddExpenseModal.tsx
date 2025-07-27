import React, {useState, useEffect} from 'react';
import {addExpense} from '../utils/firestore';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Modal, Alert} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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

const splitTypes = ["Equally", "Custom"];

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

interface Expense {
    id: string;
    title: string;
    amount: number;
    currency: string;
    originalAmount?: number;
    originalCurrency?: string;
    conversionRate?: number;
    paidBy: string;
    paidByName: string;
    participants: string[];
    participantCount?: number;
    splitId: string;
    createdAt: any;
    splitType?: string;
    customAmounts?: Record<string, number>; 
  }

interface AddExpenseModalProps {
  splitId: string;
  onClose: () => void;
  expense?: Expense;
  isEdit?: boolean;
}

export default function AddExpenseModal({ splitId, onClose, expense, isEdit = false }: AddExpenseModalProps) {
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
    
    // Hold users and their amount paid for custom split
    const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
    
    // Currency conversion states
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
    const [conversionRate, setConversionRate] = useState<number | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    // Populate form fields when editing
    useEffect(() => {
        if (isEdit && expense) {
            setTitle(expense.title);
            
            // Handle amount and currency for editing
            if (expense.originalAmount && expense.originalCurrency) {
                // Use original amount and currency if available
                setAmount(expense.originalAmount.toString());
                const originalCurrency = currencies.find(c => c.code === expense.originalCurrency);
                if (originalCurrency) {
                    setCurrency(originalCurrency);
                }
            } else {
                // Use current amount and currency
                setAmount(expense.amount.toString());
                const expenseCurrency = currencies.find(c => c.code === expense.currency);
                if (expenseCurrency) {
                    setCurrency(expenseCurrency);
                }
            }
            
            setPaidBy(expense.paidBy);
            setSelectedParticipants(expense.participants || []);
            setSplitType(expense.splitType || "Equally");
            
            // Handle custom amounts
            if (expense.splitType === "Custom" && expense.customAmounts) {
                const customAmountsStr: Record<string, string> = {};
                Object.entries(expense.customAmounts).forEach(([id, amount]) => {
                    customAmountsStr[id] = amount.toString();
                });
                setCustomAmounts(customAmountsStr);
            }
        }
    }, [isEdit, expense]);

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
                    
                    // Set default currency to split currency (only for new expenses)
                    if (!isEdit) {
                        const splitCurrency = currencies.find(c => c.code === splitData.currency);
                        if (splitCurrency) {
                            setCurrency(splitCurrency);
                        }
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
                    
                    // Only set default selections for new expenses
                    if (!isEdit) {
                        setSelectedParticipants(participantsList.map(p => p.id));

                        // Initialise custom amounts
                        const initialAmount: Record<string, string> = {};
                        participantsList.forEach(p => {
                            initialAmount[p.id] = ''
                        });
                        setCustomAmounts(initialAmount);

                        // Set default paid by to current user
                        const currentUserParticipant = participantsList.find(p => p.id === user?.uid);
                        if (currentUserParticipant) {
                            setPaidBy(currentUserParticipant.id); 
                        }
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
    }, [splitId, user, isEdit]);

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
    
    // Rest custom amount
    useEffect(() => {
        if (splitType === "Custom") {
            const initialAmount: Record<string, string> ={};
            selectedParticipants.forEach(id => {
                initialAmount[id] = customAmounts[id] || '';
            });
            setCustomAmounts(initialAmount);
        }
    }, [splitType, selectedParticipants]);

    const toggleParticipants = (id: string) => {
        setSelectedParticipants(selected => 
            selected.includes(id)
            ? selected.filter(pid => pid !== id)
            : [...selected, id]
        );
    }
    
    // Updates the custom amount for a specific participant
    const updateCustomAmount = (participantId: string, amount: string) => {
        setCustomAmounts(prev => ({
            ...prev,
            [participantId] : amount
        }));
    }
    
    const calculateCustomTotal = () => {
        return Object.values(customAmounts).reduce((total, amount) => {
            const num = parseFloat(amount || '0');
            return total + (isNaN(num) ? 0 : num);
        }, 0);
    }

    const getExpectedAmount = () => {
        if (currency.code === split?.currency) {
            return parseFloat(amount || '0');
        }
        return convertedAmount || 0;
    }

    const validateCustomSplit = () => {
        if (splitType != 'Custom') return true;

        const total = calculateCustomTotal();
        const expected = getExpectedAmount();

        const difference = Math.abs(total - expected);
        return difference < 0.01
    }
    
    const handleAddExpense = async () => {
        if (!title.trim() || !amount.trim()) {
            Alert.alert('Error', 'Please fill in both title and amount');
            return;
        }

        if (!split) {
            Alert.alert('Error', 'Split data not loaded');
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (splitType === 'Custom') {
            if (!validateCustomSplit()) {
                const total = calculateCustomTotal();
                const expected = getExpectedAmount();
                Alert.alert(
                    'Split Amount Mismatch'
                );
                return;
            }

            // Check to see if all selected participants have amounts
            const missingAmounts = selectedParticipants.filter(id => !customAmounts[id] || parseFloat(customAmounts[id]) <= 0);

            if (missingAmounts.length > 0) {
                Alert.alert('Error');
                return;
            }
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

            if (splitType === "Custom") {
                expenseData.customAmounts = {};
                selectedParticipants.forEach(id => {
                    expenseData.customAmounts[id] = parseFloat(customAmounts[id]);
                });
            }

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
            
            if (isEdit && expense) {
                // Update existing expense
                await updateDoc(doc(db, 'splits', splitId, 'expenses', expense.id), expenseData);
                Alert.alert('Success', 'Expense updated successfully!');
            } else {
                // Add new expense
                await addExpense(splitId, expenseData);
                Alert.alert('Success', 'Expense added successfully!');
            }
            
            // Close modal
            onClose();
        } catch (error) {
            Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'add'} expense. Please try again.`);
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
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
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
                            {splitTypes.map(type => (
                                <TouchableOpacity key={type} style={styles.modalItem} onPress={() => {setSplitType(type); setSplitTypeModal(false);}}>
                                    <Text style={{fontSize: 18}}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>
                {/* Custom Split total Display */}
                {splitType === 'Custom' && amount && (
                    <View style={styles.customSplitInfo}>
                        <Text style={styles.customSplitText}>
                            Total: {calculateCustomTotal().toFixed(2)} / {getExpectedAmount().toFixed(2)}
                        </Text>
                        {!validateCustomSplit() && (
                            <Text style={styles.customSplitError}>Amounts don't match</Text>
                        )}
                    </View>
                )}

                {/* List of people in Split */}
                {participants.map(p => (
                    <View key={p.id} style={{marginBottom: 8}}>
                        <TouchableOpacity 
                            style={[styles.participantRow, selectedParticipants.includes(p.id) && styles.participantRowSelected,
                                    splitType === "Custom" && selectedParticipants.includes(p.id) && styles.participantRowCustom]} 
                            onPress={() => toggleParticipants(p.id)}>
                            <View style={styles.participantInfo}>
                                <Text style={styles.checkbox}>
                                    {selectedParticipants.includes(p.id) ? "✓" : "○"}
                                </Text>
                                <Text style={styles.participantName}>{p.name}</Text>
                            </View>

                            {/* Custom amount input */}
                            {splitType === "Custom" && selectedParticipants.includes(p.id) && (
                                <TextInput
                                    style={styles.customAmountInput}
                                    placeholder="0.00"
                                    value={customAmounts[p.id] || ''}
                                    onChangeText={(value) => updateCustomAmount(p.id, value)}
                                    keyboardType="decimal-pad"
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Add/Update Expense Button */}
            <TouchableOpacity 
                style={[styles.addButton, loading && styles.addButtonDisabled]} 
                onPress={handleAddExpense}
                disabled={loading}
            >
                <Text style={styles.addButtonText}>
                    {loading ? (isEdit ? 'Updating Expense...' : 'Adding Expense...') : (isEdit ? 'Update Expense' : 'Add Expense')}
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
    participantRowCustom: {paddingRight: 16},
    participantInfo: {flexDirection: 'row', alignItems: 'center', flex: 1},
    checkbox: { marginRight: 8, fontSize: 18 },
    participantName: { fontSize: 16, color: '#333', flex:1},
    customAmountContainer: {marginTop: 8, paddingLeft:26},
    customAmountInput: {borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, fontSize: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fafbfc", width:100, textAlign: 'right'},
    customSplitInfo: {backgroundColor:"#f8f9fa", padding: 12, borderRadius: 8, marginBottom: 16},
    customSplitText: {fontSize: 16, fontWeight: '500', color: "#333"},
    customSplitError: {fontSize: 14, color: "#e74c3c", marginTop: 4, fontWeight: '500'},
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: 'white', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    splitCurrencyLabel: { fontSize: 14, color: '#4169E1', fontWeight: '500' },
});