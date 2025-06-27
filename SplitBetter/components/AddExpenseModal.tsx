import React, {useState} from 'react';
import {addExpense} from '../utils/firestore';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Modal} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Dummy variables
const categories = ["Transport", "Food", "Entertainment", "Others"];
const participants = [
  { id: '1', name: 'John (Me)' },
  { id: '2', name: 'Tim' },
];

const currencies = [
    { code: 'SGD', label: 'SGD $' },
    { code: 'USD', label: 'USD $' },
    { code: 'EUR', label: 'EURO €' },
    { code: 'JPY', label: 'YEN ¥' },
    { code: 'GBP', label: 'GBP £' },
  ];

export default function AddExpense() {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(currencies[0]);
    const [currencyModal, setCurrencyModal] = useState(false);

    const [category, setCategory] = useState('');
    const [categoryModal, setCategoryModal] = useState(false);

    const [paidBy, setPaidBy] = useState(participants[0].name);
    const [paidByModal, setPaidByModal] = useState(false);

    const [splitType, setSplitType] = useState("Equally");
    const [splitTypeModal, setSplitTypeModal] = useState(false);

    const [selectedParticipants, setSelectedParticipants] = useState(participants.map(p => p.id));
    const [loading, setLoading] = useState(false);

    const toggleParticipants = (id: string) => {
        setSelectedParticipants(selected => 
            selected.includes(id)
            ? selected.filter(pid => pid != id) // If already selected remove from array
            : [...selected, id]); // If not selected add to the array
    }
    
    // const handleAddExpense = () => {
    //     setLoading(true);
    //     try {
    //         await addExpense(splitId, {
    //           title,
    //           amount: parseFloat(amount),
    //           currency: currency.code,
    //           category,
    //           paidBy,
    //           participants: selectedParticipants,
    //           splitType,
    //         });
    //         alert('Expense added!');
    //         // Optionally clear/reset form or navigate away here
    //     }catch (error) {
    //         alert("Failed to add expense");
    //         console.error(error);
    //     } finally {
    //         setLoading(false);
    //     }
    // }

    return (
       <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity>
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
                    <TextInput style={styles.titleInput} placeholder="E.g Drinks" value={title} onChangeText={setTitle} />
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
                    <TextInput style={styles.titleInput} placeholder='0.00' value={amount} keyboardType="decimal-pad" onChangeText={setAmount} />
                </View>
            </View>

            {/* Currency Modal */} 
            <Modal visible={currencyModal} transparent animationType='slide'>
                <TouchableOpacity style={styles.modalOverlay} onPress={() =>setCurrencyModal(false)} activeOpacity={10}>
                    <View style={styles.modalBox}>
                        {currencies.map(cur => (
                            <TouchableOpacity key={cur.code} style={styles.modalItem} onPress={() => {setCurrency(cur), setCurrencyModal(false)}}>
                                <Text style={{fontSize: 18}}>{cur.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Category */}
            <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity style={styles.dropDown} onPress={() => setCategoryModal(true)}>
                    <Text style={styles.dropDownText}>{category}</Text>
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
                    <Text style={styles.dropDownText}>{paidBy}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            </View>
            
            {/* Paid By Modal */}
            <Modal visible={paidByModal} transparent animationType='slide'>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setPaidByModal(false)} activeOpacity={1}>
                    <View style={styles.modalBox}>
                        {participants.map(p => (
                            <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => {setPaidBy(p.name), setPaidByModal(false)}}>
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
                            {/* Can add more split types in the future */}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* List of people in Split */}
                {participants.map(p => (
                    <TouchableOpacity key={p.id} style={[styles.participantRow, selectedParticipants.includes(p.id) && styles.participantRowSelected]} onPress={() => toggleParticipants(p.id)}>
                        <Text style={styles.checkbox}>
                            {selectedParticipants.includes(p.id) ? "tick" : "No Tick"}
                        </Text>
                        <Text style={styles.participantName}>{p.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Add Expense Button */}
            <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>Add Expenses</Text>
            </TouchableOpacity>

        </ScrollView>

       </View>
    )
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#fff'},
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
    dropDown: {flexDirection: 'row', alignItems:'center',justifyContent:'space-between', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal:16, paddingVertical: 14 },
    dropDownText: { fontSize: 18 },
    splitsHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
    splitTypeButton: {flexDirection: 'row', alignItems:'center', gap: 4},
    addButton: {backgroundColor: '#4169E1', borderRadius: 12, paddingVertical: 16, marginHorizontal: 20, marginBottom: 40, alignItems: 'center'},
    addButtonText: {fontSize: 18, fontWeight: 600, color: '#fff'},
    participantRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: 'white' },
    participantRowSelected: { backgroundColor: '#eef5ff', borderColor: '#4169E1' },
    checkbox: { marginRight: 8, fontSize: 18 },
    participantName: { fontSize: 16, color: '#333' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: 'white', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
