// components/Tasks.js
import { useGlobal } from "../composables/useGlobal.js";
import { useHistory } from "../composables/useHistory.js";
import { useRealTime } from "../composables/useRealTime.js";
import { useModels } from "../composables/useModels.js";

export default {
  name: "Tasks",
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden md:flex-row">
      <!-- Task Lists Sidebar -->
      <div class="w-full md:w-1/4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <!-- Header with Add Button and Agent Dropdown -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-900">
          <button
            @click="addTaskList"
            class="p-2 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm"
          >
            <i class="pi pi-plus"></i>
          </button>
          <select
            v-model="selectedAgentId"
            class="flex-1 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            :disabled="!entities?.agents?.length"
          >
            <option v-for="agent in entities?.agents || []" :key="agent.id" :value="agent.id">
              {{ agent.data.name }}
            </option>
            <option v-if="!entities?.agents?.length" disabled>No agents available</option>
          </select>
        </div>

        <!-- Task Lists List (Accordion on Mobile, Full List on Desktop) -->
        <div class="flex-1 bg-gray-50 dark:bg-gray-900">
          <!-- Mobile: Accordion -->
          <div v-if="isMobile" class="flex flex-col h-full">
            <div
              class="p-4 flex items-center justify-between cursor-pointer bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
              @click="toggleAccordion"
            >
              <span class="text-gray-900 dark:text-white font-medium truncate">
                {{ currentTaskListName || 'Task Lists' }}
              </span>
              <i :class="accordionIcon" class="text-gray-500 dark:text-gray-400 text-lg"></i>
            </div>
            <div
              v-if="isAccordionOpen"
              class="overflow-y-auto"
              style="max-height: 12rem;"
            >
              <div
                v-for="taskList in entities.taskLists"
                :key="taskList.id"
                class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
                :class="{ 'bg-blue-50 dark:bg-blue-900': activeTaskListId === taskList.id }"
                @click="selectTaskList(taskList.id)"
              >
                <div class="flex-1 truncate">
                  <span v-if="isEditingTaskList !== taskList.id" class="text-gray-900 dark:text-white font-medium">
                    {{ taskList.data.name }}
                  </span>
                  <input
                    v-else
                    v-model="taskList.data.name"
                    type="text"
                    class="bg-transparent text-gray-900 dark:text-white flex-1 outline-none font-medium w-full"
                    @blur="updateTaskList(taskList)"
                    @keypress.enter="updateTaskList(taskList)"
                    :id="'tasklist-input-' + taskList.id"
                  />
                </div>
                <div class="flex gap-2">
                  <button @click.stop="editTaskListName(taskList)" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button @click.stop="deleteTaskList(taskList.id)" class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-600">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
              <div v-if="!entities.taskLists.length" class="p-4 text-gray-500 dark:text-gray-400 text-center">
                No task lists yet. Create one to start managing tasks.
              </div>
            </div>
          </div>

          <!-- Desktop: Full List -->
          <div v-else class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div
              v-for="taskList in entities.taskLists"
              :key="taskList.id"
              class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
              :class="{ 'bg-blue-50 dark:bg-blue-900': activeTaskListId === taskList.id }"
              @click="selectTaskList(taskList.id)"
            >
              <div class="flex-1 truncate">
                <span v-if="isEditingTaskList !== taskList.id" class="text-gray-900 dark:text-white font-medium">
                  {{ taskList.data.name }}
                </span>
                <input
                  v-else
                  v-model="taskList.data.name"
                  type="text"
                  class="bg-transparent text-gray-900 dark:text-white flex-1 outline-none font-medium w-full"
                  @blur="updateTaskList(taskList)"
                  @keypress.enter="updateTaskList(taskList)"
                  :id="'tasklist-input-' + taskList.id"
                />
              </div>
              <div class="flex gap-2">
                <button @click.stop="editTaskListName(taskList)" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                  <i class="pi pi-pencil"></i>
                </button>
                <button @click.stop="deleteTaskList(taskList.id)" class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-600">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>
            <div v-if="!entities.taskLists.length" class="p-4 text-gray-500 dark:text-gray-400 text-center">
              No task lists yet. Create one to start managing tasks.
            </div>
          </div>
        </div>
      </div>

      <!-- Task Area -->
      <div class="flex-1 flex flex-col relative">
        <!-- Tasks Display -->
        <div
          ref="taskContainer"
          class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-6 pt-6 pb-4"
          :style="taskContainerStyle"
        >
          <div v-if="isGenerating" class="mb-6 p-4 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 max-w-[80%] text-center">
            <span class="font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Generating Task List...</span>
          </div>
          <div
            v-for="task in activeTasks"
            :key="task.id"
            class="mb-4 p-4 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 max-w-[80%]"
          >
            <div class="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                v-model="task.data.completed"
                @change="markTaskCompleted(task)"
                class="h-5 w-5 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <span class="font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">{{ task.data.title }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatTime(task.timestamp) }}</span>
              <span v-if="task.data.completed" class="text-xs text-green-500">Completed by {{ task.data.displayName || 'Unknown' }}</span>
            </div>
            <div class="text-left" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
              <p><strong>Description:</strong> {{ task.data.description }}</p>
              <p v-if="task.data.comment"><strong>Comment:</strong> {{ task.data.comment }}</p>
              <textarea
                v-if="isEditingComment === task.id"
                v-model="task.data.comment"
                class="w-full p-2 mt-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="Add a comment..."
                @blur="updateTaskComment(task)"
                @keypress.enter="updateTaskComment(task)"
              ></textarea>
            </div>
            <div class="flex gap-2 mt-2">
              <button
                @click.stop="editTaskComment(task)"
                class="text-gray-400 hover:text-blue-500 rounded-full p-1"
                :class="darkMode ? 'bg-gray-700' : 'bg-gray-200'"
                title="Edit comment"
              >
                <i class="pi pi-comment text-sm"></i>
              </button>
              <button
                @click.stop="deleteTask(task.id)"
                class="text-red-400 hover:text-red-300 rounded-full p-1"
                :class="darkMode ? 'bg-gray-700' : 'bg-gray-200'"
                title="Delete task"
              >
                <i class="pi pi-times text-sm"></i>
              </button>
            </div>
          </div>
          <div v-if="!activeTasks.length && !isGenerating" class="text-gray-500 dark:text-gray-400 text-center py-12">
            No tasks in this list. Create a task or generate tasks with an agent!
          </div>
        </div>

        <!-- Task Input Area (Fixed at Bottom) -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-full sticky bottom-0 z-10">
          <!-- Manual Task Creation Form -->
          <div v-if="showManualTaskForm" class="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <h4 class="text-lg font-semibold mb-2" :class="darkMode ? 'text-white' : 'text-gray-900'">Add Manual Task</h4>
            <input
              v-model="manualTask.title"
              type="text"
              class="w-full p-2 mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="Task title"
            />
            <textarea
              v-model="manualTask.description"
              class="w-full p-2 mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="Task description"
              rows="3"
            ></textarea>
            <textarea
              v-model="manualTask.comment"
              class="w-full p-2 mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
              placeholder="Optional comment"
              rows="2"
            ></textarea>
            <div class="flex gap-2">
              <button
                @click="addManualTask"
                class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                :disabled="!manualTask.title.trim()"
              >
                Add Task
              </button>
              <button
                @click="showManualTaskForm = false"
                class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Task Input -->
          <div class="flex gap-3">
            <textarea
              v-model="draft"
              rows="2"
              class="flex-1 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all resize-none whitespace-pre-wrap"
              placeholder="Type a task generation request (e.g., 'Generate tasks for project planning') or click Add Manual Task..."
              @keypress.enter="handleEnterKey"
            ></textarea>
            <button
              @click="sendTaskRequest"
              class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              :disabled="!draft.trim() || !selectedAgentId || isSending"
            >
              Send
            </button>
            <button
              @click="showManualTaskForm = true"
              class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all"
            >
              Add Manual Task
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props) {
    console.log("Tasks.js setup called");
    const { entities } = useGlobal();
    const { addEntity, updateEntity, removeEntity } = useHistory();
    const { triggerLLM, userUuid, displayName, on, isConnected } = useRealTime();
    const { models } = useModels();
    const activeTaskListId = Vue.ref(null);
    const selectedAgentId = Vue.ref(null);
    const draft = Vue.ref("");
    const isSending = Vue.ref(false);
    const isGenerating = Vue.ref(false);
    const isEditingTaskList = Vue.ref(null);
    const isEditingComment = Vue.ref(null);
    const taskContainer = Vue.ref(null);
    const isAutoScrollEnabled = Vue.ref(true);
    const isMobile = Vue.ref(false);
    const isAccordionOpen = Vue.ref(false);
    const showManualTaskForm = Vue.ref(false);
    const manualTask = Vue.ref({ title: "", description: "", comment: "" });
    const pendingTaskLists = Vue.ref({}); // Store pending task lists by taskListId

    // Compute the current task list name
    const currentTaskListName = Vue.computed(() => {
      if (!activeTaskListId.value) return null;
      const taskList = entities.value.taskLists.find(s => s.id === activeTaskListId.value);
      return taskList ? taskList.data.name : null;
    });

    // Compute task container style based on mobile detection
    const taskContainerStyle = Vue.computed(() => ({
      maxHeight: isMobile.value ? 'calc(100vh - 22rem)' : 'calc(100vh - 13rem)',
    }));

    // Compute accordion icon based on open state
    const accordionIcon = Vue.computed(() =>
      isAccordionOpen.value ? 'pi pi-chevron-circle-up' : 'pi pi-chevron-circle-down'
    );

    // Compute active tasks for the selected task list, ordered by data.order
    const activeTasks = Vue.computed(() => {
      if (!activeTaskListId.value) return [];
      return entities.value.tasks
        .filter((task) => task.data.taskList === activeTaskListId.value && !task.data.isStreaming)
        .sort((a, b) => a.data.order - b.data.order); // Sort by data.order instead of timestamp
    });

    // Detect mobile devices
    function detectMobile() {
      const mobileWidthThreshold = 768; // Tailwind's 'md' breakpoint
      isMobile.value = window.innerWidth <= mobileWidthThreshold;
    }

    // Toggle accordion
    function toggleAccordion() {
      isAccordionOpen.value = !isAccordionOpen.value;
    }

    // Auto-scroll logic
    function handleScroll() {
      if (!taskContainer.value) return;
      const container = taskContainer.value;
      const threshold = 50; // Pixels from bottom to consider "docked"
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      isAutoScrollEnabled.value = isAtBottom;
    }

    function handleResize() {
      if (taskContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          taskContainer.value.scrollTop = taskContainer.value.scrollHeight;
        });
      }
    }

    // Initialize mobile detection and event listeners
    Vue.onMounted(() => {
      console.log("Tasks.js mounted");
      detectMobile();
      window.addEventListener('resize', detectMobile);
      if (entities.value?.agents?.length > 0 && !selectedAgentId.value) {
        selectedAgentId.value = entities.value.agents[0].id;
      }
      if (taskContainer.value) {
        taskContainer.value.addEventListener('scroll', handleScroll);
      }
      window.addEventListener('resize', handleResize);

      // Listen for llm-end events
      on('llm-end', (eventObj) => {
        console.log("Received llm-end event:", eventObj);
        if (eventObj.data.entityType === "taskLists" && pendingTaskLists.value[eventObj.id]) {
          const taskListId = eventObj.id; // taskListId is the same as eventObj.id for taskLists
          const taskList = entities.value.taskLists.find(tl => tl.id === taskListId);
          if (taskList) {
            console.log("Processing llm-end for taskList:", taskList);
            processLLMResponse(eventObj, taskListId);
          }
        }
      });
    });

    Vue.onUnmounted(() => {
      console.log("Tasks.js unmounted");
      window.removeEventListener('resize', detectMobile);
      if (taskContainer.value) {
        taskContainer.value.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleResize);
    });

    // Watch for task list changes to auto-select the first task list
    Vue.watch(
      () => entities.value.taskLists,
      (taskLists) => {
        console.log("Task lists changed:", taskLists);
        if (taskLists.length && !activeTaskListId.value) {
          activeTaskListId.value = taskLists[0].id;
        }
      },
      { immediate: true }
    );

    // Watch for agent changes to auto-select the first agent
    Vue.watch(
      () => entities.value?.agents,
      (agents) => {
        if (agents?.length > 0 && !selectedAgentId.value) {
          selectedAgentId.value = agents[0].id;
        }
      },
      { immediate: true }
    );

    // Watch for active tasks to handle auto-scroll
    Vue.watch(activeTasks, () => {
      if (taskContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          taskContainer.value.scrollTop = taskContainer.value.scrollHeight;
        });
      }
    }, { deep: true });

    Vue.watch(activeTaskListId, (newId) => {
      if (newId && taskContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          taskContainer.value.scrollTop = taskContainer.value.scrollHeight;
        });
      }
    });

    // Task list management
    function addTaskList() {
      console.log("addTaskList called");
      const id = addEntity("taskLists", {
        name: `Task List ${entities.value.taskLists.length + 1}`,
        isTitleSet: false, // Flag to track if the title has been manually set
      });
      activeTaskListId.value = id;
      if (isMobile.value) {
        isAccordionOpen.value = false; // Collapse accordion on new task list
      }
    }

    function selectTaskList(id) {
      console.log("selectTaskList called with id:", id);
      activeTaskListId.value = id;
      isEditingTaskList.value = null;
      if (isMobile.value) {
        isAccordionOpen.value = false; // Collapse accordion on selection
      }
    }

    function editTaskListName(taskList) {
      console.log("editTaskListName called for taskList:", taskList.id);
      isEditingTaskList.value = taskList.id;
      Vue.nextTick(() => {
        const input = document.querySelector(`#tasklist-input-${taskList.id}`);
        if (input) input.focus();
      });
    }

    function updateTaskList(taskList) {
      console.log("updateTaskList called for taskList:", taskList.id);
      updateEntity("taskLists", taskList.id, {
        name: taskList.data.name,
        isTitleSet: true, // Mark the title as manually set
      });
      isEditingTaskList.value = null;
    }

    function deleteTaskList(id) {
      console.log("deleteTaskList called with id:", id);
      entities.value.tasks
        .filter((task) => task.data.taskList === id)
        .forEach((task) => removeEntity("tasks", task.id));
      removeEntity("taskLists", id);
      if (activeTaskListId.value === id) {
        activeTaskListId.value = entities.value.taskLists[0]?.id || null;
      }
    }

    // Task management
    function markTaskCompleted(task) {
      console.log("markTaskCompleted called for task:", task.id);
      updateEntity("tasks", task.id, {
        ...task.data,
        completed: task.data.completed,
        displayName: displayName.value,
      });
    }

    function editTaskComment(task) {
      console.log("editTaskComment called for task:", task.id);
      isEditingComment.value = task.id;
      Vue.nextTick(() => {
        const textarea = document.querySelector(`textarea`);
        if (textarea) textarea.focus();
      });
    }

    function updateTaskComment(task) {
      console.log("updateTaskComment called for task:", task.id);
      updateEntity("tasks", task.id, {
        ...task.data,
        comment: task.data.comment,
      });
      isEditingComment.value = null;
    }

    function deleteTask(id) {
      console.log("deleteTask called with id:", id);
      removeEntity("tasks", id);
    }

    // Manual task creation
    function addManualTask() {
      if (!manualTask.value.title.trim() || !activeTaskListId.value) {
        console.log("Invalid manual task, aborting");
        return;
      }
      console.log("Adding manual task:", manualTask.value);

      // Find the highest order value in the current task list
      const highestOrder = activeTasks.value.length > 0
        ? Math.max(...activeTasks.value.map(task => task.data.order || 0))
        : 0;

      addEntity("tasks", {
        taskList: activeTaskListId.value,
        title: manualTask.value.title,
        description: manualTask.value.description || "",
        comment: manualTask.value.comment || "",
        completed: false,
        order: highestOrder + 1, // Append to the end
      });
      manualTask.value = { title: "", description: "", comment: "" };
      showManualTaskForm.value = false;
    }

    function handleEnterKey(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendTaskRequest();
      }
      // Shift+Enter adds a new line naturally
    }

    function sendTaskRequest() {
      if (!draft.value.trim() || !selectedAgentId.value || isSending.value) {
        console.log("Invalid task request, aborting");
        return;
      }
      console.log("sendTaskRequest triggered with draft:", draft.value, "selectedAgentId:", selectedAgentId.value);

      isSending.value = true;
      isGenerating.value = true;

      let taskListIdToUse;

      // If no activeTaskListId, create a new task list
      if (!activeTaskListId.value) {
        console.log("No active task list, creating a new one");
        taskListIdToUse = addEntity("taskLists", {
          name: draft.value.substring(0, 50), // Use the draft as the initial task list name (truncate to 50 chars)
          isTitleSet: false,
        });
        activeTaskListId.value = taskListIdToUse;
      } else {
        // Reuse the existing task list, even if it's empty
        console.log("Reusing existing task list with ID:", activeTaskListId.value);
        taskListIdToUse = activeTaskListId.value;
      }

      // Store the task list ID for this response
      pendingTaskLists.value[taskListIdToUse] = { taskListId: taskListIdToUse };

      // Build message history
      const agent = entities.value.agents.find((a) => a.id === selectedAgentId.value);
      const messageHistory = [];

      // Concatenate system prompts
      const systemPrompt = agent && agent.data.systemPrompts && agent.data.systemPrompts.length > 0
        ? agent.data.systemPrompts.map(prompt => prompt.content).filter(content => content).join("\n\n") + "\n\nAlways return a JSON array of tasks, each with 'title', 'description', 'comment', and 'status' fields, where 'status' is 'pending' or 'complete'. Ensure the response is valid JSON."
        : "You are a helpful assistant that generates JSON task lists. Return a JSON array of tasks, each with 'title', 'description', 'comment', and 'status' fields, where 'status' is 'pending' or 'complete'. Ensure the response is valid JSON.";

      if (systemPrompt) {
        messageHistory.push({
          role: "user",
          content: systemPrompt,
        });
      }

      // Append user prompts
      if (agent && agent.data.userPrompts && agent.data.userPrompts.length > 0) {
        agent.data.userPrompts.forEach(prompt => {
          if (prompt.content) {
            messageHistory.push({
              role: "user",
              content: prompt.content,
            });
          }
        });
      }

      // Append existing tasks as context, if any
      if (activeTasks.value.length > 0) {
        messageHistory.push(...activeTasks.value.map(task => ({
          role: "user",
          content: JSON.stringify({
            title: task.data.title,
            description: task.data.description,
            comment: task.data.comment,
            status: task.data.completed ? "complete" : "pending",
          }),
        })));
      }

      // Add the current user request
      messageHistory.push({
        role: "user",
        content: draft.value,
      });

      // Trigger LLM with JSON output for taskLists
      if (agent) {
        console.log("Triggering LLM for taskListId:", taskListIdToUse);
        const selectedModel = models.value.find((m) => m.model === agent.data.model) || {
          provider: "gemini",
          name: "Gemini",
          model: "gemini",
        };

        try {
          triggerLLM(
            "taskLists",
            taskListIdToUse,
            {
              provider: selectedModel.provider,
              name: selectedModel.name.en || selectedModel.name,
              model: selectedModel.model,
            },
            0.7,
            systemPrompt,
            draft.value,
            messageHistory,
            true // Request JSON output
          );
        } catch (error) {
          console.error("Error triggering LLM:", error);
          updateEntity("taskLists", taskListIdToUse, {
            name: "Error",
            text: "Unable to get response",
          });
          delete pendingTaskLists.value[taskListIdToUse];
          isGenerating.value = false;
          isSending.value = false;
          return;
        }
      } else {
        console.log("No agent found for selectedAgentId:", selectedAgentId.value);
        updateEntity("taskLists", taskListIdToUse, {
          name: "Error",
          text: "No agent selected",
        });
        delete pendingTaskLists.value[taskListIdToUse];
        isGenerating.value = false;
        isSending.value = false;
        return;
      }

      draft.value = "";
      isSending.value = false;
    }

    function regenerateTaskList(changedTasks) {
      if (!selectedAgentId.value || !activeTaskListId.value || isSending.value) {
        console.log("Invalid regeneration request, aborting");
        return;
      }
      console.log("Regenerating task list for taskListId:", activeTaskListId.value);

      isSending.value = true;
      isGenerating.value = true;

      // Store the task list ID for this response
      pendingTaskLists.value[activeTaskListId.value] = { taskListId: activeTaskListId.value };

      // Build message history
      const agent = entities.value.agents.find((a) => a.id === selectedAgentId.value);
      const messageHistory = [];

      // Concatenate system prompts
      const systemPrompt = agent && agent.data.systemPrompts && agent.data.systemPrompts.length > 0
        ? agent.data.systemPrompts.map(prompt => prompt.content).filter(content => content).join("\n\n") + "\n\nAlways return a JSON array of tasks, each with 'title', 'description', 'comment', and 'status' fields, where 'status' is 'pending' or 'complete'. Ensure the response is valid JSON."
        : "You are a helpful assistant that generates JSON task lists. Return a JSON array of tasks, each with 'title', 'description', 'comment', and 'status' fields, where 'status' is 'pending' or 'complete'. Ensure the response is valid JSON.";

      if (systemPrompt) {
        messageHistory.push({
          role: "user",
          content: systemPrompt,
        });
      }

      // Append user prompts
      if (agent && agent.data.userPrompts && agent.data.userPrompts.length > 0) {
        agent.data.userPrompts.forEach(prompt => {
          if (prompt.content) {
            messageHistory.push({
              role: "user",
              content: prompt.content,
            });
          }
        });
      }

      // Append current tasks as context
      messageHistory.push(...activeTasks.value.map(task => ({
        role: "user",
        content: JSON.stringify({
          title: task.data.title,
          description: task.data.description,
          comment: task.data.comment,
          status: task.data.completed ? "complete" : "pending",
        }),
      })));

      // Add regeneration request
      messageHistory.push({
        role: "user",
        content: `Regenerate the task list, updating the status of tasks based on the latest changes. Tasks marked as completed should have status: "complete".`,
      });

      // Trigger LLM for regeneration
      if (agent) {
        console.log("Triggering LLM for regeneration, taskListId:", activeTaskListId.value);
        const selectedModel = models.value.find((m) => m.model === agent.data.model) || {
          provider: "gemini",
          name: "Gemini",
          model: "gemini",
        };

        try {
          triggerLLM(
            "taskLists",
            activeTaskListId.value,
            {
              provider: selectedModel.provider,
              name: selectedModel.name.en || selectedModel.name,
              model: selectedModel.model,
            },
            0.7,
            systemPrompt,
            "Regenerate the task list with updated statuses.",
            messageHistory,
            true // Request JSON output
          );
        } catch (error) {
          console.error("Error triggering LLM for regeneration:", error);
          updateEntity("taskLists", activeTaskListId.value, {
            name: "Error",
            text: "Unable to regenerate task list",
          });
          delete pendingTaskLists.value[activeTaskListId.value];
          isGenerating.value = false;
          isSending.value = false;
          return;
        }
      } else {
        console.log("No agent found for selectedAgentId:", selectedAgentId.value);
        updateEntity("taskLists", activeTaskListId.value, {
          name: "Error",
          text: "No agent selected",
        });
        delete pendingTaskLists.value[activeTaskListId.value];
        isGenerating.value = false;
        isSending.value = false;
        return;
      }

      isSending.value = false;
    }

    function formatTime(timestamp) {
      if (!timestamp) return "";
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    function processLLMResponse(eventObj, taskListId) {
      console.log("Processing LLM response with eventObj:", eventObj);

      // Retrieve content from the taskLists entity
      const taskList = entities.value.taskLists.find(tl => tl.id === taskListId);
      if (!taskList) {
        console.error("Task list not found for taskListId:", taskListId);
        updateEntity("taskLists", taskListId, {
          name: "Error",
          text: "Task list not found",
        });
        delete pendingTaskLists.value[taskListId];
        isGenerating.value = false;
        return;
      }

      let content = taskList.data.text;
      if (!content || typeof content !== 'string') {
        console.error("No valid content found in taskList.data.text:", content);
        updateEntity("taskLists", taskListId, {
          name: "Error",
          text: "No valid content received from LLM",
        });
        delete pendingTaskLists.value[taskListId];
        isGenerating.value = false;
        return;
      }

      try {
        // Strip markdown ```json and ``` from the response in the correct order
        let jsonString = content;
        jsonString = jsonString.replaceAll("```json", "");
        jsonString = jsonString.replaceAll("```", "");
        jsonString = jsonString.trim();

        console.log("Attempting to parse JSON string:", jsonString);
        const jsonTasks = JSON5.parse(jsonString);
        if (!Array.isArray(jsonTasks)) {
          throw new Error("Response is not a JSON array");
        }

        console.log("Parsed JSON tasks:", jsonTasks);

        // Update the task list name only if it hasn't been manually set
        if (!taskList.data.isTitleSet) {
          const taskListName = jsonTasks.length > 0
            ? `List: ${jsonTasks[0].title}` // Changed prefix to "List:"
            : draft.value.substring(0, 50) || "Untitled Task List"; // Fallback if draft is empty
          updateEntity("taskLists", taskListId, {
            name: taskListName,
            isTitleSet: false,
          });
          console.log("Updated task list name to:", taskListName);
        } else {
          console.log("Preserving existing task list name:", taskList.data.name);
        }

        // Determine the highest existing order value for new tasks
        const highestOrder = activeTasks.value.length > 0
          ? Math.max(...activeTasks.value.map(task => task.data.order || 0))
          : 0;

        // If there are no existing tasks, create new ones with order
        if (activeTasks.value.length === 0) {
          jsonTasks.forEach((taskData, index) => {
            addEntity("tasks", {
              taskList: taskListId,
              title: taskData.title || `Task ${index + 1}`,
              description: taskData.description || "",
              comment: taskData.comment || "",
              completed: taskData.status === "complete",
              displayName: taskData.status === "complete" ? displayName.value : null,
              order: index, // Assign order based on JSON array position
            });
          });
        } else {
          // If there are existing tasks, compare and update or add new ones
          const existingTasks = activeTasks.value.reduce((acc, task) => {
            acc[task.data.title] = task;
            return acc;
          }, {});

          const newTasks = [];
          jsonTasks.forEach((taskData, index) => {
            const existingTask = existingTasks[taskData.title];
            if (existingTask) {
              // Update existing task, preserving its order
              console.log(`Updating existing task with ID ${existingTask.id}, preserving order: ${existingTask.data.order}`);
              updateEntity("tasks", existingTask.id, {
                ...existingTask.data,
                description: taskData.description || existingTask.data.description,
                comment: taskData.comment || existingTask.data.comment,
                completed: taskData.status === "complete",
                displayName: taskData.status === "complete" ? displayName.value : existingTask.data.displayName,
                order: existingTask.data.order, // Preserve the original order
              });
            } else {
              // Collect new tasks to add later with incremented order
              newTasks.push({ taskData, index });
            }
          });

          // Add new tasks with incremented order values
          newTasks.forEach(({ taskData }, newIndex) => {
            addEntity("tasks", {
              taskList: taskListId,
              title: taskData.title || `Task ${newIndex + 1}`,
              description: taskData.description || "",
              comment: taskData.comment || "",
              completed: taskData.status === "complete",
              displayName: taskData.status === "complete" ? displayName.value : null,
              order: highestOrder + newIndex + 1, // Append new tasks in order
            });
          });

          // Remove tasks that are no longer in the JSON response
          activeTasks.value.forEach(task => {
            if (!jsonTasks.some(jsonTask => jsonTask.title === task.data.title)) {
              console.log(`Removing task with ID ${task.id}, title: ${task.data.title}`);
              removeEntity("tasks", task.id);
            }
          });
        }

        // Preserve the task list's text field in the database
        console.log("Preserving task list data.text in database:", content);

        delete pendingTaskLists.value[taskListId];
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        updateEntity("taskLists", taskListId, {
          name: "Error",
          text: "Invalid JSON response: " + e.message,
        });
        delete pendingTaskLists.value[taskListId];
      }
      isGenerating.value = false;
    }

    return {
      entities,
      activeTaskListId,
      selectedAgentId,
      draft,
      isSending,
      isGenerating,
      isEditingTaskList,
      isEditingComment,
      activeTasks,
      addTaskList,
      selectTaskList,
      editTaskListName,
      updateTaskList,
      deleteTaskList,
      markTaskCompleted,
      editTaskComment,
      updateTaskComment,
      deleteTask,
      addManualTask,
      showManualTaskForm,
      manualTask,
      sendTaskRequest,
      formatTime,
      taskContainer,
      handleScroll,
      handleEnterKey,
      handleResize,
      taskContainerStyle,
      isMobile,
      isAccordionOpen,
      toggleAccordion,
      accordionIcon,
      currentTaskListName,
    };
  },
};