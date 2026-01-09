// Expense Tracker JavaScript
class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.currentFilter = 'all';
        this.editingId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setDefaultDate();
        this.updateDisplay();
        this.loadTheme();
    }

    bindEvents() {
        // Form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Edit form submission
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTransactions(e.target.value);
        });

        // Clear all button
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllTransactions();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal on backdrop click
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeModal();
            }
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('editDate').value = today;
    }

    addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const type = document.getElementById('type').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !category || !date) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            description,
            amount: Math.abs(amount),
            category,
            type,
            date,
            timestamp: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveToStorage();
        this.updateDisplay();
        this.resetForm();
        this.showNotification('Transaction added successfully!', 'success');
    }

    editTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (!transaction) return;

        this.editingId = id;
        
        // Populate edit form
        document.getElementById('editDescription').value = transaction.description;
        document.getElementById('editAmount').value = transaction.amount;
        document.getElementById('editCategory').value = transaction.category;
        document.getElementById('editType').value = transaction.type;
        document.getElementById('editDate').value = transaction.date;

        // Show modal
        document.getElementById('editModal').classList.add('show');
    }

    saveEdit() {
        const description = document.getElementById('editDescription').value.trim();
        const amount = parseFloat(document.getElementById('editAmount').value);
        const category = document.getElementById('editCategory').value;
        const type = document.getElementById('editType').value;
        const date = document.getElementById('editDate').value;

        if (!description || !amount || !category || !date) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const transactionIndex = this.transactions.findIndex(t => t.id === this.editingId);
        if (transactionIndex === -1) return;

        this.transactions[transactionIndex] = {
            ...this.transactions[transactionIndex],
            description,
            amount: Math.abs(amount),
            category,
            type,
            date
        };

        this.saveToStorage();
        this.updateDisplay();
        this.closeModal();
        this.showNotification('Transaction updated successfully!', 'success');
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveToStorage();
            this.updateDisplay();
            this.showNotification('Transaction deleted successfully!', 'success');
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderTransactions();
    }

    searchTransactions(query) {
        this.renderTransactions(query);
    }

    clearAllTransactions() {
        if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
            this.transactions = [];
            this.saveToStorage();
            this.updateDisplay();
            this.showNotification('All transactions cleared!', 'success');
        }
    }

    updateDisplay() {
        this.updateBalance();
        this.renderTransactions();
        this.updateCategoryStats();
    }

    updateBalance() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const balance = income - expenses;

        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(expenses);
        document.getElementById('totalBalance').textContent = this.formatCurrency(balance);
        
        // Update balance color
        const balanceElement = document.getElementById('totalBalance');
        balanceElement.style.color = balance >= 0 ? '#10b981' : '#ef4444';
    }

    renderTransactions(searchQuery = '') {
        const container = document.getElementById('transactionsList');
        
        let filteredTransactions = this.transactions;
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === this.currentFilter);
        }
        
        // Apply search
        if (searchQuery) {
            filteredTransactions = filteredTransactions.filter(t => 
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filteredTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h4>No transactions found</h4>
                    <p>${searchQuery ? 'Try adjusting your search' : 'Add your first transaction to get started'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas fa-${this.getCategoryIcon(transaction.category)}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-meta">
                        ${this.getCategoryEmoji(transaction.category)} ${this.formatCategory(transaction.category)} • ${this.formatDate(transaction.date)}
                    </div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${this.formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" onclick="expenseTracker.editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="expenseTracker.deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCategoryStats() {
        const categoryTotals = {};
        
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });

        const container = document.getElementById('categoryStats');
        
        if (Object.keys(categoryTotals).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No expense data available</p>';
            return;
        }

        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6);

        container.innerHTML = sortedCategories.map(([category, amount]) => `
            <div class="category-item">
                <span class="category-name">
                    ${this.getCategoryEmoji(category)} ${this.formatCategory(category)}
                </span>
                <span class="category-amount">${this.formatCurrency(amount)}</span>
            </div>
        `).join('');
    }

    getCategoryIcon(category) {
        const icons = {
            food: 'utensils',
            transport: 'car',
            entertainment: 'film',
            shopping: 'shopping-bag',
            bills: 'lightbulb',
            health: 'heartbeat',
            salary: 'dollar-sign',
            freelance: 'laptop',
            investment: 'chart-line',
            other: 'ellipsis-h'
        };
        return icons[category] || 'ellipsis-h';
    }

    getCategoryEmoji(category) {
        const emojis = {
            food: '🍔',
            transport: '🚗',
            entertainment: '🎬',
            shopping: '🛍️',
            bills: '💡',
            health: '🏥',
            salary: '💰',
            freelance: '💻',
            investment: '📈',
            other: '📝'
        };
        return emojis[category] || '📝';
    }

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    resetForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();
    }

    closeModal() {
        document.getElementById('editModal').classList.remove('show');
        this.editingId = null;
    }

    saveToStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme toggle icon
        const icon = document.querySelector('#themeToggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme toggle icon
        const icon = document.querySelector('#themeToggle i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            minWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Export data
    exportData() {
        const dataStr = JSON.stringify(this.transactions, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'expense-tracker-data.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    // Import data
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    this.transactions = importedData;
                    this.saveToStorage();
                    this.updateDisplay();
                    this.showNotification('Data imported successfully!', 'success');
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                this.showNotification('Error importing data. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the app
let expenseTracker;
document.addEventListener('DOMContentLoaded', () => {
    expenseTracker = new ExpenseTracker();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N to add new transaction
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('description').focus();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        expenseTracker.closeModal();
    }
});

// Add some demo data for first-time users
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (expenseTracker.transactions.length === 0) {
            const demoTransactions = [
                {
                    id: Date.now() - 1000,
                    description: 'Salary Payment',
                    amount: 3000,
                    category: 'salary',
                    type: 'income',
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString()
                },
                {
                    id: Date.now() - 2000,
                    description: 'Grocery Shopping',
                    amount: 85.50,
                    category: 'food',
                    type: 'expense',
                    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                    timestamp: new Date().toISOString()
                },
                {
                    id: Date.now() - 3000,
                    description: 'Gas Station',
                    amount: 45.00,
                    category: 'transport',
                    type: 'expense',
                    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
                    timestamp: new Date().toISOString()
                }
            ];
            
            expenseTracker.transactions = demoTransactions;
            expenseTracker.saveToStorage();
            expenseTracker.updateDisplay();
        }
    }, 500);
});