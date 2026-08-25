const stopwatch = document.getElementById('stopwatch');

// Load tasks from local storage when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadTasks(); // Load tasks first

    const stopwatchToggle = document.getElementById('stopwatchToggle');

    // Stopwatch functionality
    let timer; // Variable to hold the timer
    let elapsedTime = 0; // Time in seconds

    // Function to update the stopwatch display
    function updateStopwatchDisplay() {
        const display = document.getElementById('stopwatchDisplay');
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = elapsedTime % 60;
        display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Start button functionality
    document.getElementById('startStopwatch').addEventListener('click', function() {
        if (!timer) { // Only start if not already running
            timer = setInterval(function() {
                elapsedTime++;
                updateStopwatchDisplay();
            }, 1000);
        }
    });

    // Stop button functionality
    document.getElementById('stopStopwatch').addEventListener('click', function() {
        clearInterval(timer);
        timer = null; // Reset timer variable
    });

    // Reset button functionality
    document.getElementById('resetStopwatch').addEventListener('click', function() {
        clearInterval(timer);
        timer = null; // Reset timer variable
        elapsedTime = 0; // Reset elapsed time
        updateStopwatchDisplay(); // Update display to show 00:00:00
    });
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
        updateLocalStorage();
        moveTask(li);
    };

    // Create an undo button
    const undoButton = document.createElement('span');
    undoButton.textContent = '↩️';
    undoButton.className = 'undo-button';
    undoButton.onclick = function() {
        li.classList.remove('completed');
        updateLocalStorage();
        moveTask(li);
    };

    // Create a delete button
    const deleteButton = document.createElement('span');
    deleteButton.textContent = 'X';
    deleteButton.className = 'delete-button';
    deleteButton.onclick = function() {
        deleteTask(taskText, li);
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
    
    saveTaskToLocalStorage(taskText);
}

// Function to save task to local storage
function saveTaskToLocalStorage(taskText) {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.push({ text: taskText, completed: false }); // Store completion status
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Function to load tasks from local storage
function loadTasks() {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.forEach(task => {
        const li = document.createElement('li');
        
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
            updateLocalStorage();
            moveTask(li);
        };

        // Create an undo button
        const undoButton = document.createElement('span');
        undoButton.textContent = '↩️';  // Unicode undo arrow
        undoButton.className = 'undo-button';
        undoButton.onclick = function() {
            li.classList.remove('completed');
            updateLocalStorage();
            moveTask(li);
        };

        // Create a delete button as an "X"
        const deleteButton = document.createElement('span');
        deleteButton.textContent = 'X';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = function() {
            deleteTask(task.text, li);
        };

        // Create a container for the buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttonContainer.appendChild(undoButton);
        buttonContainer.appendChild(checkmark);
        buttonContainer.appendChild(deleteButton);

        li.appendChild(textSpan);

        // Labels were being saved (updateLocalStorage already records
        // them) but never redrawn here, so they silently vanished on
        // every reload -- the same class of bug as the missing tasks,
        // just smaller.
        if (task.labels && task.labels.length) {
            task.labels.forEach(label => {
                const labelElement = document.createElement('span');
                labelElement.className = 'task-label';
                labelElement.setAttribute('data-label', label.name);
                labelElement.innerHTML = `${label.icon} ${label.name}`;
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
function deleteTask(taskText, taskElement) {
    taskElement.classList.add('task-exit');
    
    setTimeout(() => {
        taskElement.remove();
        // Remove from local storage
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks = tasks.filter(task => task.text !== taskText);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        organizeTasks();
    }, 300);
}

// Function to update local storage after toggling completion
function updateLocalStorage() {
    const tasks = [];
    const taskItems = document.querySelectorAll('#taskList li, #completedTasks li');
    taskItems.forEach(item => {
        const taskText = item.querySelector('.task-text').textContent;
        const completed = item.classList.contains('completed');
        const dueDate = item.querySelector('.due-date')?.textContent.split('Due: ')[1] || null;
        const labels = Array.from(item.querySelectorAll('.task-label')).map(label => ({
            name: label.getAttribute('data-label'),
            color: label.style.backgroundColor,
            icon: label.innerHTML.split(' ')[0]
        }));
        
        tasks.push({ 
            text: taskText, 
            completed: completed,
            dueDate: dueDate,
            labels: labels
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
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
                    updateLocalStorage();
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
                    labelItem.innerHTML = `${label.icon} ${label.name}`;
                    
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
                    updateLocalStorage();
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
                    deleteTask(currentTask.querySelector('.task-text').textContent, currentTask);
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
        updateLocalStorage();
    } else {
        taskTextSpan.textContent = originalText;
    }
}

// Function to set due date
function setDueDate(taskElement, dateString) {
    let dueDateSpan = taskElement.querySelector('.due-date');
    if (!dueDateSpan) {
        dueDateSpan = document.createElement('span');
        dueDateSpan.className = 'due-date';
        taskElement.appendChild(dueDateSpan);
    }
    
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    
    dueDateSpan.textContent = `Due: ${formattedDate}`;
    updateLocalStorage();
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
        labelElement.innerHTML = `${label.icon} ${label.name}`;
        labelElement.style.backgroundColor = label.color;
        
        // Insert label after task text
        const taskText = taskElement.querySelector('.task-text');
        taskText.insertAdjacentElement('afterend', labelElement);
    }
    
    updateLocalStorage();
    organizeTasks(); // Call organizeTasks immediately after updating the label
}

// Update the updateLocalStorage function to include labels
function updateLocalStorage() {
    const tasks = [];
    const taskItems = document.querySelectorAll('#taskList li, #completedTasks li');
    taskItems.forEach(item => {
        const taskText = item.querySelector('.task-text').textContent;
        const completed = item.classList.contains('completed');
        const dueDate = item.querySelector('.due-date')?.textContent.split('Due: ')[1] || null;
        const labels = Array.from(item.querySelectorAll('.task-label')).map(label => ({
            name: label.getAttribute('data-label'),
            color: label.style.backgroundColor,
            icon: label.innerHTML.split(' ')[0]
        }));
        
        tasks.push({ 
            text: taskText, 
            completed: completed,
            dueDate: dueDate,
            labels: labels
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
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
            groupHeader.innerHTML = `
                <span class="group-icon">${getLabelIcon(label)}</span>
                ${label}
                <span class="task-count">(${groupTasks.length})</span>
            `;
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

// Hide the stopwatch by default
document.addEventListener('DOMContentLoaded', function() {
    stopwatch.classList.add('hidden'); // Ensure it's hidden on page load
});

let timer; // Variable to hold the timer
let elapsedTime = 0; // Time in seconds

// Function to update the stopwatch display
function updateStopwatchDisplay() {
    const display = document.getElementById('stopwatchDisplay');
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Start button functionality
document.getElementById('startStopwatch').addEventListener('click', function() {
    if (!timer) { // Only start if not already running
        timer = setInterval(function() {
            elapsedTime++;
            updateStopwatchDisplay();
        }, 1000);
    }
});

// Stop button functionality
document.getElementById('stopStopwatch').addEventListener('click', function() {
    clearInterval(timer);
    timer = null; // Reset timer variable
});

// Reset button functionality
document.getElementById('resetStopwatch').addEventListener('click', function() {
    clearInterval(timer);
    timer = null; // Reset timer variable
    elapsedTime = 0; // Reset elapsed time
    updateStopwatchDisplay(); // Update display to show 00:00:00
});

