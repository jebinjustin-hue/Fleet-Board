// State Management
let students = [];
let auditLog = [];
let isAdminMode = false;
let currentView = 'kanban'; // 'kanban' or 'table'
let lastUndoAction = null;
let currentDrawerStudentId = null;
let currentUser = null;

// Admin emails
const ADMIN_EMAILS = [
    'jebin.justin@alpha.school',
    'garrett.rigby@alpha.school'
];

// Admin password
const ADMIN_PASSWORD = '2hrlearning';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeEventListeners();
});

// Authentication
function checkAuth() {
    const savedUser = sessionStorage.getItem('alphaFleetUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showApp() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    
    // Update UI based on user
    updateUserInfo();
    updateAdminUI();
    
    // Initialize app
    loadData();
    renderBoard();
    updateLastRefresh();
    startAutoRelease();
    populateHouseFilter();
}

function isAdmin(email) {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

function updateUserInfo() {
    if (currentUser) {
        const userInfo = document.getElementById('userInfo');
        const isUserAdmin = isAdmin(currentUser.email);
        userInfo.textContent = `${currentUser.name}${isUserAdmin ? ' (Admin)' : ''}`;
    }
}

function updateAdminUI() {
    const isUserAdmin = currentUser && isAdmin(currentUser.email);
    
    // Automatically enable admin mode for admin users
    isAdminMode = isUserAdmin;
    
    // Hide bulk action buttons for non-admins
    const bulkButtons = document.querySelectorAll('#bulkMoveBtn, #bulkReleaseBtn, #bulkExtendBtn, #bulkExtend14Btn');
    bulkButtons.forEach(btn => {
        if (btn) {
            btn.style.display = isUserAdmin ? 'inline-block' : 'none';
        }
    });
    
    // Hide add/delete buttons for non-admins
    const addDeleteButtons = document.querySelectorAll('#addStudentBtn, #deleteSelectedBtn');
    addDeleteButtons.forEach(btn => {
        if (btn) {
            btn.style.display = isUserAdmin ? 'inline-block' : 'none';
        }
    });
    
    // Hide select all checkbox for non-admins
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        const th = selectAllCheckbox.closest('th');
        if (th) {
            th.style.display = isUserAdmin ? 'table-cell' : 'none';
        }
    }
    
    // Hide checkboxes in table rows for non-admins
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        const td = cb.closest('td');
        if (td) {
            td.style.display = isUserAdmin ? 'table-cell' : 'none';
        }
    });
}

function handleLogin(email, name) {
    currentUser = {
        email: email.toLowerCase(),
        name: name
    };
    sessionStorage.setItem('alphaFleetUser', JSON.stringify(currentUser));
    showApp();
}

function handleLogout() {
    currentUser = null;
    isAdminMode = false;
    sessionStorage.removeItem('alphaFleetUser');
    showLogin();
    // Clear form
    document.getElementById('loginForm').reset();
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('passwordError').style.display = 'none';
}

// Data Persistence
function saveData() {
    localStorage.setItem('alphaFleetStudents', JSON.stringify(students));
    localStorage.setItem('alphaFleetAuditLog', JSON.stringify(auditLog));
}

function loadData() {
    const savedStudents = localStorage.getItem('alphaFleetStudents');
    const savedAuditLog = localStorage.getItem('alphaFleetAuditLog');
    
    if (savedStudents) {
        students = JSON.parse(savedStudents);
    } else {
        seedData();
        saveData();
    }
    
    if (savedAuditLog) {
        auditLog = JSON.parse(savedAuditLog);
    }
}

function seedData() {
    const houses = ['House A', 'House B', 'House C'];
    const names = [
        'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Ethan Hunt',
        'Fiona Apple', 'George Washington', 'Hannah Montana', 'Isaac Newton', 'Julia Roberts',
        'Kevin Hart', 'Luna Lovegood', 'Michael Jordan', 'Nina Simone', 'Oliver Twist',
        'Penelope Cruz', 'Quinn Fabray', 'Rachel Green', 'Steve Jobs', 'Tina Fey'
    ];
    
    students = [];
    for (let i = 0; i < 15; i++) {
        const status = i < 10 ? 'Active' : 'PirateShip';
        const now = new Date();
        let pirateStart = null;
        let pirateEnd = null;
        
        if (status === 'PirateShip') {
            pirateStart = new Date(now.getTime() - (i - 9) * 2 * 24 * 60 * 60 * 1000);
            pirateEnd = new Date(pirateStart.getTime() + 14 * 24 * 60 * 60 * 1000);
        }
        
        students.push({
            id: `student-${i + 1}`,
            full_name: names[i],
            house_or_group: houses[i % 3],
            status: status,
            pirate_start: pirateStart ? pirateStart.toISOString() : null,
            pirate_end: pirateEnd ? pirateEnd.toISOString() : null,
            notes: '',
            last_updated_by: 'System',
            last_updated_at: now.toISOString()
        });
    }
    
    auditLog = [];
}

// Event Listeners
function initializeEventListeners() {
    // Show/hide password field based on email
    document.getElementById('emailInput').addEventListener('input', (e) => {
        const email = e.target.value.trim().toLowerCase();
        const passwordGroup = document.getElementById('passwordGroup');
        const passwordInput = document.getElementById('passwordInput');
        const passwordError = document.getElementById('passwordError');
        
        if (isAdmin(email)) {
            passwordGroup.style.display = 'block';
            passwordInput.required = true;
        } else {
            passwordGroup.style.display = 'none';
            passwordInput.required = false;
            passwordInput.value = '';
            passwordError.style.display = 'none';
        }
    });
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value.trim();
        const name = document.getElementById('nameInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const passwordError = document.getElementById('passwordError');
        
        if (!email || !name) {
            return;
        }
        
        // Check if admin and validate password
        if (isAdmin(email)) {
            if (password !== ADMIN_PASSWORD) {
                passwordError.textContent = 'Incorrect admin password';
                passwordError.style.display = 'block';
                return;
            }
            passwordError.style.display = 'none';
        }
        
        handleLogin(email, name);
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // View toggle
    document.getElementById('viewToggle').addEventListener('click', toggleView);
    
    // Search and filters
    document.getElementById('searchInput').addEventListener('input', renderBoard);
    document.getElementById('statusFilter').addEventListener('change', renderBoard);
    document.getElementById('urgentFilter').addEventListener('change', renderBoard);
    
    // Export
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
    
    // Modal close buttons
    document.getElementById('closeMoveModal').addEventListener('click', closeMoveModal);
    document.getElementById('closeReleaseModal').addEventListener('click', closeReleaseModal);
    document.getElementById('closeBulkMoveModal').addEventListener('click', closeBulkMoveModal);
    document.getElementById('closeCustomDateModal').addEventListener('click', closeCustomDateModal);
    document.getElementById('cancelMoveBtn').addEventListener('click', closeMoveModal);
    document.getElementById('cancelReleaseBtn').addEventListener('click', closeReleaseModal);
    document.getElementById('cancelBulkMoveBtn').addEventListener('click', closeBulkMoveModal);
    document.getElementById('cancelCustomDateBtn').addEventListener('click', closeCustomDateModal);
    
    // Modal confirm buttons
    document.getElementById('confirmMoveBtn').addEventListener('click', confirmMoveToPirate);
    document.getElementById('confirmReleaseBtn').addEventListener('click', confirmRelease);
    document.getElementById('confirmBulkMoveBtn').addEventListener('click', confirmBulkMove);
    document.getElementById('confirmCustomDateBtn').addEventListener('click', confirmCustomDate);
    
    // Drawer
    document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
    
    // Detail drawer actions
    document.getElementById('extend7Btn').addEventListener('click', () => extendPirateShip(7));
    document.getElementById('extend14Btn').addEventListener('click', () => extendPirateShip(14));
    document.getElementById('releaseNowBtn').addEventListener('click', releaseFromDrawer);
    document.getElementById('customDateBtn').addEventListener('click', openCustomDateModal);
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
    
    // Add/Remove students
    document.getElementById('addStudentBtn').addEventListener('click', openAddStudentModal);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedStudents);
    document.getElementById('closeAddStudentModal').addEventListener('click', closeAddStudentModal);
    document.getElementById('cancelAddStudentBtn').addEventListener('click', closeAddStudentModal);
    document.getElementById('confirmAddStudentBtn').addEventListener('click', confirmAddStudent);
    document.getElementById('newStudentStatus').addEventListener('change', (e) => {
        const pirateDates = document.getElementById('newStudentPirateDates');
        if (e.target.value === 'PirateShip') {
            pirateDates.style.display = 'block';
            const now = new Date();
            const startDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            document.getElementById('newStudentStartDate').value = startDate;
        } else {
            pirateDates.style.display = 'none';
        }
    });
    
    // Bulk actions
    document.getElementById('bulkMoveBtn').addEventListener('click', openBulkMoveModal);
    document.getElementById('bulkReleaseBtn').addEventListener('click', bulkRelease);
    document.getElementById('bulkExtendBtn').addEventListener('click', () => bulkExtend(7));
    document.getElementById('bulkExtend14Btn').addEventListener('click', () => bulkExtend(14));
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
    
    // Undo
    document.getElementById('undoBtn').addEventListener('click', undoLastAction);
    
    // Close modals on backdrop click
    document.getElementById('moveToPirateModal').addEventListener('click', (e) => {
        if (e.target.id === 'moveToPirateModal') closeMoveModal();
    });
    document.getElementById('releaseModal').addEventListener('click', (e) => {
        if (e.target.id === 'releaseModal') closeReleaseModal();
    });
    document.getElementById('bulkMoveModal').addEventListener('click', (e) => {
        if (e.target.id === 'bulkMoveModal') closeBulkMoveModal();
    });
    document.getElementById('customDateModal').addEventListener('click', (e) => {
        if (e.target.id === 'customDateModal') closeCustomDateModal();
    });
    document.getElementById('addStudentModal').addEventListener('click', (e) => {
        if (e.target.id === 'addStudentModal') closeAddStudentModal();
    });
    
    // Pirate start date change handler
    document.getElementById('pirateStartDate').addEventListener('change', updatePirateEndDate);
    document.getElementById('bulkStartDate').addEventListener('change', updateBulkEndDate);
}

// View Toggle
function toggleView() {
    currentView = currentView === 'kanban' ? 'table' : 'kanban';
    const btn = document.getElementById('viewToggle');
    btn.textContent = currentView === 'kanban' ? 'Table View' : 'Kanban View';
    renderBoard();
}

// Rendering
function renderBoard() {
    if (currentView === 'kanban') {
        renderKanbanBoard();
    } else {
        renderTableView();
    }
    updateCounts();
}

function renderKanbanBoard() {
    const activeContent = document.getElementById('activeContent');
    const pirateContent = document.getElementById('pirateContent');
    
    activeContent.innerHTML = '';
    pirateContent.innerHTML = '';
    
    const filtered = getFilteredStudents();
    const activeStudents = filtered.filter(s => s.status === 'Active').sort((a, b) => 
        a.full_name.localeCompare(b.full_name)
    );
    const pirateStudents = filtered.filter(s => s.status === 'PirateShip').sort((a, b) => {
        const daysA = getDaysRemaining(a);
        const daysB = getDaysRemaining(b);
        return daysA - daysB;
    });
    
    activeStudents.forEach(student => {
        activeContent.appendChild(createStudentCard(student));
    });
    
    pirateStudents.forEach(student => {
        pirateContent.appendChild(createStudentCard(student));
    });
    
    // Show/hide views
    document.getElementById('kanbanBoard').classList.remove('hidden');
    document.getElementById('tableView').classList.add('hidden');
}

function renderTableView() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    const filtered = getFilteredStudents();
    const isUserAdmin = currentUser && isAdmin(currentUser.email);
    
    filtered.forEach(student => {
        const row = document.createElement('tr');
        row.dataset.id = student.id;
        const daysLeft = student.status === 'PirateShip' ? getDaysRemaining(student) : '-';
        const startDate = student.pirate_start ? new Date(student.pirate_start).toLocaleDateString() : '-';
        const endDate = student.pirate_end ? new Date(student.pirate_end).toLocaleDateString() : '-';
        
        const nameCell = isUserAdmin 
            ? `<td class="editable-name" data-id="${student.id}">
                <span class="name-display">${student.full_name}</span>
                <input type="text" class="name-edit-input" value="${student.full_name}" style="display: none;">
               </td>`
            : `<td>${student.full_name}</td>`;
        
        row.innerHTML = `
            <td style="display: ${isUserAdmin ? 'table-cell' : 'none'}"><input type="checkbox" class="row-checkbox" data-id="${student.id}"></td>
            ${nameCell}
            <td><span class="status-chip ${student.status === 'Active' ? 'active' : 'pirate-ship'}">${student.status === 'Active' ? 'Active' : 'Pirate Ship'}</span></td>
            <td>${startDate}</td>
            <td>${endDate}</td>
            <td>${daysLeft === '-' ? '-' : `${daysLeft} days`}</td>
            <td>${student.notes || '-'}</td>
            <td>
                <button class="btn btn-small btn-secondary view-detail" data-id="${student.id}">View</button>
                ${isUserAdmin ? `<button class="btn btn-small btn-danger delete-student" data-id="${student.id}" style="margin-left: 5px;">Delete</button>` : ''}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add delete button listeners
    if (isUserAdmin) {
        document.querySelectorAll('.delete-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteStudent(e.target.dataset.id);
            });
        });
    }
    
    // Add inline editing for names (admin only)
    if (isUserAdmin) {
        document.querySelectorAll('.editable-name').forEach(cell => {
            const display = cell.querySelector('.name-display');
            const input = cell.querySelector('.name-edit-input');
            
            display.addEventListener('click', () => {
                display.style.display = 'none';
                input.style.display = 'block';
                input.focus();
                input.select();
            });
            
            input.addEventListener('blur', () => {
                saveStudentName(cell.dataset.id, input.value.trim());
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    input.value = display.textContent;
                    input.blur();
                }
            });
        });
    }
    
    // Add event listeners for checkboxes and view buttons
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', updateBulkActionButtons);
    });
    document.querySelectorAll('.view-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openDrawer(e.target.dataset.id);
        });
    });
    
    // Show/hide views
    document.getElementById('kanbanBoard').classList.add('hidden');
    document.getElementById('tableView').classList.remove('hidden');
    
    // Update admin UI after rendering
    updateAdminUI();
}

function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = `student-card ${student.status === 'Active' ? 'active' : 'pirate-ship'} ${!isAdminMode ? 'read-only' : ''}`;
    card.draggable = isAdminMode;
    card.dataset.id = student.id;
    
    if (isAdminMode) {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    }
    
    const daysRemaining = student.status === 'PirateShip' ? getDaysRemaining(student) : null;
    const countdownBadge = daysRemaining !== null ? createCountdownBadge(daysRemaining, student) : '';
    const pirateDates = student.status === 'PirateShip' && student.pirate_start ? 
        `<div class="pirate-dates">Started: ${new Date(student.pirate_start).toLocaleDateString()}</div>` : '';
    
    card.innerHTML = `
        <div class="card-header">
            <div>
                <div class="card-name">${student.full_name}</div>
            </div>
        </div>
        <div class="card-body">
            <span class="status-chip ${student.status === 'Active' ? 'active' : 'pirate-ship'}">${student.status === 'Active' ? 'Active' : 'Pirate Ship'}</span>
            ${countdownBadge}
            ${pirateDates}
        </div>
        <div class="card-actions">
            <button class="btn btn-small btn-secondary view-detail" data-id="${student.id}">Details</button>
        </div>
    `;
    // Remove any tooltips or title attributes
    card.removeAttribute('title');
    card.setAttribute('data-no-tooltip', 'true');
    
    // Remove title from all child elements
    card.querySelectorAll('*').forEach(el => {
        el.removeAttribute('title');
    });
    
    // Prevent any hover tooltips
    card.addEventListener('mouseenter', (e) => {
        e.target.removeAttribute('title');
        if (e.target.querySelectorAll) {
            e.target.querySelectorAll('*').forEach(el => el.removeAttribute('title'));
        }
    });
    
    card.querySelector('.view-detail').addEventListener('click', (e) => {
        openDrawer(e.target.dataset.id);
    });
    
    // Column drop zones
    const activeColumn = document.getElementById('activeContent');
    const pirateColumn = document.getElementById('pirateContent');
    
    if (isAdminMode) {
        activeColumn.addEventListener('dragover', handleDragOver);
        activeColumn.addEventListener('drop', handleDrop);
        activeColumn.addEventListener('dragleave', handleDragLeave);
        pirateColumn.addEventListener('dragover', handleDragOver);
        pirateColumn.addEventListener('drop', handleDrop);
        pirateColumn.addEventListener('dragleave', handleDragLeave);
    }
    
    return card;
}

function createCountdownBadge(days, student) {
    let className = 'normal';
    if (days <= 3) className = 'urgent';
    else if (days <= 7) className = 'warning';
    
    return `<span class="countdown-badge ${className}">⏳ ${days} days left</span>`;
}

function getDaysRemaining(student) {
    if (!student.pirate_end) return null;
    const end = new Date(student.pirate_end);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

// Drag and Drop
let draggedStudent = null;

function handleDragStart(e) {
    draggedStudent = e.target.dataset.id;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedStudent) return;
    
    const student = students.find(s => s.id === draggedStudent);
    if (!student) return;
    
    const targetStatus = e.currentTarget.dataset.status;
    
    if (student.status === targetStatus) return;
    
    if (targetStatus === 'PirateShip') {
        openMoveToPirateModal(student);
    } else if (targetStatus === 'Active') {
        openReleaseModal(student);
    }
    
    draggedStudent = null;
}

// Modals
function openMoveToPirateModal(student) {
    const modal = document.getElementById('moveToPirateModal');
    document.getElementById('moveStudentName').textContent = student.full_name;
    
    const now = new Date();
    const startDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    document.getElementById('pirateStartDate').value = startDate;
    document.getElementById('pirateEndDate').value = endDate;
    document.getElementById('moveNotes').value = '';
    
    modal.dataset.studentId = student.id;
    modal.classList.add('active');
}

function closeMoveModal() {
    document.getElementById('moveToPirateModal').classList.remove('active');
}

function updatePirateEndDate() {
    const startDate = document.getElementById('pirateStartDate').value;
    if (startDate) {
        const start = new Date(startDate);
        const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
        const endDateStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('pirateEndDate').value = endDateStr;
    }
}

function confirmMoveToPirate() {
    const modal = document.getElementById('moveToPirateModal');
    const studentId = modal.dataset.studentId;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const startDate = document.getElementById('pirateStartDate').value;
    const endDate = document.getElementById('pirateEndDate').value;
    const notes = document.getElementById('moveNotes').value;
    
    if (!startDate || !endDate) {
        alert('Please select a start date');
        return;
    }
    
    const oldValues = { ...student };
    student.status = 'PirateShip';
    student.pirate_start = new Date(startDate).toISOString();
    student.pirate_end = new Date(endDate).toISOString();
    student.notes = notes;
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    logAudit(student.id, 'Move to Pirate Ship', oldValues, { ...student });
    saveData();
    renderBoard();
    closeMoveModal();
    showToast(`Set sail: ${student.full_name} enters Pirate Ship until ${new Date(endDate).toLocaleDateString()}.`);
}

function openReleaseModal(student) {
    const modal = document.getElementById('releaseModal');
    document.getElementById('releaseStudentName').textContent = student.full_name;
    document.getElementById('releaseNotes').value = '';
    modal.dataset.studentId = student.id;
    modal.classList.add('active');
}

function closeReleaseModal() {
    document.getElementById('releaseModal').classList.remove('active');
}

function confirmRelease() {
    const modal = document.getElementById('releaseModal');
    const studentId = modal.dataset.studentId;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const notes = document.getElementById('releaseNotes').value;
    
    const oldValues = { ...student };
    student.status = 'Active';
    student.pirate_start = null;
    student.pirate_end = null;
    if (notes) student.notes = notes;
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    logAudit(student.id, 'Release from Pirate Ship', oldValues, { ...student });
    saveData();
    renderBoard();
    closeReleaseModal();
    showToast(`Anchors up: ${student.full_name} returns to Active.`);
}

// Bulk Actions
function openBulkMoveModal() {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    const selected = getSelectedStudents();
    if (selected.length === 0) {
        alert('Please select at least one student');
        return;
    }
    
    const modal = document.getElementById('bulkMoveModal');
    document.getElementById('bulkMoveCount').textContent = selected.length;
    
    const now = new Date();
    const startDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    document.getElementById('bulkStartDate').value = startDate;
    document.getElementById('bulkEndDate').value = endDate;
    document.getElementById('bulkNotes').value = '';
    
    modal.classList.add('active');
}

function closeBulkMoveModal() {
    document.getElementById('bulkMoveModal').classList.remove('active');
}

function updateBulkEndDate() {
    const startDate = document.getElementById('bulkStartDate').value;
    if (startDate) {
        const start = new Date(startDate);
        const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
        const endDateStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('bulkEndDate').value = endDateStr;
    }
}

function confirmBulkMove() {
    const selected = getSelectedStudents();
    if (selected.length === 0) return;
    
    const startDate = document.getElementById('bulkStartDate').value;
    const endDate = document.getElementById('bulkEndDate').value;
    const notes = document.getElementById('bulkNotes').value;
    
    if (!startDate || !endDate) {
        alert('Please select a start date');
        return;
    }
    
    selected.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        const oldValues = { ...student };
        student.status = 'PirateShip';
        student.pirate_start = new Date(startDate).toISOString();
        student.pirate_end = new Date(endDate).toISOString();
        if (notes) student.notes = notes;
        student.last_updated_by = currentUser ? currentUser.name : 'System';
        student.last_updated_at = new Date().toISOString();
        
        logAudit(student.id, 'Bulk Move to Pirate Ship', oldValues, { ...student });
    });
    
    saveData();
    renderBoard();
    closeBulkMoveModal();
    showToast(`Moved ${selected.length} student(s) to Pirate Ship.`);
}

function bulkRelease() {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    const selected = getSelectedStudents();
    if (selected.length === 0) {
        alert('Please select at least one student');
        return;
    }
    
    if (!confirm(`Release ${selected.length} student(s) from Pirate Ship?`)) return;
    
    selected.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student || student.status !== 'PirateShip') return;
        
        const oldValues = { ...student };
        student.status = 'Active';
        student.pirate_start = null;
        student.pirate_end = null;
        student.last_updated_by = currentUser ? currentUser.name : 'System';
        student.last_updated_at = new Date().toISOString();
        
        logAudit(student.id, 'Bulk Release', oldValues, { ...student });
    });
    
    saveData();
    renderBoard();
    showToast(`Released ${selected.length} student(s) from Pirate Ship.`);
}

function bulkExtend(days) {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    const selected = getSelectedStudents();
    if (selected.length === 0) {
        alert('Please select at least one student');
        return;
    }
    
    selected.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student || student.status !== 'PirateShip' || !student.pirate_end) return;
        
        const oldValues = { ...student };
        const currentEnd = new Date(student.pirate_end);
        student.pirate_end = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        student.last_updated_by = currentUser ? currentUser.name : 'System';
        student.last_updated_at = new Date().toISOString();
        
        logAudit(student.id, `Extend +${days} days`, oldValues, { ...student });
    });
    
    saveData();
    renderBoard();
    showToast(`Extended ${selected.length} student(s) by ${days} days.`);
}

function getSelectedStudents() {
    return Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = selectAll.checked;
    });
    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const selected = getSelectedStudents();
    // Buttons are always enabled, but we could disable them if needed
}

// Detail Drawer
function openDrawer(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    currentDrawerStudentId = studentId;
    const drawer = document.getElementById('detailDrawer');
    document.getElementById('drawerStudentName').textContent = student.full_name;
    document.getElementById('drawerNotes').value = student.notes || '';
    
    // Show/hide admin-only actions
    const isUserAdmin = currentUser && isAdmin(currentUser.email);
    const quickActions = document.querySelector('.action-buttons-group');
    if (quickActions) {
        quickActions.style.display = isUserAdmin ? 'flex' : 'none';
    }
    const notesSection = document.querySelector('.detail-section:nth-of-type(2)');
    if (notesSection) {
        const saveNotesBtn = document.getElementById('saveNotesBtn');
        if (saveNotesBtn) {
            saveNotesBtn.style.display = isUserAdmin ? 'inline-block' : 'none';
        }
        if (!isUserAdmin) {
            document.getElementById('drawerNotes').readOnly = true;
        } else {
            document.getElementById('drawerNotes').readOnly = false;
        }
    }
    
    // Render history
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    const studentHistory = auditLog
        .filter(log => log.student_id === studentId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);
    
    if (studentHistory.length === 0) {
        historyList.innerHTML = '<p style="color: #666; font-size: 14px;">No history available.</p>';
    } else {
        studentHistory.forEach(log => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-time">${new Date(log.timestamp).toLocaleString()}</div>
                <div class="history-action">${log.action} by ${log.actor}</div>
            `;
            historyList.appendChild(item);
        });
    }
    
    drawer.classList.add('active');
}

function closeDrawer() {
    document.getElementById('detailDrawer').classList.remove('active');
    currentDrawerStudentId = null;
}

function extendPirateShip(days) {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    if (!currentDrawerStudentId) return;
    const student = students.find(s => s.id === currentDrawerStudentId);
    if (!student || student.status !== 'PirateShip' || !student.pirate_end) {
        alert('Student is not in Pirate Ship');
        return;
    }
    
    const oldValues = { ...student };
    const currentEnd = new Date(student.pirate_end);
    student.pirate_end = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    logAudit(student.id, `Extend +${days} days`, oldValues, { ...student });
    saveData();
    renderBoard();
    openDrawer(currentDrawerStudentId);
    showToast(`Extended ${student.full_name} by ${days} days.`);
}

function releaseFromDrawer() {
    if (!currentDrawerStudentId) return;
    const student = students.find(s => s.id === currentDrawerStudentId);
    if (!student) return;
    
    openReleaseModal(student);
    closeDrawer();
}

function openCustomDateModal() {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    if (!currentDrawerStudentId) return;
    const student = students.find(s => s.id === currentDrawerStudentId);
    if (!student || student.status !== 'PirateShip') {
        alert('Student is not in Pirate Ship');
        return;
    }
    
    const modal = document.getElementById('customDateModal');
    const currentEnd = student.pirate_end ? new Date(student.pirate_end) : new Date();
    const endDateStr = new Date(currentEnd.getTime() - currentEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('customEndDate').value = endDateStr;
    modal.classList.add('active');
}

function closeCustomDateModal() {
    document.getElementById('customDateModal').classList.remove('active');
}

function confirmCustomDate() {
    if (!currentDrawerStudentId) return;
    const student = students.find(s => s.id === currentDrawerStudentId);
    if (!student) return;
    
    const endDate = document.getElementById('customEndDate').value;
    if (!endDate) {
        alert('Please select an end date');
        return;
    }
    
    const oldValues = { ...student };
    student.pirate_end = new Date(endDate).toISOString();
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    logAudit(student.id, 'Set Custom End Date', oldValues, { ...student });
    saveData();
    renderBoard();
    closeCustomDateModal();
    openDrawer(currentDrawerStudentId);
    showToast(`Updated end date for ${student.full_name}.`);
}

function saveNotes() {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    if (!currentDrawerStudentId) return;
    const student = students.find(s => s.id === currentDrawerStudentId);
    if (!student) return;
    
    const notes = document.getElementById('drawerNotes').value;
    const oldValues = { ...student };
    student.notes = notes;
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    logAudit(student.id, 'Update Notes', oldValues, { ...student });
    saveData();
    showToast('Notes saved.');
}

// Filters
function getFilteredStudents() {
    let filtered = [...students];
    
    const search = document.getElementById('searchInput').value.toLowerCase();
    if (search) {
        filtered = filtered.filter(s => s.full_name.toLowerCase().includes(search));
    }
    
    const status = document.getElementById('statusFilter').value;
    if (status) {
        filtered = filtered.filter(s => s.status === status);
    }
    
    const urgent = document.getElementById('urgentFilter').checked;
    if (urgent) {
        filtered = filtered.filter(s => {
            if (s.status !== 'PirateShip') return false;
            const days = getDaysRemaining(s);
            return days !== null && days <= 3;
        });
    }
    
    return filtered;
}

function populateHouseFilter() {
    // No longer needed - house filter removed
}

function updateCounts() {
    const activeCount = students.filter(s => s.status === 'Active').length;
    const pirateCount = students.filter(s => s.status === 'PirateShip').length;
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('pirateCount').textContent = pirateCount;
}

// Auto Release
function startAutoRelease() {
    checkAndAutoRelease();
    // Check every hour (for demo purposes; in production, check at midnight)
    setInterval(checkAndAutoRelease, 60 * 60 * 1000);
}

function checkAndAutoRelease() {
    const now = new Date();
    let releasedCount = 0;
    
    students.forEach(student => {
        if (student.status === 'PirateShip' && student.pirate_end) {
            const endDate = new Date(student.pirate_end);
            if (endDate <= now) {
                const oldValues = { ...student };
                student.status = 'Active';
                student.pirate_start = null;
                student.pirate_end = null;
                student.last_updated_by = 'System';
                student.last_updated_at = now.toISOString();
                
                logAudit(student.id, 'Auto-Release', oldValues, { ...student });
                releasedCount++;
            }
        }
    });
    
    if (releasedCount > 0) {
        saveData();
        renderBoard();
    }
}

// Audit Logging
function logAudit(studentId, action, oldValues, newValues) {
    const actor = currentUser ? currentUser.name : 'System';
    auditLog.push({
        timestamp: new Date().toISOString(),
        student_id: studentId,
        action: action,
        actor: actor,
        old_values: oldValues,
        new_values: newValues
    });
    
    // Keep only last 1000 entries
    if (auditLog.length > 1000) {
        auditLog = auditLog.slice(-1000);
    }
}

// Undo
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('active');
    
    // Store last action for undo
    if (auditLog.length > 0) {
        lastUndoAction = auditLog[auditLog.length - 1];
    }
    
    setTimeout(() => {
        toast.classList.remove('active');
        lastUndoAction = null;
    }, 10000);
}

function undoLastAction() {
    if (!lastUndoAction) return;
    
    const student = students.find(s => s.id === lastUndoAction.student_id);
    if (!student) return;
    
    // Restore old values
    Object.assign(student, lastUndoAction.old_values);
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    // Remove the undone action from audit log
    const index = auditLog.findIndex(log => log === lastUndoAction);
    if (index !== -1) {
        auditLog.splice(index, 1);
    }
    
    // Log undo action
    logAudit(student.id, 'Undo', lastUndoAction.new_values, { ...student });
    
    saveData();
    renderBoard();
    document.getElementById('toast').classList.remove('active');
    lastUndoAction = null;
}

// Export CSV
function exportCSV() {
    const headers = ['Name', 'Status', 'Pirate Start', 'Pirate End', 'Days Left', 'Notes'];
    const rows = students.map(student => {
        const daysLeft = student.status === 'PirateShip' ? getDaysRemaining(student) : '';
        const startDate = student.pirate_start ? new Date(student.pirate_start).toLocaleDateString() : '';
        const endDate = student.pirate_end ? new Date(student.pirate_end).toLocaleDateString() : '';
        
        return [
            student.full_name,
            student.status,
            startDate,
            endDate,
            daysLeft !== null ? daysLeft : '',
            student.notes || ''
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alpha-fleet-board-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Edit Student Name
function saveStudentName(studentId, newName) {
    if (!currentUser || !isAdmin(currentUser.email)) {
        return;
    }
    
    if (!newName || newName.trim() === '') {
        // Restore original name if empty
        const student = students.find(s => s.id === studentId);
        if (student) {
            const cell = document.querySelector(`.editable-name[data-id="${studentId}"]`);
            if (cell) {
                const input = cell.querySelector('.name-edit-input');
                const display = cell.querySelector('.name-display');
                input.value = student.full_name;
                display.style.display = 'block';
                input.style.display = 'none';
            }
        }
        return;
    }
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const oldValues = { ...student };
    student.full_name = newName.trim();
    student.last_updated_by = currentUser ? currentUser.name : 'System';
    student.last_updated_at = new Date().toISOString();
    
    logAudit(student.id, 'Edit Name', oldValues, { ...student });
    saveData();
    
    // Update display
    const cell = document.querySelector(`.editable-name[data-id="${studentId}"]`);
    if (cell) {
        const display = cell.querySelector('.name-display');
        const input = cell.querySelector('.name-edit-input');
        display.textContent = newName.trim();
        display.style.display = 'block';
        input.style.display = 'none';
    }
    
    // Re-render to update all views
    renderBoard();
    showToast(`Updated name to "${newName.trim()}".`);
}

// Add Student
function openAddStudentModal() {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    const modal = document.getElementById('addStudentModal');
    document.getElementById('newStudentName').value = '';
    document.getElementById('newStudentStatus').value = 'Active';
    document.getElementById('newStudentNotes').value = '';
    document.getElementById('newStudentPirateDates').style.display = 'none';
    modal.classList.add('active');
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('active');
}

function confirmAddStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    const status = document.getElementById('newStudentStatus').value;
    const notes = document.getElementById('newStudentNotes').value.trim();
    
    if (!name) {
        alert('Please enter a student name');
        return;
    }
    
    const now = new Date();
    const studentId = `student-${Date.now()}`;
    let pirateStart = null;
    let pirateEnd = null;
    
    if (status === 'PirateShip') {
        const startDate = document.getElementById('newStudentStartDate').value;
        if (startDate) {
            pirateStart = new Date(startDate).toISOString();
            pirateEnd = new Date(new Date(startDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
        } else {
            pirateStart = now.toISOString();
            pirateEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
        }
    }
    
    const newStudent = {
        id: studentId,
        full_name: name,
        house_or_group: '', // Keep for data structure but not displayed
        status: status,
        pirate_start: pirateStart,
        pirate_end: pirateEnd,
        notes: notes,
        last_updated_by: currentUser ? currentUser.name : 'System',
        last_updated_at: now.toISOString()
    };
    
    students.push(newStudent);
    
    logAudit(studentId, 'Add Student', null, newStudent);
    saveData();
    renderBoard();
    closeAddStudentModal();
    showToast(`Added student "${name}".`);
}

// Delete Student
function deleteStudent(studentId) {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    if (!confirm(`Are you sure you want to delete "${student.full_name}"? This action cannot be undone.`)) {
        return;
    }
    
    const oldValues = { ...student };
    const index = students.findIndex(s => s.id === studentId);
    if (index !== -1) {
        students.splice(index, 1);
    }
    
    logAudit(studentId, 'Delete Student', oldValues, null);
    saveData();
    renderBoard();
    showToast(`Deleted student "${oldValues.full_name}".`);
}

function deleteSelectedStudents() {
    if (!currentUser || !isAdmin(currentUser.email)) {
        alert('Admin access only. Please contact an administrator.');
        return;
    }
    
    const selected = getSelectedStudents();
    if (selected.length === 0) {
        alert('Please select at least one student to delete');
        return;
    }
    
    const studentNames = selected.map(id => {
        const student = students.find(s => s.id === id);
        return student ? student.full_name : '';
    }).filter(name => name);
    
    if (!confirm(`Are you sure you want to delete ${selected.length} student(s)?\n\n${studentNames.join(', ')}\n\nThis action cannot be undone.`)) {
        return;
    }
    
    selected.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            const oldValues = { ...student };
            const index = students.findIndex(s => s.id === studentId);
            if (index !== -1) {
                students.splice(index, 1);
            }
            logAudit(studentId, 'Bulk Delete Student', oldValues, null);
        }
    });
    
    saveData();
    renderBoard();
    showToast(`Deleted ${selected.length} student(s).`);
}

// Last Refresh
function updateLastRefresh() {
    const now = new Date();
    document.getElementById('lastRefresh').textContent = `Last refresh: ${now.toLocaleTimeString()}`;
    setInterval(() => {
        const now = new Date();
        document.getElementById('lastRefresh').textContent = `Last refresh: ${now.toLocaleTimeString()}`;
    }, 60000); // Update every minute
}
