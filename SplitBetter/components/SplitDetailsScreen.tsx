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
} from 'react-native';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/components/AuthContext';
import AddExpenseModal from './AddExpenseModal';
import BalanceScreen from './BalanceScreen';
import Photos from './Photos';

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
}

interface SplitDetailsScreenProps {
  splitId: string;
  onBack: () => void;
}

type TabType = 'expenses' | 'balance' | 'photos';

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

        // Prefer participantsNames in split doc if present
        if (splitData.participantsNames) {
          setParticipantsNames(splitData.participantsNames);
        } else {
          // Fetch usernames from users collection
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
        
        // Use the amount field which should already be in split currency
        total += expenseData.amount;
        // Only calculate user share if they were invovled
        if (expenseData.participants && expenseData.participants.includes(user?.uid)) {
          const userShareOfExpense = expenseData.amount / expenseData.participants.length;
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

  useEffect(() => {
    fetchSplitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Helper function to render expense amount with original currency info
  const renderExpenseAmount = (expense: Expense) => {
    if (!split) return null;
    
    const displayAmount = `${split.currency}${expense.amount.toFixed(2)}`;
    
    // Show original amount if it was converted
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

  // Inject the participantsNames into split for BalanceScreen
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
          onPress={() => handleTabChange('photos')}
        >
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>Photos</Text>
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
                >
                  <View style={styles.expenseContent}>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expensePaidBy}>
                      Paid by {expense.paidBy === user?.uid ? 'Me' : expense.paidByName || participantsNames[expense.paidBy] || 'Someone'}
                    </Text>
                  </View>
                  {renderExpenseAmount(expense)}
                </TouchableOpacity>
              ))
            )}
            <View style={styles.addButtonContainer}>
              <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
                <Text style={styles.addButtonIcon}>+</Text>
                <Text style={styles.addButtonText}>ADD EXPENSES</Text>
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
       {/* Add this part to check if there is a valid user */}
      {activeTab === 'balance' && user?.uid && (
        <BalanceScreen split={splitWithNames} expenses={expenses} currentUserId={user?.uid}/>
      )}

      {activeTab === 'photos' && (
        <Photos splitId={splitId} />
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#666' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, justifyContent: 'center', backgroundColor: '#e8e8e8', borderRadius: 25, marginHorizontal: 20, padding: 4},
  tab: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2},
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeTabText: { color: '#333' },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 30 },
  summaryCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#e0e0e0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  summaryLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  summaryAmount: { fontSize: 28, fontWeight: 'bold', color: '#333' },
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
  expenseAmountContainer: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 18, fontWeight: '600', color: '#333' },
  originalAmount: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 2, textAlign: 'right'},
  addButtonContainer: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 30 },
  addButton: { backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 25, gap: 10 },
  addButtonIcon: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  addButtonText: { fontSize: 16, color: '#fff', fontWeight: '600', letterSpacing: 1 },
});