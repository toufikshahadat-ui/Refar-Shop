let tg = window.Telegram.WebApp;
let currentUserId = null;
let currentUserData = null;

function initTelegram() {
    tg.ready();
    tg.MainButton.hide();
    tg.BackButton.hide();
    
    let user = null;
    try {
        if (tg.initData) {
            const urlParams = new URLSearchParams(tg.initData);
            const userData = urlParams.get('user');
            if (userData) user = JSON.parse(userData);
        }
    } catch (e) {
        console.log('User data parse error');
    }
    
    if (user && user.id) {
        currentUserId = user.id;
        initializeApp(user);
    } else {
        simulateUser();
    }
}

function simulateUser() {
    currentUserId = 123456789;
    const mockUser = {
        id: 123456789,
        first_name: "Test",
        last_name: "User",
        username: "testuser"
    };
    initializeApp(mockUser);
}

async function initializeApp(user) {
    console.log('Initializing app for user:', user.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
    document.getElementById('loadingScreen').classList.add('hidden');
    await initializeUser(user);
    await loadUserData();
    await checkChannelMembership();
}

async function initializeUser(user) {
    const { db, doc, getDoc, setDoc, serverTimestamp } = window.firebaseDB;
    const userRef = doc(db, 'users', String(currentUserId));
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
        await setDoc(userRef, {
            telegramId: user.id,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            username: user.username || '',
            photoUrl: 'https://i.postimg.cc/gkm3ZNVT/IMG-20260702-235054-440.jpg',
            balance: 0,
            referralCount: 0,
            referralLink: `https://t.me/Refar_Shop_bot?start=${currentUserId}`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastWithdrawTime: null,
            channelVerified: false
        });
    }
}

async function loadUserData() {
    const { db, doc, getDoc } = window.firebaseDB;
    const userRef = doc(db, 'users', String(currentUserId));
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        currentUserData = userSnap.data();
        updateUI();
    }
}

function updateUI() {
    if (!currentUserData) return;
    
    document.getElementById('profilePhoto').src = currentUserData.photoUrl || 'https://i.postimg.cc/gkm3ZNVT/IMG-20260702-235054-440.jpg';
    document.getElementById('userName').textContent = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`;
    document.getElementById('userTgId').textContent = `ID: ${currentUserData.telegramId}`;
    
    const balance = (currentUserData.balance || 0).toFixed(2);
    document.getElementById('balanceDisplay').textContent = `৳ ${balance}`;
    document.getElementById('walletBalance').textContent = `৳ ${balance}`;
    document.getElementById('referralCount').textContent = currentUserData.referralCount || 0;
    document.getElementById('referralLink').value = currentUserData.referralLink || `https://t.me/Refar_Shop_bot?start=${currentUserId}`;
    
    loadTasks();
    loadHistory();
    loadPendingRequests();
}

async function checkChannelMembership() {
    try {
        const response = await fetch('/api/check-channel-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        
        const data = await response.json();
        
        if (data.verified) {
            document.getElementById('joinPopup').classList.add('hidden');
            document.getElementById('appContainer').classList.remove('hidden');
            markChannelVerified();
        } else {
            document.getElementById('joinPopup').classList.remove('hidden');
            document.getElementById('appContainer').classList.add('hidden');
        }
    } catch (error) {
        console.error('Channel check error:', error);
        document.getElementById('joinPopup').classList.remove('hidden');
    }
}

async function markChannelVerified() {
    const { db, doc, updateDoc } = window.firebaseDB;
    try {
        await updateDoc(doc(db, 'users', String(currentUserId)), {
            channelVerified: true
        });
    } catch (error) {
        console.error('Channel verify error:', error);
    }
}

async function loadTasks() {
    const { db, collection, getDocs, query, where } = window.firebaseDB;
    try {
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('active', '==', true));
        const snapshot = await getDocs(q);
        
        const tasks = [];
        snapshot.forEach(doc => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        
        renderTasks(tasks);
    } catch (error) {
        console.error('Load tasks error:', error);
    }
}

function renderTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    const noTasksMsg = document.getElementById('noTasksMsg');
    document.getElementById('taskCount').textContent = `মোট টাস্ক: ${tasks.length}`;
    
    if (tasks.length === 0) {
        container.innerHTML = '';
        noTasksMsg.classList.remove('hidden');
        return;
    }
    
    noTasksMsg.classList.add('hidden');
    container.innerHTML = tasks.map(task => `
        <div class="task-card" onclick="openTaskModal('${task.id}')">
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <span class="task-reward">৳ ${(task.reward || 0).toFixed(2)}</span>
            </div>
            <p class="task-description">${task.description || ''}</p>
            <div class="task-footer">
                <span class="task-status pending">নতুন</span>
                <span class="task-completion">ক্লিক করে বিস্তারিত দেখুন</span>
            </div>
        </div>
    `).join('');
}

async function openTaskModal(taskId) {
    const { db, doc, getDoc } = window.firebaseDB;
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) return;
    
    const task = taskSnap.data();
    const modal = document.getElementById('taskModal');
    const body = document.getElementById('taskModalBody');
    
    body.innerHTML = `
        <div class="task-detail">
            <h2 class="task-detail-title">${task.title}</h2>
            <p class="task-detail-description">${task.description || ''}</p>
            
            <div class="task-detail-info">
                <div class="info-item">
                    <span class="info-label">পুরস্কার</span>
                    <span class="info-value">৳ ${(task.reward || 0).toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">সময়সীমা</span>
                    <span class="info-value">${task.deadline || 'চলমান'}</span>
                </div>
            </div>
            
            <div class="task-submission-section">
                <h3 class="section-title">প্রমাণ জমা দিন</h3>
                <div class="submission-form">
                    <div class="file-upload" id="fileUpload-${taskId}">
                        <input type="file" id="screenshotInput-${taskId}" accept="image/*" />
                        <span class="upload-icon">📸</span>
                        <p class="upload-text">স্ক্রিনশট আপলোড করুন</p>
                        <p class="upload-hint">PNG, JPG, GIF - Max 5MB</p>
                        <p id="fileName-${taskId}" class="file-name"></p>
                    </div>
                    <button class="submit-task-btn" onclick="submitTask('${taskId}')">সাবমিট করুন</button>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    const fileUpload = document.getElementById(`fileUpload-${taskId}`);
    const fileInput = document.getElementById(`screenshotInput-${taskId}`);
    
    fileUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById(`fileName-${taskId}`).textContent = `✓ ${file.name}`;
            window.selectedTaskFile = { taskId, file };
        }
    });
}

async function submitTask(taskId) {
    if (!window.selectedTaskFile) {
        showToast('ফাইল নির্বাচন করুন', 'error');
        return;
    }
    
    const file = window.selectedTaskFile.file;
    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('taskId', taskId);
    formData.append('userId', currentUserId);
    
    try {
        const response = await fetch('/api/submit-task', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showToast('টাস্ক জমা হয়েছে', 'success');
            document.getElementById('taskModal').classList.add('hidden');
            await saveTaskSubmission(taskId);
            loadHistory();
        } else {
            showToast('ত্রুটি: জমা দেওয়া ব্যর্থ', 'error');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showToast('নেটওয়ার্ক সমস্যা', 'error');
    }
}

async function saveTaskSubmission(taskId) {
    const { db, collection, addDoc, serverTimestamp } = window.firebaseDB;
    try {
        await addDoc(collection(db, 'task_submissions'), {
            userId: currentUserId,
            taskId: taskId,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Save submission error:', error);
    }
}

async function loadHistory() {
    const { db, collection, getDocs, query, where } = window.firebaseDB;
    try {
        const submissionsRef = collection(db, 'task_submissions');
        const q = query(submissionsRef, where('userId', '==', currentUserId));
        const snapshot = await getDocs(q);
        
        const submissions = [];
        snapshot.forEach(doc => {
            submissions.push({ id: doc.id, ...doc.data() });
        });
        
        renderHistory(submissions);
    } catch (error) {
        console.error('Load history error:', error);
    }
}

function renderHistory(submissions) {
    const container = document.getElementById('historyContainer');
    const noHistoryMsg = document.getElementById('noHistoryMsg');
    
    if (submissions.length === 0) {
        container.innerHTML = '';
        noHistoryMsg.classList.remove('hidden');
        return;
    }
    
    noHistoryMsg.classList.add('hidden');
    container.innerHTML = submissions.map(sub => {
        const statusClass = sub.status || 'pending';
        const statusText = statusClass === 'approved' ? '✓ অনুমোদিত' : statusClass === 'rejected' ? '✗ বাতিল' : '⏳ অপেক্ষাধীন';
        const timestamp = sub.createdAt?.toDate?.() || new Date();
        
        return `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-type">টাস্ক জমা</span>
                    <span class="history-amount">৳ 0.00</span>
                </div>
                <div class="history-detail">টাস্ক ID: ${sub.taskId}</div>
                <div class="history-time">${timestamp.toLocaleString('bn-BD')}</div>
                <span class="history-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

async function loadPendingRequests() {
    const { db, collection, getDocs, query, where } = window.firebaseDB;
    try {
        const depositsRef = collection(db, 'deposits');
        const q = query(depositsRef, where('userId', '==', currentUserId), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        
        let hasPending = false;
        const container = document.getElementById('pendingRequestsContainer');
        container.innerHTML = '';
        
        snapshot.forEach(doc => {
            hasPending = true;
            const data = doc.data();
            container.innerHTML += `
                <div class="request-item">
                    <div class="request-info">
                        <div class="request-type">ডিপোজিট অনুরোধ</div>
                        <div class="request-amount">৳ ${(data.amount || 0).toFixed(2)}</div>
                    </div>
                    <div class="request-status">অপেক্ষাধীন</div>
                </div>
            `;
        });
        
        if (hasPending) {
            document.getElementById('pendingRequests').classList.remove('hidden');
        } else {
            document.getElementById('pendingRequests').classList.add('hidden');
        }
    } catch (error) {
        console.error('Load pending error:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    document.getElementById('copyReferralBtn').addEventListener('click', () => {
        const link = document.getElementById('referralLink').value;
        navigator.clipboard.writeText(link).then(() => {
            const btn = document.getElementById('copyReferralBtn');
            btn.textContent = '✓ কপি হয়েছে';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = 'কপি';
                btn.classList.remove('copied');
            }, 2000);
        });
    });
    
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('taskModal').classList.add('hidden');
        window.selectedTaskFile = null;
    });
    
    document.getElementById('depositBtn').addEventListener('click', () => {
        document.getElementById('depositForm').classList.remove('hidden');
        document.getElementById('withdrawForm').classList.add('hidden');
    });
    
    document.getElementById('cancelDepositBtn').addEventListener('click', () => {
        document.getElementById('depositForm').classList.add('hidden');
    });
    
    document.getElementById('submitDepositBtn').addEventListener('click', submitDeposit);
    
    document.getElementById('withdrawBtn').addEventListener('click', () => {
        document.getElementById('withdrawForm').classList.remove('hidden');
        document.getElementById('depositForm').classList.add('hidden');
    });
    
    document.getElementById('cancelWithdrawBtn').addEventListener('click', () => {
        document.getElementById('withdrawForm').classList.add('hidden');
    });
    
    document.getElementById('submitWithdrawBtn').addEventListener('click', submitWithdraw);
    
    document.getElementById('verifyJoinBtn').addEventListener('click', async () => {
        await checkChannelMembership();
    });
    
    initTelegram();
});

function switchTab(tabName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName + 'Section').classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

async function submitDeposit() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const transactionId = document.getElementById('transactionId').value.trim();
    
    if (!amount || amount < 50) {
        showToast('কমপক্ষে ৳ 50 জমা দিন', 'error');
        return;
    }
    
    if (!transactionId) {
        showToast('ট্রানজেকশন আইডি প্রয়োজন', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/submit-deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                amount: amount,
                transactionId: transactionId
            })
        });
        
        if (response.ok) {
            showToast('ডিপোজিট অনুরোধ পাঠানো হয়েছে', 'success');
            document.getElementById('depositForm').classList.add('hidden');
            document.getElementById('depositAmount').value = '';
            document.getElementById('transactionId').value = '';
            loadPendingRequests();
        } else {
            showToast('ত্রুটি: অনুরোধ ব্যর্থ', 'error');
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showToast('নেটওয়ার্ক সমস্যা', 'error');
    }
}

async function submitWithdraw() {
    const method = document.getElementById('withdrawMethod').value;
    const number = document.getElementById('withdrawNumber').value.trim();
    
    if (!method) {
        showToast('পেমেন্ট মেথড নির্বাচন করুন', 'error');
        return;
    }
    
    if (!number) {
        showToast('মোবাইল নম্বর প্রয়োজন', 'error');
        return;
    }
    
    if (currentUserData.balance < 50) {
        showToast('ন্যূনতম ৳ 50 থাকতে হবে', 'error');
        return;
    }
    
    const now = new Date();
    const lastWithdraw = currentUserData.lastWithdrawTime?.toDate?.() || new Date(0);
    const hoursSince = (now - lastWithdraw) / (1000 * 60 * 60);
    
    if (hoursSince < 24) {
        showToast('আগামী ' + Math.ceil(24 - hoursSince) + ' ঘণ্টা অপেক্ষা করুন', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/submit-withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                method: method,
                number: number
            })
        });
        
        if (response.ok) {
            showToast('উইথড্র অনুরোধ পাঠানো হয়েছে', 'success');
            document.getElementById('withdrawForm').classList.add('hidden');
            document.getElementById('withdrawMethod').value = '';
            document.getElementById('withdrawNumber').value = '';
            loadPendingRequests();
        } else {
            showToast('ত্রুটি: অনুরোধ ব্যর্থ', 'error');
        }
    } catch (error) {
        console.error('Withdraw error:', error);
        showToast('নেটওয়ার্ক সমস্যা', 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

window.showToast = showToast;
window.switchTab = switchTab;
window.openTaskModal = openTaskModal;
window.submitTask = submitTask;