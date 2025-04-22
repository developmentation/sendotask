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
        <!-- Tasks and JSON Parsing Display -->
        <div
          ref="taskContainer"
          class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-6 pt-6 pb-4"
          :style="taskContainerStyle"
        >
          <!-- JSON Parsing Display (when generating tasks) -->
          <div v-if="isGenerating" class="mb-6 p-4 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 max-w-[80%]">
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Generating Tasks...</span>
            </div>
            <pre class="text-left" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">{{ rawJsonResponse || 'Waiting for response...' }}</pre>
          </div>

          <!-- Task List -->
          <div
            v-for="task in activeTasks"
            :key="task.id"
            class="mb-6 p-4 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 max-w-[80%]"
          >
            <!-- Header (Title, Timestamp, Buttons) -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">
                  {{ task.data.title }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(task.timestamp) }}
                </span>
                <span v-if="task.data.completed" class="text-xs text-green-500">
                  Completed by {{ task.data.displayName || 'Unknown' }}
                </span>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="!task.data.completed"
                  @click.stop="markTaskCompleted(task)"
                  class="text-gray-400 hover:text-green-500 rounded-full p-1"
                  :class="darkMode ? 'bg-gray-700' : 'bg-gray-200'"
                  title="Mark as completed"
                >
                  <i class="pi pi-check text-sm"></i>
                </button>
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
            <!-- Task Content -->
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
              :disabled="!draft.trim() || !selectedAgentId || !activeTaskListId || isSending"
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
    const { triggerLLM, userUuid, displayName } = useRealTime();
    const { models } = useModels();
    const activeTaskListId = Vue.ref(null);
    const selectedAgentId = Vue.ref(null);
    const draft = Vue.ref("");
    const isSending = Vue.ref(false);
    const isGenerating = Vue.ref(false);
    const rawJsonResponse = Vue.ref("");
    const isEditingTaskList = Vue.ref(null);
    const isEditingComment = Vue.ref(null);
    const taskContainer = Vue.ref(null);
    const isAutoScrollEnabled = Vue.ref(true);
    const isMobile = Vue.ref(false);
    const isAccordionOpen = Vue.ref(false);
    const showManualTaskForm = Vue.ref(false);
    const manualTask = Vue.ref({ title: "", description: "", comment: "" });

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

    // Compute active tasks for the selected task list
    const activeTasks = Vue.computed(() => {
      if (!activeTaskListId.value) return [];
      return entities.value.tasks
        .filter((task) => task.data.taskList === activeTaskListId.value)
        .sort((a, b) => a.timestamp - b.timestamp);
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
      updateEntity("taskLists", taskList.id, { name: taskList.data.name });
      isEditingTaskList.value = null;
    }

    function deleteTaskList(id) {
      console.log("deleteTaskList called with id:", id);
      // Delete associated tasks
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
        completed: true,
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
      addEntity("tasks", {
        taskList: activeTaskListId.value,
        title: manualTask.value.title,
        description: manualTask.value.description || "",
        comment: manualTask.value.comment || "",
        completed: false,
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
      if (!draft.value.trim() || !selectedAgentId.value || !activeTaskListId.value || isSending.value) {
        console.log("Invalid task request, aborting");
        return;
      }
      console.log("sendTaskRequest triggered with draft:", draft.value, "selectedAgentId:", selectedAgentId.value);

      isSending.value = true;
      isGenerating.value = true;
      rawJsonResponse.value = "";

      // Create a new task list for LLM-generated tasks
      console.log("Creating new task list for LLM response");
      const newTaskListId = addEntity("taskLists", {
        name: `Generated Task List ${entities.value.taskLists.length + 1}`,
      });

      // Create a placeholder task to indicate generation
      const responseTaskId = addEntity("tasks", {
        taskList: newTaskListId,
        title: "Generating tasks...",
        description: "",
        comment: "",
        isStreaming: true,
        completed: false,
      });

      // Build message history
      const agent = entities.value.agents.find((a) => a.id === selectedAgentId.value);
      const messageHistory = [];

      // Concatenate system prompts
      const systemPromptContent = agent && agent.data.systemPrompts && agent.data.systemPrompts.length > 0
        ? agent.data.systemPrompts
            .map(prompt => prompt.content)
            .filter(content => content)
            .join("\n\n")
        : "You are a helpful assistant that generates JSON task lists. Return a JSON array of tasks, each with 'title', 'description', and 'comment' fields. Ensure the response is valid JSON.";

      if (systemPromptContent) {
        messageHistory.push({
          role: "user",
          content: systemPromptContent,
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

      // Add the current user request
      messageHistory.push({
        role: "user",
        content: draft.value,
      });

      // Trigger LLM with JSON output
      if (agent) {
        console.log("Triggering LLM for responseTaskId:", responseTaskId);
        const selectedModel = models.value.find((m) => m.model === agent.data.model) || {
          provider: "gemini",
          name: "Gemini",
          model: "gemini",
        };

        try {
          triggerLLM(
            "tasks",
            responseTaskId,
            {
              provider: selectedModel.provider,
              name: selectedModel.name.en || selectedModel.name,
              model: selectedModel.model,
            },
            0.7,
            systemPromptContent,
            draft.value,
            messageHistory,
            true // Request JSON output
          );

          // Listen for LLM response
          const llmDraftHandler = (eventObj) => {
            console.log("Received LLM draft event:", eventObj);
            if (eventObj.id === responseTaskId && eventObj.data.entityType === "tasks") {
              const content = eventObj.data.content;
              rawJsonResponse.value += content; // Accumulate JSON response
              console.log("Accumulated JSON response:", rawJsonResponse.value);

              // Try parsing the JSON
              try {
                const jsonTasks = JSON.parse(rawJsonResponse.value);
                if (Array.isArray(jsonTasks)) {
                  console.log("Parsed JSON tasks:", jsonTasks);
                  // Update the task list
                  updateEntity("taskLists", newTaskListId, {
                    name: `Generated Task List ${entities.value.taskLists.length}`,
                  });

                  // Add tasks from JSON
                  jsonTasks.forEach((task, index) => {
                    addEntity("tasks", {
                      taskList: newTaskListId,
                      title: task.title || `Task ${index + 1}`,
                      description: task.description || "",
                      comment: task.comment || "",
                      completed: false,
                    });
                  });

                  // Update the placeholder task
                  updateEntity("tasks", responseTaskId, {
                    taskList: newTaskListId,
                    title: "Tasks generated",
                    description: `Generated ${jsonTasks.length} tasks`,
                    comment: "",
                    isStreaming: false,
                    completed: false,
                  });

                  isGenerating.value = false;
                  rawJsonResponse.value = "";
                }
              } catch (e) {
                console.log("JSON not yet complete or invalid:", e.message);
                // Continue accumulating response
              }
            }
          };

          const llmEndHandler = (eventObj) => {
            console.log("Received LLM end event:", eventObj);
            if (eventObj.id === responseTaskId && eventObj.data.entityType === "tasks") {
              isGenerating.value = false;
              if (!rawJsonResponse.value) {
                updateEntity("tasks", responseTaskId, {
                  taskList: newTaskListId,
                  title: "Error",
                  description: "No response received",
                  comment: "",
                  isStreaming: false,
                  completed: false,
                });
              }
              eventBus.$off("history-llm-draft", llmDraftHandler);
              eventBus.$off("history-llm-end", llmEndHandler);
            }
          };

          eventBus.$on("history-llm-draft", llmDraftHandler);
          eventBus.$on("history-llm-end", llmEndHandler);

        } catch (error) {
          console.error("Error triggering LLM:", error);
          updateEntity("tasks", responseTaskId, {
            taskList: newTaskListId,
            title: "Error",
            description: "Unable to get response",
            comment: "",
            isStreaming: false,
            completed: false,
          });
          isGenerating.value = false;
          isSending.value = false;
        }
      } else {
        console.log("No agent found for selectedAgentId:", selectedAgentId.value);
        updateEntity("tasks", responseTaskId, {
          taskList: newTaskListId,
          title: "Error",
          description: "No agent selected",
          comment: "",
          isStreaming: false,
          completed: false,
        });
        isGenerating.value = false;
        isSending.value = false;
      }

      draft.value = "";
      isSending.value = false;
    }

    function formatTime(timestamp) {
      if (!timestamp) return "";
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return {
      entities,
      activeTaskListId,
      selectedAgentId,
      draft,
      isSending,
      isGenerating,
      rawJsonResponse,
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