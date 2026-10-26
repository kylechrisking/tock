const stopwatch = document.getElementById('stopwatch');

// Load tasks from local storage when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTasks(); // Load tasks first
});

// Add event listener for the "Add Task" button
document.getElementById('addTaskButton').addEventListener('click', function() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value;

    if (taskText) {
        addTask(taskText);
        taskInput.value = ''; // Clear input field
    }
});

// Function to add a task
// Update the addTask function
function addTask(taskText) {
    const li = document.createElement('li');
    li.dataset.taskId = createTaskId();
    li.classList.add('task-enter');
    
    // Create span for task text
    const textSpan = document.createElement('span');
    textSpan.textContent = taskText;
    textSpan.className = 'task-text';

    // Create a checkmark for task completion
    const checkmark = document.createElement('span');
    checkmark.textContent = '✔️';
    checkmark.className = 'checkmark';
    checkmark.onclick = function() {
        li.classList.toggle('completed');
        saveTasks();
        moveTask(li);
    };

    // Create an undo button
    const undoButton = document.createElement('span');
    undoButton.textContent = '↩️';
    undoButton.className = 'undo-button';
    undoButton.onclick = function() {
        li.classList.remove('completed');
        saveTasks();
        moveTask(li);
    };

    // Create a delete button
    const deleteButton = document.createElement('span');
    deleteButton.textContent = 'X';
    deleteButton.className = 'delete-button';
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
    li.appendChild(buttonContainer);
    
    // Add to list and organize immediately
    document.getElementById('taskList').appendChild(li);
    organizeTasks();
    
    // Handle animation cleanup only
    setTimeout(() => {
        li.classList.remove('task-enter');
    }, 300);
    
    saveTasks();
}

// Function to load tasks from local storage
function loadTasks() {
    const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const tasks = Array.isArray(storedTasks) ? storedTasks : [];
    const needsIdMigration = tasks.some(task => !task || !task.id ||
        (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)));
    tasks.forEach(stored => {
        const task = normalizeTask(stored);
        const li = document.createElement('li');
        li.dataset.taskId = task.id;
        if (task.dueDate) {
            li.dataset.dueDate = task.dueDate;
        }
        
        // Create span for task text
        const textSpan = document.createElement('span');
        textSpan.textContent = task.text;
        textSpan.className = 'task-text';

        // Create a checkmark for task completion
        const checkmark = document.createElement('span');
        checkmark.textContent = '✔️';
        checkmark.className = 'checkmark';
        checkmark.onclick = function() {
            li.classList.toggle('completed');
            saveTasks();
            moveTask(li);
        };

        // Create an undo button
        const undoButton = document.createElement('span');
        undoButton.textContent = '↩️';  // Unicode undo arrow
        undoButton.className = 'undo-button';
        undoButton.onclick = function() {
            li.classList.remove('completed');
            saveTasks();
            moveTask(li);
        };

        // Create a delete button as an "X"
        const deleteButton = document.createElement('span');
        deleteButton.textContent = 'X';
        deleteButton.className = 'delete-button';
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

        // Due dates were saved but never redrawn after a reload; the
        // span also carries the plain-language label and overdue state
        if (task.dueDate) {
            li.appendChild(buildDueDateSpan(task.dueDate));
        }

        // Labels were being saved (saveTasks already records
        // them) but never redrawn here, so they silently vanished on
        // every reload -- the same class of bug as the missing tasks,
        // just smaller.
        if (task.labels && task.labels.length) {
            task.labels.forEach(label => {
                const labelElement = document.createElement('span');
                labelElement.className = 'task-label';
                labelElement.setAttribute('data-label', label.name);
                labelElement.textContent = `${label.icon} ${label.name}`;
                labelElement.style.backgroundColor = label.color;
                li.appendChild(labelElement);
            });
        }

        li.appendChild(buttonContainer);

        if (task.completed) {
            li.classList.add('completed');
            document.getElementById('completedTasks').appendChild(li);
        } else {
            document.getElementById('taskList').appendChild(li);
        }
    });
    // Persist ids for tasks stored before ids existed
    if (needsIdMigration) {
        saveTasks();
    }
    organizeTasks(); // Organize tasks after loading
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

// Function to delete a task
function deleteTask(taskElement) {
    taskElement.classList.add('task-exit');
    
    setTimeout(() => {
        taskElement.remove();
        saveTasks();
        organizeTasks();
    }, 300);
}

// The single writer for persisted tasks: rebuild the list from the DOM and save it
function saveTasks() {
    const tasks = [];
    const taskItems = document.querySelectorAll('#taskList li, #completedTasks li');
    taskItems.forEach(item => {
        const taskText = item.querySelector('.task-text').textContent;
        const completed = item.classList.contains('completed');
        const dueDate = item.dataset.dueDate || null;
        const labels = Array.from(item.querySelectorAll('.task-label')).map(label => ({
            name: label.getAttribute('data-label'),
            color: label.style.backgroundColor,
            icon: getLabelIcon(label.getAttribute('data-label'))
        }));

        tasks.push({
            id: item.dataset.taskId || createTaskId(),
            text: taskText,
            completed: completed,
            dueDate: dueDate,
            labels: labels
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

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
        labels: Array.isArray(stored && stored.labels) ? stored.labels : []
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

// Context Menu Implementation
document.addEventListener('DOMContentLoaded', function() {
    const contextMenu = document.querySelector('.context-menu');
    let currentTask = null;

    // Function to update context menu based on task labels
    function updateContextMenu(task) {
        // Find or create the Remove Label menu item
        let removeLabelItem = contextMenu.querySelector('.context-menu-item.remove-label');
        
        if (!removeLabelItem) {
            removeLabelItem = document.createElement('div');
            removeLabelItem.className = 'context-menu-item remove-label';
            removeLabelItem.innerHTML = '<i class="fas fa-times"></i>Remove Labels'; // Using X icon
            contextMenu.appendChild(removeLabelItem);

            // Add click handler for remove labels
            removeLabelItem.addEventListener('click', function() {
                if (currentTask) {
                    const labels = currentTask.querySelectorAll('.task-label');
                    labels.forEach(label => label.remove());
                    saveTasks();
                    organizeTasks(); // Reorganize tasks after removing labels
                }
            });
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
            const action = this.textContent.trim();
            
            if (action === 'Add Label') {
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
            } else if (action === 'Remove Labels') {
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
                case 'Edit Task':
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

                case 'Set Due Date':
                    if (currentTask) {
                        const dateInput = document.createElement('input');
                        dateInput.type = 'date';
                        dateInput.className = 'date-picker';
                        
                        // Get tomorrow's date as default
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        dateInput.value = tomorrow.toISOString().split('T')[0];
                        
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

                case 'Delete Task':
                    deleteTask(currentTask);
                    contextMenu.classList.remove('active');
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

    // Hide the stopwatch by default
    stopwatch.classList.add('hidden');

    // Toggle stopwatch display
    stopwatchToggle.addEventListener('click', function() {
        stopwatch.classList.toggle('hidden');
    });
});

// Helper function to update theme icon
function updateThemeIcon(isDark) {
    const icon = document.querySelector('#darkModeToggle i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
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
        const labelElement = document.createElement('span');
        labelElement.className = 'task-label';
        labelElement.setAttribute('data-label', label.name);
        labelElement.textContent = `${label.icon} ${label.name}`;
        labelElement.style.backgroundColor = label.color;
        
        // Insert label after task text
        const taskText = taskElement.querySelector('.task-text');
        taskText.insertAdjacentElement('afterend', labelElement);
    }
    
    saveTasks();
    organizeTasks(); // Call organizeTasks immediately after updating the label
}

// Function to organize tasks
function organizeTasks() {
    const taskList = document.getElementById('taskList');
    
    // Store all tasks before clearing
    const tasks = Array.from(taskList.getElementsByTagName('li'));
    
    // Clear the task list
    taskList.innerHTML = '';
    
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

// Stopwatch. State lives in localStorage, so the count survives a
// reload, and a running timer keeps counting the time the page was
// closed (focused-work sessions outlive accidental refreshes).
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

