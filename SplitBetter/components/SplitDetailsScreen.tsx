import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { collection, query, orderBy, getDocs, doc, getDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/components/AuthContext';
import AddExpenseModal from './AddExpenseModal';
import BalanceScreen from './BalanceScreen';

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

interface SplitDetailsScreenProps {
  splitId: string;
  onBack: () => void;
}

type TabType = 'expenses' | 'balance';

export default function SplitDetailsScreen({ splitId, onBack }: SplitDetailsScreenProps) {
  const [split, setSplit] = useState<Split | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [userExpenses, setUserExpenses] = useState(0);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('expenses');
  const [participantsNames, setParticipantsNames] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSplitData = async () => {
    if (!splitId || !user) {
      setLoading(false);
      return;
    }
    try {
      const splitDoc = await getDoc(doc(db, 'splits', splitId));
      let splitData: Split | null = null;
      if (splitDoc.exists()) {
        splitData = {
          ...splitDoc.data(),
          id: splitDoc.id,
        } as Split;
        setSplit(splitData);

        if (splitData.participantsNames) {
          setParticipantsNames(splitData.participantsNames);
        } else {
          const names: Record<string, string> = {};
          await Promise.all(
            splitData.participants.map(async (uid) => {
              try {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  names[uid] = userData.username || userData.name || uid;
                } else {
                  names[uid] = uid;
                }
              } catch {
                names[uid] = uid;
              }
            })
          );
          setParticipantsNames(names);
        }
      }

      const expensesQuery = query(
        collection(db, 'splits', splitId, 'expenses'),
        orderBy('createdAt', 'desc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData: Expense[] = [];
      let total = 0;
      let userShare = 0;

      expensesSnapshot.forEach((doc) => {
        const expenseData = {
          id: doc.id,
          splitId: splitId,
          ...doc.data(),
        } as Expense;
        expensesData.push(expenseData);
        
        total += expenseData.amount;
        
        if (expenseData.participants && expenseData.participants.includes(user?.uid)) {
          let userShareOfExpense = 0;
          
          if (expenseData.splitType === 'Custom' && expenseData.customAmounts) {
            userShareOfExpense = expenseData.customAmounts[user.uid] || 0;
          } else {
            userShareOfExpense = expenseData.amount / expenseData.participants.length;
          }
          
          userShare += userShareOfExpense;
        }
      });

      setExpenses(expensesData);
      setTotalExpenses(total);
      setUserExpenses(userShare);
    } catch (error) {
      console.error('Error fetching split data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'splits', splitId, 'expenses', expense.id));
          setSelectedExpense(null);
          fetchSplitData();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete expense.');
        }
      }}
    ]);
  };

  const handleDeleteSplit = async () => {
    Alert.alert(
      'Delete Split',
      `Are you sure you want to delete "${split?.title}"? This will permanently delete the split and all its expenses. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setIsDeleting(true);
            try {
              const batch = writeBatch(db);
              
              // Delete all expenses in the split
              const expensesQuery = query(collection(db, 'splits', splitId, 'expenses'));
              const expensesSnapshot = await getDocs(expensesQuery);
              
              expensesSnapshot.forEach((expenseDoc) => {
                batch.delete(doc(db, 'splits', splitId, 'expenses', expenseDoc.id));
              });
              
              // Delete the split document itself
              batch.delete(doc(db, 'splits', splitId));
              
              // Commit all deletions in a batch
              await batch.commit();
              
              Alert.alert('Success', 'Split deleted successfully', [
                { text: 'OK', onPress: onBack }
              ]);
            } catch (error) {
              console.error('Error deleting split:', error);
              Alert.alert('Error', 'Failed to delete split. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchSplitData();
  }, [splitId, user]);

  const budgetLeft = split ? split.budget - totalExpenses : 0;

  const handleAddExpense = () => {
    setShowAddExpenseModal(true);
  };

  const handleCloseAddExpenseModal = () => {
    setShowAddExpenseModal(false);
    fetchSplitData();
  };

  const handleTabChange = (tab: TabType) => setActiveTab(tab);

  const renderExpenseAmount = (expense: Expense) => {
    if (!split) return null;
    
    const displayAmount = `${split.currency}${expense.amount.toFixed(2)}`;
    
    if (expense.splitType === 'Custom' && expense.customAmounts && user?.uid) {
      const userAmount = expense.customAmounts[user.uid] || 0;
      return (
        <View style={styles.expenseAmountContainer}>
          <Text style={styles.expenseAmount}>{displayAmount}</Text>
          <Text style={styles.userShareAmount}>
            Your share: {split.currency}{userAmount.toFixed(2)}
          </Text>
          {expense.originalAmount && 
           expense.originalCurrency && 
           expense.originalCurrency !== split.currency && (
            <Text style={styles.originalAmount}>
              (Originally {expense.originalCurrency}{expense.originalAmount.toFixed(2)})
            </Text>
          )}
        </View>
      );
    }
    
    if (expense.originalAmount && 
        expense.originalCurrency && 
        expense.originalCurrency !== split.currency) {
      return (
        <View style={styles.expenseAmountContainer}>
          <Text style={styles.expenseAmount}>{displayAmount}</Text>
          <Text style={styles.originalAmount}>
            (Originally {expense.originalCurrency}{expense.originalAmount.toFixed(2)})
          </Text>
        </View>
      );
    }
    
    return <Text style={styles.expenseAmount}>{displayAmount}</Text>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
        <Text style={styles.loadingText}>Loading split details...</Text>
      </View>
    );
  }

  if (!split) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Split not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Enhanced Expense Details Page (Updated - Scrollable, No Date, No Icon)
  if (selectedExpense) {
    const currencySymbol = selectedExpense.currency === 'SGD' ? 'S$' : selectedExpense.currency;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedExpense(null)} style={styles.backButtonHeader}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedExpense.title}</Text>
          <TouchableOpacity 
            style={styles.editHeaderButton}
            onPress={() => setShowEditModal(true)}
          >
            <Text style={styles.editHeaderText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Expense Title Section */}
          <View style={styles.expenseDetailTitleSection}>
            <Text style={styles.expenseDetailTitle}>{selectedExpense.title}</Text>
          </View>

          {/* Paid By Section */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Paid By</Text>
            <View style={styles.detailParticipantRow}>
              <View style={styles.detailParticipantAvatar}>
                <Text style={styles.detailParticipantInitials}>
                  {getInitials(selectedExpense.paidByName || participantsNames[selectedExpense.paidBy] || 'U')}
                </Text>
              </View>
              <Text style={styles.detailParticipantName}>
                {selectedExpense.paidByName || participantsNames[selectedExpense.paidBy] || selectedExpense.paidBy}
              </Text>
              <View style={styles.detailAmountContainer}>
                <Text style={styles.detailParticipantAmount}>
                  {currencySymbol}{selectedExpense.amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* For Participants Section */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>
              For {selectedExpense.participants?.length || 0} Participants
            </Text>
            {selectedExpense.participants?.map((participantId) => {
              const participantName = participantsNames[participantId] || participantId;
              let participantAmount = 0;
              
              if (selectedExpense.splitType === 'Custom' && selectedExpense.customAmounts) {
                participantAmount = selectedExpense.customAmounts[participantId] || 0;
              } else {
                participantAmount = selectedExpense.amount / selectedExpense.participants.length;
              }

              return (
                <View key={participantId} style={styles.detailParticipantRow}>
                  <View style={styles.detailParticipantAvatar}>
                    <Text style={styles.detailParticipantInitials}>
                      {getInitials(participantName)}
                    </Text>
                  </View>
                  <Text style={styles.detailParticipantName}>{participantName}</Text>
                  <View style={styles.detailAmountContainer}>
                    <Text style={styles.detailParticipantAmount}>
                      {currencySymbol}{participantAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.deleteActionButton}
              onPress={() => handleDeleteExpense(selectedExpense)}
            >
              <Text style={styles.deleteActionButtonText}>Delete Expense</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <AddExpenseModal
            splitId={splitId}
            expense={selectedExpense}
            onClose={() => {
              setShowEditModal(false);
              fetchSplitData();
              setSelectedExpense(null);
            }}
            isEdit={true}
          />
        </Modal>
      </SafeAreaView>
    );
  }

  const splitWithNames = { ...split, participantsNames };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonHeader}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{split.title}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => handleTabChange('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'balance' && styles.activeTab]}
          onPress={() => handleTabChange('balance')}
        >
          <Text style={[styles.tabText, activeTab === 'balance' && styles.activeTabText]}>Balance</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>My Expenses</Text>
              <Text style={styles.summaryAmount}>{split.currency}{userExpenses.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Budget Left</Text>
              <Text style={[styles.summaryAmount, budgetLeft < 0 && styles.negativeAmount]}>
                {split.currency}{budgetLeft.toFixed(2)}
              </Text>
            </View>
          </View>
          <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
            {expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No expenses yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Add your first expense to start tracking!
                </Text>
              </View>
            ) : (
              expenses.map((expense) => (
                <TouchableOpacity
                  key={expense.id}
                  style={[
                    styles.expenseItem,
                    expense.paidBy === user?.uid && styles.userExpenseItem,
                  ]}
                  onPress={() => setSelectedExpense(expense)}
                >
                  <View style={styles.expenseContent}>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expensePaidBy}>
                      Paid by {expense.paidBy === user?.uid ? 'Me' : expense.paidByName || participantsNames[expense.paidBy] || 'Someone'}
                    </Text>
                    {expense.splitType === 'Custom' && (
                      <Text style={styles.splitTypeLabel}>Custom Split</Text>
                    )}
                  </View>
                  {renderExpenseAmount(expense)}
                </TouchableOpacity>
              ))
            )}
            
            {/* Add Expense Button */}
            <View style={styles.addButtonContainer}>
              <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
                <Text style={styles.addButtonIcon}>+</Text>
                <Text style={styles.addButtonText}>ADD EXPENSES</Text>
              </TouchableOpacity>
            </View>

            {/* Delete Split Button */}
            <View style={styles.deleteSplitContainer}>
              <TouchableOpacity 
                style={styles.deleteSplitButton} 
                onPress={handleDeleteSplit}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteSplitButtonText}>Delete Split</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
          <Modal
            visible={showAddExpenseModal}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <AddExpenseModal splitId={splitId} onClose={handleCloseAddExpenseModal} />
          </Modal>
        </>
      )}

      {activeTab === 'balance' && user?.uid && (
        <>
          <BalanceScreen split={splitWithNames} expenses={expenses} currentUserId={user?.uid}/>
          
          {/* Delete Split Button for Balance Tab */}
          <View style={styles.deleteSplitContainerBalance}>
            <TouchableOpacity 
              style={styles.deleteSplitButton} 
              onPress={handleDeleteSplit}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteSplitButtonText}>Delete Split</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  errorText: { fontSize: 18, color: '#666', marginBottom: 20 },
  backButton: { backgroundColor: '#4169E1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#f5f5f5' },
  backButtonHeader: { padding: 5 },
  backArrow: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  headerRight: { width: 34 }, 
  editHeaderButton: { padding: 5 },
  editHeaderText: { fontSize: 16, color: '#4169E1', fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#666' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, justifyContent: 'center', backgroundColor: '#e8e8e8', borderRadius: 25, marginHorizontal: 20, padding: 4},
  tab: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2},
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#333' },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 30 },
  summaryCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  summaryLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  summaryAmount: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  negativeAmount: { color: '#e74c3c' },
  expensesList: { flex: 1, paddingHorizontal: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyStateTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptyStateSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  expenseItem: { backgroundColor: '#fff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 15, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3 },
  userExpenseItem: { borderColor: '#4169E1', borderWidth: 2 },
  expenseContent: { flex: 1 },
  expenseTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
  expensePaidBy: { fontSize: 14, color: '#666' },
  splitTypeLabel: { fontSize: 12, color: '#4169E1', fontWeight: '500', marginTop: 2 },
  expenseAmountContainer: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 18, fontWeight: '600', color: '#333' },
  userShareAmount: { fontSize: 14, color: '#4169E1', fontStyle: 'italic', marginTop: 2, textAlign: 'right' },
  originalAmount: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 2, textAlign: 'right'},
  addButtonContainer: { paddingVertical: 20 },
  addButton: { backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 25, gap: 10 },
  addButtonIcon: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  addButtonText: { fontSize: 16, color: '#fff', fontWeight: '600', letterSpacing: 1 },
  deleteSplitContainer: { paddingVertical: 20, paddingBottom: 30 },
  deleteSplitContainerBalance: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 30 },
  deleteSplitButton: { backgroundColor: '#e74c3c', paddingVertical: 15, borderRadius: 12,  alignItems: 'center', flexDirection: 'row', justifyContent: 'center'},
  deleteSplitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scrollContent: {flex: 1, backgroundColor: '#f5f5f5'},
  expenseDetailTitleSection: {alignItems: 'center', paddingVertical: 30, backgroundColor: '#f5f5f5'},
  expenseDetailTitle: { fontSize: 24, fontWeight: '700',color: '#333'},
  detailSection: {backgroundColor: '#fff', marginHorizontal: 20, marginVertical: 8, borderRadius: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3},
  detailSectionTitle: {fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16},
  detailParticipantRow: {flexDirection: 'row', alignItems: 'center',paddingVertical: 12},
  detailParticipantAvatar: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#4169E1', alignItems: 'center', justifyContent: 'center',marginRight: 16 },
  detailParticipantInitials: {color: '#fff', fontSize: 16, fontWeight: '600'},
  detailParticipantName: {flex: 1, fontSize: 16, fontWeight: '500',color: '#333' },
  detailAmountContainer: {alignItems: 'flex-end'},
  detailParticipantAmount: {fontSize: 18, fontWeight: '700', color: '#333' },
  actionButtonsContainer: {paddingHorizontal: 20, paddingVertical: 20, marginTop: 'auto' },
  deleteActionButton: {backgroundColor: '#e74c3c', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  deleteActionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});