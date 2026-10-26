const stopwatch = document.getElementById('stopwatch');
const contextMenu = document.querySelector('.context-menu');

// Load tasks from local storage when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTasks(); // Load tasks first
    syncSortToggle();
    updateStats();
});

// ---------- persistence ----------

// Give every task a stable identity so identical texts stay separate tasks
function createTaskId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Fill in fields missing from tasks stored by older versions
function normalizeTask(stored) {
    return {
        id: (stored && stored.id) || createTaskId(),
        text: typeof (stored && stored.text) === 'string' ? stored.text : '',
        completed: Boolean(stored && stored.completed),
        dueDate: toIsoDate(stored && stored.dueDate),
        labels: Array.isArray(stored && stored.labels) ? stored.labels : [],
        createdAt: Number(stored && stored.createdAt) || Date.now()
    };
}

// Accepts ISO yyyy-mm-dd or the legacy "Mon D, YYYY" text; dates are
// stored in ISO so they parse as local time, never UTC (the old code
// parsed "2026-11-01" as UTC midnight and rendered it as Oct 31)
function toIsoDate(value) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return null;
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${parsed.getFullYear()}-${month}-${day}`;
}

function isoDateToday(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function isOverdue(iso) {
    return Boolean(iso) && iso < isoDateToday();
}

// Plain-language due date: Today, Tomorrow, or a short calendar date
function humanDueDate(iso) {
    if (iso === isoDateToday()) return 'Today';
    if (iso === isoDateToday(1)) return 'Tomorrow';
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return year !== new Date().getFullYear() ? `${label}, ${year}` : label;
}

function buildDueDateSpan(iso) {
    const span = document.createElement('span');
    span.className = 'due-date';
    if (isOverdue(iso)) {
        span.classList.add('overdue');
    } else if (iso === isoDateToday()) {
        span.classList.add('today');
    }
    span.textContent = `Due ${humanDueDate(iso)}`;
    return span;
}

// The single writer for persisted tasks: rebuild the list from the DOM and save it
function saveTasks() {
    const tasks = [];
    const taskItems = document.querySelectorAll('#taskList li, #completedTasks li');
    taskItems.forEach(item => {
        const labels = Array.from(item.querySelectorAll('.task-label')).map(label => ({
            name: label.getAttribute('data-label'),
            color: label.style.backgroundColor,
            icon: getLabelIcon(label.getAttribute('data-label'))
        }));

        tasks.push({
            id: item.dataset.taskId || createTaskId(),
            text: item.querySelector('.task-text').textContent,
            completed: item.classList.contains('completed'),
            dueDate: item.dataset.dueDate || null,
            labels: labels,
            createdAt: Number(item.dataset.createdAt) || 0
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateStats();
}

function loadTasks() {
    const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const tasks = Array.isArray(storedTasks) ? storedTasks : [];
    const needsMigration = tasks.some(task => !task || !task.id ||
        (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)));
    tasks.forEach(stored => {
        const task = normalizeTask(stored);
        const li = buildTaskElement(task);
        if (task.completed) {
            document.getElementById('completedTasks').appendChild(li);
        } else {
            document.getElementById('taskList').appendChild(li);
        }
    });
    // Persist ids and ISO dates for tasks stored before they existed
    if (needsMigration) {
        saveTasks();
    }
    organizeTasks(); // Organize tasks after loading
}

// ---------- rendering ----------

// One builder for task rows, shared by addTask and loadTasks so the two
// paths can never drift apart again
function buildTaskElement(task) {
    const li = document.createElement('li');
    li.dataset.taskId = task.id;
    li.dataset.createdAt = task.createdAt || 0;
    if (task.dueDate) {
        li.dataset.dueDate = task.dueDate;
    }

    // Create span for task text
    const textSpan = document.createElement('span');
    textSpan.textContent = task.text;
    textSpan.className = 'task-text';

    // Create a checkmark for task completion
    const checkmark = document.createElement('button');
    checkmark.type = 'button';
    checkmark.className = 'checkmark';
    checkmark.setAttribute('aria-label', 'Mark task complete');
    checkmark.textContent = '✔️';
    checkmark.onclick = function() {
        li.classList.add('completed');
        recordCompletion(1);
        saveTasks();
        moveTask(li);
    };

    // Create an undo button
    const undoButton = document.createElement('button');
    undoButton.type = 'button';
    undoButton.className = 'undo-button';
    undoButton.setAttribute('aria-label', 'Mark task not done');
    undoButton.textContent = '↩️';
    undoButton.onclick = function() {
        li.classList.remove('completed');
        recordCompletion(-1);
        saveTasks();
        moveTask(li);
    };

    // Create a delete button
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.setAttribute('aria-label', 'Delete task');
    deleteButton.textContent = '✖';
    deleteButton.onclick = function() {
        deleteTask(li);
    };

    // Create a container for the buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    buttonContainer.appendChild(undoButton);
    buttonContainer.appendChild(checkmark);
    buttonContainer.appendChild(deleteButton);

    li.appendChild(textSpan);
    if (task.dueDate) {
        li.appendChild(buildDueDateSpan(task.dueDate));
    }
    (task.labels || []).forEach(label => {
        li.appendChild(buildLabelSpan(label));
    });
    li.appendChild(buttonContainer);
    // Completed tasks reload into the Completed list, but they also need
    // the class back -- without it the next save would record them as
    // open again (the save path reads state from the DOM)
    if (task.completed) {
        li.classList.add('completed');
    }
    return li;
}

function buildLabelSpan(label) {
    const span = document.createElement('span');
    span.className = 'task-label';
    span.setAttribute('data-label', label.name);
    span.textContent = `${label.icon} ${label.name}`;
    span.style.backgroundColor = label.color;
    return span;
}

// Add event listener for the "Add Task" button
document.getElementById('addTaskButton').addEventListener('click', function() {
    const taskInput = document.getElementById('taskInput');
    addTask(taskInput.value);
    taskInput.value = ''; // Clear input field
});

// Enter adds a task without reaching for the mouse
document.getElementById('taskInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        addTask(this.value);
        this.value = '';
    }
});

// "/" jumps to search from anywhere outside a text field
document.addEventListener('keydown', function(e) {
    const active = document.activeElement;
    const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    if (e.key === '/' && !typing) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// Function to add a task
function addTask(taskText) {
    const trimmed = taskText.trim();
    if (!trimmed) return;

    const li = buildTaskElement({
        id: createTaskId(),
        text: trimmed,
        completed: false,
        dueDate: null,
        labels: [],
        createdAt: Date.now()
    });
    li.classList.add('task-enter');

    // Add to list and organize immediately
    document.getElementById('taskList').appendChild(li);
    organizeTasks();

    // Handle animation cleanup only
    setTimeout(() => {
        li.classList.remove('task-enter');
    }, 300);

    saveTasks();
}

// Function to move task to completed section
function moveTask(taskElement) {
    taskElement.classList.add('task-exit');

    setTimeout(() => {
        if (taskElement.classList.contains('completed')) {
            document.getElementById('completedTasks').appendChild(taskElement);
        } else {
            document.getElementById('taskList').appendChild(taskElement);
            organizeTasks(); // Only reorganize if task is moved back to active tasks
        }

        taskElement.classList.remove('task-exit');
        taskElement.classList.add('task-enter');

        setTimeout(() => {
            taskElement.classList.remove('task-enter');
        }, 300);
    }, 300);
}

// ---------- deleting with a way back ----------

let pendingUndo = null;
let undoTimer = null;

function deleteTask(taskElement) {
    taskElement.classList.add('task-exit');

    setTimeout(() => {
        const parent = taskElement.classList.contains('completed')
            ? document.getElementById('completedTasks')
            : document.getElementById('taskList');
        pendingUndo = { element: taskElement, parent: parent };
        taskElement.remove();
        saveTasks();
        organizeTasks();
        showToast('Task deleted', undoDelete);
    }, 300);
}

function undoDelete() {
    if (!pendingUndo) return;
    const undo = pendingUndo;
    pendingUndo = null;
    undo.element.classList.remove('task-exit');
    undo.element.classList.add('task-enter');
    undo.parent.appendChild(undo.element);
    organizeTasks();
    setTimeout(() => {
        undo.element.classList.remove('task-enter');
    }, 300);
    hideToast();
    saveTasks();
}

function showToast(message, onUndo) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    document.getElementById('toastUndo').onclick = function() {
        hideToast();
        if (onUndo) onUndo();
    };
    toast.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
    clearTimeout(undoTimer);
    document.getElementById('toast').hidden = true;
}

// ---------- search ----------

// Filter both lists while typing; group headers with no visible tasks hide too
function applySearchFilter(query) {
    document.querySelectorAll('#taskList li, #completedTasks li').forEach(li => {
        const text = li.querySelector('.task-text').textContent.toLowerCase();
        li.classList.toggle('search-hidden', Boolean(query) && !text.includes(query));
    });
    document.querySelectorAll('#taskList .task-group-header').forEach(header => {
        let visible = 0;
        let node = header.nextElementSibling;
        while (node && node.tagName === 'LI') {
            if (!node.classList.contains('search-hidden')) visible++;
            node = node.nextElementSibling;
        }
        header.classList.toggle('search-hidden', Boolean(query) && visible === 0);
    });
    document.querySelectorAll('.task-separator').forEach(separator => {
        separator.classList.toggle('search-hidden', Boolean(query));
    });
    refreshEmptyStates();
}

function refreshEmptyStates() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    syncEmptyState('taskList', 'taskListEmpty',
        query ? 'No active tasks match your search.' : 'Nothing here yet — add a task above.');
    syncEmptyState('completedTasks', 'completedTasksEmpty',
        query ? 'No completed tasks match your search.' : 'Completed tasks will land here.');
}

function syncEmptyState(listId, emptyId, message) {
    const list = document.getElementById(listId);
    const empty = document.getElementById(emptyId);
    if (!list || !empty) return;
    const visible = Array.from(list.querySelectorAll('li:not(.search-hidden)')).length;
    empty.textContent = message;
    empty.hidden = visible > 0;
}

// ---------- stats: open tasks, daily progress, streak ----------

function loadStats() {
    try {
        const stats = JSON.parse(localStorage.getItem('tockStats'));
        if (stats && stats.completions && typeof stats.completions === 'object') return stats;
    } catch (error) {
        // Corrupt stats fall through to a fresh record
    }
    return { completions: {} };
}

function recordCompletion(delta) {
    const stats = loadStats();
    const today = isoDateToday();
    stats.completions[today] = Math.max(0, (stats.completions[today] || 0) + delta);
    localStorage.setItem('tockStats', JSON.stringify(stats));
}

// Consecutive days with at least one completion, ending today (or
// yesterday, so a morning check does not read as "streak broken")
function completionStreak(stats) {
    let streak = 0;
    let day = stats.completions[isoDateToday()] ? 0 : 1;
    while (stats.completions[isoDateToday(-day)]) {
        streak++;
        day++;
    }
    return streak;
}

function updateStats() {
    const statsBar = document.getElementById('statsBar');
    if (!statsBar) return;
    // Rows keep their completed class for 300 ms before moving lists,
    // so count by class, not by which list they sit in right now
    const open = document.querySelectorAll('#taskList li:not(.search-hidden):not(.completed)').length;
    const stats = loadStats();
    const doneToday = stats.completions[isoDateToday()] || 0;
    const streak = completionStreak(stats);

    const parts = [open === 1 ? '1 task left' : `${open} tasks left`];
    if (doneToday > 0) parts.push(doneToday === 1 ? '1 done today' : `${doneToday} done today`);
    if (streak >= 2) parts.push(`🔥 ${streak}-day streak`);

    statsBar.textContent = parts.join(' · ');
    statsBar.hidden = open === 0 && doneToday === 0;
}

// ---------- backup: export and import ----------

function exportTasks() {
    const payload = {
        app: 'tock',
        version: 2,
        exportedAt: new Date().toISOString(),
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        stats: loadStats()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tock-backup-${isoDateToday()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function importTasks() {
    const fileInput = document.getElementById('importInput');
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
        let data;
        try {
            data = JSON.parse(reader.result);
        } catch (error) {
            alert('That file is not valid JSON.');
            return;
        }
        const tasks = Array.isArray(data) ? data : (data && Array.isArray(data.tasks) ? data.tasks : null);
        if (!tasks) {
            alert('No tasks found in that file.');
            return;
        }
        if (!confirm(`Replace the current tasks with ${tasks.length} imported task(s)?`)) return;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        window.location.reload();
    };
    reader.readAsText(file);
}

document.getElementById('exportButton').addEventListener('click', exportTasks);
document.getElementById('importButton').addEventListener('click', function() {
    document.getElementById('importInput').click();
});
document.getElementById('importInput').addEventListener('change', importTasks);

// ---------- sorting ----------

function syncSortToggle() {
    const sortToggle = document.getElementById('sortToggle');
    if (!sortToggle) return;
    const active = localStorage.getItem('tockSort') === 'due';
    sortToggle.setAttribute('aria-pressed', String(active));
    sortToggle.classList.toggle('active', active);
    sortToggle.title = active ? 'Sorting by due date — click for manual order' : 'Sort by due date';
}

document.getElementById('sortToggle').addEventListener('click', function() {
    const next = localStorage.getItem('tockSort') === 'due' ? 'manual' : 'due';
    localStorage.setItem('tockSort', next);
    syncSortToggle();
    organizeTasks();
});

// Function to organize tasks
function organizeTasks() {
    const taskList = document.getElementById('taskList');

    // Store all tasks before clearing
    const tasks = Array.from(taskList.getElementsByTagName('li'));

    // Clear the task list
    taskList.innerHTML = '';

    const sortByDue = localStorage.getItem('tockSort') === 'due';
    const byDueDate = (a, b) => {
        const dueA = a.dataset.dueDate || '9999-12-31';
        const dueB = b.dataset.dueDate || '9999-12-31';
        if (dueA !== dueB) return dueA < dueB ? -1 : 1;
        return (Number(a.dataset.createdAt) || 0) - (Number(b.dataset.createdAt) || 0);
    };

    // Separate labeled and unlabeled tasks
    const unlabeledTasks = [];
    const taskGroups = {
        'Important': [],
        'Work': [],
        'Personal': [],
        'Shopping': [],
        'Health': [],
        'Study': []
    };

    // Sort tasks into groups
    tasks.forEach(task => {
        if (!task.classList.contains('completed')) {
            const labels = Array.from(task.querySelectorAll('.task-label'));
            if (labels.length === 0) {
                unlabeledTasks.push(task);
            } else {
                const primaryLabel = labels[0].getAttribute('data-label');
                if (taskGroups.hasOwnProperty(primaryLabel)) {
                    taskGroups[primaryLabel].push(task);
                } else {
                    unlabeledTasks.push(task);
                }
            }
        }
    });

    if (sortByDue) {
        unlabeledTasks.sort(byDueDate);
        Object.values(taskGroups).forEach(group => group.sort(byDueDate));
    }

    // Add unlabeled tasks first
    unlabeledTasks.forEach(task => {
        taskList.appendChild(task);
    });

    // Add separator if there are both unlabeled and labeled tasks
    const hasLabeledTasks = Object.values(taskGroups).some(group => group.length > 0);
    if (unlabeledTasks.length > 0 && hasLabeledTasks) {
        const separator = document.createElement('div');
        separator.className = 'task-separator';
        taskList.appendChild(separator);
    }

    // Add labeled tasks in groups
    Object.entries(taskGroups).forEach(([label, groupTasks]) => {
        if (groupTasks.length > 0) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'task-group-header';
            const groupIcon = document.createElement('span');
            groupIcon.className = 'group-icon';
            groupIcon.textContent = getLabelIcon(label);
            groupHeader.appendChild(groupIcon);
            groupHeader.appendChild(document.createTextNode(label));
            const taskCount = document.createElement('span');
            taskCount.className = 'task-count';
            taskCount.textContent = `(${groupTasks.length})`;
            groupHeader.appendChild(taskCount);
            taskList.appendChild(groupHeader);

            groupTasks.forEach(task => {
                taskList.appendChild(task);
            });
        }
    });

    refreshEmptyStates();
}
// Helper function to get label icon
function getLabelIcon(label) {
    const icons = {
        'Important': '⚡',
        'Work': '💼',
        'Personal': '👤',
        'Shopping': '🛒',
        'Health': '❤️',
        'Study': '📚',
        'Unlabeled': '📝'
    };
    return icons[label] || '📝';
}

// ---------- context menu ----------

document.addEventListener('DOMContentLoaded', function() {
    let currentTask = null;

    // Function to update context menu based on task labels
    function updateContextMenu(task) {
        // Find or create the Remove Label menu item
        let removeLabelItem = contextMenu.querySelector('.context-menu-item.remove-label');

        if (!removeLabelItem) {
            removeLabelItem = document.createElement('div');
            removeLabelItem.className = 'context-menu-item remove-label';
            removeLabelItem.dataset.action = 'remove-labels';
            removeLabelItem.textContent = '❌ Remove Labels';
            contextMenu.appendChild(removeLabelItem);
        }

        // Show/hide based on whether the task has labels
        const hasLabels = task.querySelectorAll('.task-label').length > 0;
        removeLabelItem.style.display = hasLabels ? 'flex' : 'none';
    }

    // Show context menu on right click
    document.addEventListener('contextmenu', function(e) {
        const taskItem = e.target.closest('li');
        if (taskItem) {
            e.preventDefault();
            currentTask = taskItem;

            // Update context menu items
            updateContextMenu(taskItem);

            // Position the menu
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.classList.add('active');
        }
    });

    // Hide context menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            contextMenu.classList.remove('active');
        }
    });

    // Handle context menu actions
    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const action = this.dataset.action;

            if (action === 'add-label') {
                e.stopPropagation(); // Prevent event from bubbling up

                // Create and show label menu
                const labelMenu = document.createElement('div');
                labelMenu.className = 'label-menu';

                const labels = [
                    { name: 'Important', color: '#ff4444', icon: '⚡' },
                    { name: 'Personal', color: '#4CAF50', icon: '👤' },
                    { name: 'Work', color: '#2196F3', icon: '💼' },
                    { name: 'Shopping', color: '#9C27B0', icon: '🛒' },
                    { name: 'Health', color: '#E91E63', icon: '❤️' },
                    { name: 'Study', color: '#FF9800', icon: '📚' }
                ];

                labels.forEach(label => {
                    const labelItem = document.createElement('div');
                    labelItem.className = 'label-item';
                    labelItem.textContent = `${label.icon} ${label.name}`;

                    labelItem.addEventListener('click', () => {
                        toggleLabel(currentTask, label);
                        labelMenu.remove();
                        contextMenu.classList.remove('active');
                        updateContextMenu(currentTask); // Update menu after adding label
                    });

                    labelMenu.appendChild(labelItem);
                });

                // Position label menu next to context menu
                const rect = this.getBoundingClientRect();
                labelMenu.style.position = 'fixed';
                labelMenu.style.left = `${rect.right + 5}px`;
                labelMenu.style.top = `${rect.top}px`;
                document.body.appendChild(labelMenu);

                // Close label menu when clicking outside
                const closeLabels = function(e) {
                    if (!labelMenu.contains(e.target) && !contextMenu.contains(e.target)) {
                        labelMenu.remove();
                        contextMenu.classList.remove('active');
                        document.removeEventListener('click', closeLabels);
                    }
                };

                setTimeout(() => {
                    document.addEventListener('click', closeLabels);
                }, 0);

                return;
            } else if (action === 'remove-labels') {
                if (currentTask) {
                    const labels = currentTask.querySelectorAll('.task-label');
                    labels.forEach(label => label.remove());
                    saveTasks();
                    organizeTasks();
                }
                contextMenu.classList.remove('active');
                return;
            }

            // Handle other menu items
            switch(action) {
                case 'edit':
                    if (currentTask) {
                        const taskTextSpan = currentTask.querySelector('.task-text');
                        const currentText = taskTextSpan.textContent;

                        // Disable controls during editing
                        const controls = currentTask.querySelectorAll('.checkmark, .delete-button, .undo-button');
                        controls.forEach(control => {
                            control.style.pointerEvents = 'none';
                            control.style.opacity = '0.5';
                        });

                        // Create input field
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = currentText;
                        input.className = 'edit-task-input';

                        // Replace text with input
                        taskTextSpan.textContent = '';
                        taskTextSpan.appendChild(input);
                        input.focus();

                        // Handle saving on enter or blur
                        input.addEventListener('keyup', function(e) {
                            if (e.key === 'Enter') {
                                saveEdit(input, taskTextSpan, currentText);
                                // Re-enable controls after saving
                                controls.forEach(control => {
                                    control.style.pointerEvents = 'auto';
                                    control.style.opacity = '1';
                                });
                            }
                            if (e.key === 'Escape') {
                                taskTextSpan.textContent = currentText;
                                // Re-enable controls after canceling
                                controls.forEach(control => {
                                    control.style.pointerEvents = 'auto';
                                    control.style.opacity = '1';
                                });
                            }
                        });

                        input.addEventListener('blur', function() {
                            saveEdit(input, taskTextSpan, currentText);
                            // Re-enable controls after saving
                            controls.forEach(control => {
                                control.style.pointerEvents = 'auto';
                                control.style.opacity = '1';
                            });
                        });
                    }
                    break;

                case 'due-date':
                    if (currentTask) {
                        const dateInput = document.createElement('input');
                        dateInput.type = 'date';
                        dateInput.className = 'date-picker';

                        // Get tomorrow's date as default
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        dateInput.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

                        // Show date picker and handle selection
                        dateInput.style.position = 'absolute';
                        dateInput.style.left = contextMenu.style.left;
                        dateInput.style.top = contextMenu.style.top;
                        document.body.appendChild(dateInput);

                        // Automatically open the calendar
                        setTimeout(() => {
                            dateInput.showPicker();
                        }, 0);

                        dateInput.addEventListener('change', function() {
                            setDueDate(currentTask, this.value);
                            dateInput.remove();
                        });

                        dateInput.addEventListener('blur', function() {
                            dateInput.remove();
                        });
                    }
                    break;

                case 'delete':
                    if (currentTask) {
                        deleteTask(currentTask);
                    }
                    break;
            }

            contextMenu.classList.remove('active');
        });
    });

    // Dark mode initialization
    const darkModeToggle = document.getElementById('darkModeToggle');
    const root = document.documentElement;

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme === 'dark');

    // Dark mode toggle
    darkModeToggle.addEventListener('click', function() {
        const isDark = root.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(!isDark);
    });

    // Toggle stopwatch display
    document.getElementById('stopwatchToggle').addEventListener('click', function() {
        stopwatch.classList.toggle('hidden');
    });

    // Search filter
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        applySearchFilter(this.value.trim().toLowerCase());
    });
});

// Helper function to update theme icon
function updateThemeIcon(isDark) {
    const icon = document.querySelector('#darkModeToggle');
    icon.textContent = isDark ? '☀️' : '🌙';
    icon.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

// Function to save edited task
function saveEdit(input, taskTextSpan, originalText) {
    const newText = input.value.trim();
    if (newText && newText !== originalText) {
        taskTextSpan.textContent = newText;
        saveTasks();
    } else {
        taskTextSpan.textContent = originalText;
    }
}

// Function to set due date. The ISO value lives on the li so the save
// path never has to parse rendered text back into data.
function setDueDate(taskElement, dateString) {
    if (!dateString) return;
    taskElement.dataset.dueDate = dateString;
    const existing = taskElement.querySelector('.due-date');
    if (existing) {
        existing.remove();
    }
    taskElement.insertBefore(buildDueDateSpan(dateString), taskElement.querySelector('.button-container'));
    saveTasks();
}

// Function to toggle a label on a task
function toggleLabel(taskElement, label) {
    const existingLabel = taskElement.querySelector(`.task-label[data-label="${label.name}"]`);

    if (existingLabel) {
        existingLabel.remove();
    } else {
        const labelElement = buildLabelSpan(label);

        // Insert label after task text
        const taskText = taskElement.querySelector('.task-text');
        taskText.insertAdjacentElement('afterend', labelElement);
    }

    saveTasks();
    organizeTasks(); // Call organizeTasks immediately after updating the label
}

// ---------- stopwatch ----------

// State lives in localStorage, so the count survives a reload, and a
// running timer keeps counting the time the page was closed
// (focused-work sessions outlive accidental refreshes)
let stopwatchState = loadStopwatchState();
let stopwatchTimer = null;

function loadStopwatchState() {
    try {
        const state = JSON.parse(localStorage.getItem('tockStopwatch'));
        if (state && typeof state.elapsed === 'number') {
            return { elapsed: state.elapsed, runningSince: state.runningSince || null };
        }
    } catch (error) {
        // Corrupt state falls through to a fresh timer
    }
    return { elapsed: 0, runningSince: null };
}

function stopwatchSeconds() {
    return stopwatchState.elapsed +
        (stopwatchState.runningSince ? Math.floor((Date.now() - stopwatchState.runningSince) / 1000) : 0);
}

function saveStopwatchState() {
    localStorage.setItem('tockStopwatch', JSON.stringify(stopwatchState));
}

function updateStopwatchDisplay() {
    const total = stopwatchSeconds();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    document.getElementById('stopwatchDisplay').textContent =
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Show Start while idle; show Stop and Reset while running
function syncStopwatchButtons() {
    const running = Boolean(stopwatchState.runningSince);
    document.getElementById('startStopwatch').hidden = running;
    document.getElementById('stopStopwatch').hidden = !running;
    document.getElementById('resetStopwatch').hidden = !running && stopwatchState.elapsed === 0;
}

function startStopwatchTicker() {
    clearInterval(stopwatchTimer);
    stopwatchTimer = setInterval(updateStopwatchDisplay, 1000);
}

// Start button functionality
document.getElementById('startStopwatch').addEventListener('click', function() {
    if (stopwatchState.runningSince) return;
    stopwatchState.runningSince = Date.now();
    saveStopwatchState();
    syncStopwatchButtons();
    startStopwatchTicker();
});

// Stop button functionality
document.getElementById('stopStopwatch').addEventListener('click', function() {
    if (!stopwatchState.runningSince) return;
    stopwatchState.elapsed = stopwatchSeconds();
    stopwatchState.runningSince = null;
    saveStopwatchState();
    syncStopwatchButtons();
    clearInterval(stopwatchTimer);
});

// Reset button functionality
document.getElementById('resetStopwatch').addEventListener('click', function() {
    stopwatchState = { elapsed: 0, runningSince: null };
    saveStopwatchState();
    syncStopwatchButtons();
    clearInterval(stopwatchTimer);
    updateStopwatchDisplay();
});

updateStopwatchDisplay();
syncStopwatchButtons();
if (stopwatchState.runningSince) {
    startStopwatchTicker();
}
