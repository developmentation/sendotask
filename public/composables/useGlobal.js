// composables/useGlobal.js

// Define entities as a globally scoped reactive object
const entities = Vue.ref({
  channel: [],
  library: [],
  agents: [],
  chatSessions: [],
  chats: [],
  taskLists: [],
  tasks: [],
});

// Derive entityTypes from the keys of entities
const entityTypes = Object.keys(entities.value);

export function useGlobal() {
  return {
    entities,
    entityTypes,
  };
}