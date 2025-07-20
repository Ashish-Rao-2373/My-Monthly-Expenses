import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';

// --- Firebase Configuration ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzaW26R-xgURPY4MyHZDRpAC4TQkkLvZw",
  authDomain: "my-daily-expenses-a0efb.firebaseapp.com",
  projectId: "my-daily-expenses-a0efb",
  storageBucket: "my-daily-expenses-a0efb.firebasestorage.app",
  messagingSenderId: "616308543590",
  appId: "1:616308543590:web:e02fcbad6a7ac3187d9da7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Expense Categories ---
const expenseCategories = [
    "Food & Dining", "Groceries", "Transportation", "Utilities", "Housing",
    "Shopping", "Entertainment", "Health & Fitness", "Personal Care",
    "Education", "Gifts & Donations", "Travel", "Kids", "Pets", "Business", "Miscellaneous"
];

// --- Helper Functions ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];

const getStartOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const getStartOfQuarter = (date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
};
const getEndOfQuarter = (date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
};

// --- React Components ---
const ExpenseForm = ({ userId }) => {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [category, setCategory] = useState(expenseCategories[0]);
    const [amount, setAmount] = useState('');
    const [comments, setComments] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount) || amount <= 0) {
            setMessage({ text: 'Please enter a valid amount.', type: 'error' });
            return;
        }

        try {
            await addDoc(collection(db, `users/${userId}/expenses`), {
                date: Timestamp.fromDate(new Date(date)),
                category,
                amount: parseFloat(amount),
                comments,
                createdAt: Timestamp.now()
            });
            setAmount('');
            setComments('');
            setCategory(expenseCategories[0]);
            setMessage({ text: 'Expense added successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error("Error adding document: ", error);
            setMessage({ text: 'Failed to add expense. Please try again.', type: 'error' });
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-600 mb-1">Date</label>
                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                    <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-600 mb-1">Amount</label>
                    <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" required />
                </div>
                <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-600 mb-1">Comments</label>
                    <textarea id="comments" value={comments} onChange={e => setComments(e.target.value)} placeholder="e.g., Lunch with colleagues" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows="3"></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out transform hover:scale-105">
                    Add Expense
                </button>
                {message.text && (
                    <div className={`p-3 rounded-lg text-center font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.text}
                    </div>
                )}
            </form>
        </div>
    );
};

const MonthlySummary = ({ expenses }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthlyExpenses = useMemo(() => {
        const start = getStartOfMonth(currentMonth);
        const end = getEndOfMonth(currentMonth);
        return expenses.filter(exp => {
            const expDate = exp.date.toDate();
            return expDate >= start && expDate <= end;
        });
    }, [expenses, currentMonth]);

    const totalExpense = useMemo(() => monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0), [monthlyExpenses]);

    const categoryData = useMemo(() => {
        const categoryMap = monthlyExpenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        }, {});
        return Object.entries(categoryMap).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
    }, [monthlyExpenses]);

    const handleMonthChange = (offset) => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(prev.getMonth() + offset);
            return newMonth;
        });
    };
    
    if (expenses.length === 0) {
        return <div className="text-center py-10 text-gray-500">Add an expense to see your monthly summary.</div>;
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg space-y-8">
            <div className="flex justify-between items-center">
                <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            <div className="text-center bg-blue-50 p-6 rounded-lg">
                <p className="text-lg text-blue-800 font-medium">Total Monthly Expense</p>
                <p className="text-4xl font-extrabold text-blue-900 mt-2">${totalExpense.toFixed(2)}</p>
            </div>

            {monthlyExpenses.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">Category Breakdown (Pie)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">Category Breakdown (Bar)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={100} stroke="#333" />
                                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="value" fill="#82ca9d" name="Amount" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <p className="text-center py-10 text-gray-500">No expenses recorded for this month.</p>
            )}
        </div>
    );
};

const Analysis = ({ expenses }) => {
    const [view, setView] = useState('monthly'); // 'monthly' or 'quarterly'
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const yearsWithExpenses = useMemo(() => {
        const years = new Set(expenses.map(e => e.date.toDate().getFullYear()));
        return Array.from(years).sort((a,b) => b-a);
    }, [expenses]);

    const analysisData = useMemo(() => {
        const filteredExpenses = expenses.filter(e => e.date.toDate().getFullYear() === selectedYear);
        
        if (view === 'monthly') {
            const monthlyTotals = Array(12).fill(0).map((_, i) => ({
                name: new Date(selectedYear, i).toLocaleString('default', { month: 'short' }),
                total: 0
            }));
            filteredExpenses.forEach(exp => {
                const month = exp.date.toDate().getMonth();
                monthlyTotals[month].total += exp.amount;
            });
            return monthlyTotals.map(m => ({...m, total: parseFloat(m.total.toFixed(2))}));
        } else { // quarterly
            const quarterlyTotals = Array(4).fill(0).map((_, i) => ({
                name: `Q${i + 1}`,
                total: 0
            }));
            filteredExpenses.forEach(exp => {
                const quarter = Math.floor(exp.date.toDate().getMonth() / 3);
                quarterlyTotals[quarter].total += exp.amount;
            });
            return quarterlyTotals.map(q => ({...q, total: parseFloat(q.total.toFixed(2))}));
        }
    }, [expenses, view, selectedYear]);

    if (expenses.length === 0) {
        return <div className="text-center py-10 text-gray-500">Add an expense to see your analysis.</div>;
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Expense Analysis</h2>
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setView('monthly')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${view === 'monthly' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>
                        Monthly
                    </button>
                    <button onClick={() => setView('quarterly')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${view === 'quarterly' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>
                        Quarterly
                    </button>
                </div>
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 bg-gray-50 border border-gray-300 rounded-lg">
                    {yearsWithExpenses.length > 0 ? yearsWithExpenses.map(y => <option key={y} value={y}>{y}</option>) : <option>{new Date().getFullYear()}</option>}
                </select>
            </div>
            <div className="w-full h-80 md:h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="total" fill="#8884d8" name={`Total Expense by ${view === 'monthly' ? 'Month' : 'Quarter'}`} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


export default function App() {
    const [activeTab, setActiveTab] = useState('add');
    const [expenses, setExpenses] = useState([]);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    const userCredential = await signInAnonymously(auth);
                    setUserId(userCredential.user.uid);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                    setLoading(false);
                }
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!userId) return;

        setLoading(true);
        const q = query(collection(db, `users/${userId}/expenses`));
        const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
            const expensesData = [];
            querySnapshot.forEach((doc) => {
                expensesData.push({ id: doc.id, ...doc.data() });
            });
            setExpenses(expensesData.sort((a, b) => b.date.toDate() - a.date.toDate()));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses:", error);
            setLoading(false);
        });

        return () => unsubscribeFirestore();
    }, [userId]);


    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-20 text-gray-500">Loading your financial data...</div>;
        }
        switch (activeTab) {
            case 'add':
                return <ExpenseForm userId={userId} />;
            case 'summary':
                return <MonthlySummary expenses={expenses} />;
            case 'analysis':
                return <Analysis expenses={expenses} />;
            default:
                return null;
        }
    };

    const TabButton = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 md:flex-initial md:px-6 py-3 text-sm md:text-base font-bold rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 ${activeTab === id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-900">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-4 md:px-6 md:py-5 flex justify-between items-center">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800">
                        My<span className="text-blue-600">Expenses</span>
                    </h1>
                     {userId && <div className="text-xs text-gray-400 hidden md:block">User ID: {userId}</div>}
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6">
                <div className="bg-white p-2 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-2">
                    <TabButton id="add" label="Add Expense" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>} />
                    <TabButton id="summary" label="Monthly Summary" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} />
                    <TabButton id="analysis" label="Analysis" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>} />
                </div>
                
                <div className="transition-all duration-300">
                    {renderContent()}
                </div>
            </main>
            
            <footer className="text-center py-6 text-sm text-gray-500">
                <p>Built with React & Firebase</p>
                 {userId && <div className="text-xs text-gray-400 mt-2 md:hidden">User ID: {userId}</div>}
            </footer>
        </div>
    );
}
