import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../lib/utils';

export type Id = string;

export type Column = {
  id: Id;
  title: string;
};

export type ChecklistItem = {
  id: Id;
  text: string;
  completed: boolean;
  type: 'item' | 'group';
  items?: ChecklistItem[];
};

export type Task = {
  id: Id;
  columnId: Id;
  title: string;
  description: string;
  labels: string[];
  createdAt: number;
  date?: string;
  imageUrl?: string;
  checklist: ChecklistItem[];
};

export type BoardData = {
  columns: Column[];
  tasks: Task[];
  googleCalendarUrl: string;
  weatherLocation: string;
};

interface BoardState {
  boards: Record<string, BoardData>;
  dashboardNames: Record<string, string>;
  selectedDashboard: string;
  darkMode: boolean;
  searchQuery: string;
  tagSearch: string;
  googleCalendarUrl: string | null;
  
  // Dashboard management
  createDashboard: (name: string) => void;
  selectDashboard: (id: string) => void;
  editDashboardName: (id: string, name: string) => void;
  deleteDashboard: (id: string) => void;
  
  // Board operations
  addColumn: (title: string) => void;
  updateColumn: (id: Id, title: string) => void;
  deleteColumn: (id: Id) => void;
  addTask: (columnId: Id, task: Omit<Task, 'id' | 'columnId' | 'createdAt'>) => void;
  updateTask: (id: Id, updates: Partial<Omit<Task, 'id' | 'columnId'>>) => void;
  deleteTask: (id: Id) => void;
  moveTask: (taskId: Id, toColumnId: Id) => void;
  reorderTasks: (activeId: Id, overId: Id) => void;
  
  // UI state
  toggleDarkMode: () => void;
  setSearchQuery: (query: string) => void;
  setTagSearch: (tags: string) => void;
  setGoogleCalendarUrl: (url: string) => void;
  removeGoogleCalendarUrl: () => void;
  setWeatherLocation: (location: string) => void;
  getFilteredTasks: () => Task[];
}

const DEFAULT_COLUMNS = [
  { id: '1', title: 'Por hacer' },
  { id: '2', title: 'En progreso' },
  { id: '3', title: 'Completado' },
];

const createEmptyBoardData = (): BoardData => ({
  columns: DEFAULT_COLUMNS,
  tasks: [],
  googleCalendarUrl: '',
  weatherLocation: '',
});

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: {
        default: createEmptyBoardData(),
      },
      dashboardNames: {
        default: 'Principal',
      },
      selectedDashboard: 'default',
      darkMode: true,
      searchQuery: '',
      tagSearch: '',
      googleCalendarUrl: localStorage.getItem('googleCalendarUrl'),

      createDashboard: (name) => {
        const id = generateId();
        set((state) => ({
          boards: {
            ...state.boards,
            [id]: createEmptyBoardData(),
          },
          dashboardNames: {
            ...state.dashboardNames,
            [id]: name,
          },
          selectedDashboard: id,
        }));
      },

      selectDashboard: (id) => {
        set({ selectedDashboard: id });
      },

      editDashboardName: (id, name) => {
        set((state) => ({
          dashboardNames: {
            ...state.dashboardNames,
            [id]: name,
          },
        }));
      },

      deleteDashboard: (id) => {
        if (id === 'default') return; // Prevent deleting default dashboard
        
        set((state) => {
          const { [id]: deletedBoard, ...remainingBoards } = state.boards;
          const { [id]: deletedName, ...remainingNames } = state.dashboardNames;
          
          return {
            boards: remainingBoards,
            dashboardNames: remainingNames,
            selectedDashboard: state.selectedDashboard === id ? 'default' : state.selectedDashboard,
          };
        });
      },

      addColumn: (title) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              columns: [...state.boards[state.selectedDashboard].columns, { id: generateId(), title }],
            },
          },
        })),

      updateColumn: (id, title) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              columns: state.boards[state.selectedDashboard].columns.map((col) =>
                col.id === id ? { ...col, title } : col
              ),
            },
          },
        })),

      deleteColumn: (id) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              columns: state.boards[state.selectedDashboard].columns.filter((col) => col.id !== id),
              tasks: state.boards[state.selectedDashboard].tasks.filter((task) => task.columnId !== id),
            },
          },
        })),

      addTask: (columnId, task) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              tasks: [
                ...state.boards[state.selectedDashboard].tasks,
                {
                  ...task,
                  id: generateId(),
                  columnId,
                  createdAt: Date.now(),
                  date: task.date ? task.date : undefined,
                  checklist: task.checklist || [],
                  imageUrl: task.imageUrl || '',
                },
              ],
            },
          },
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              tasks: state.boards[state.selectedDashboard].tasks.map((task) =>
                task.id === id ? { ...task, ...updates } : task
              ),
            },
          },
        })),

      deleteTask: (id) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              tasks: state.boards[state.selectedDashboard].tasks.filter((task) => task.id !== id),
            },
          },
        })),

      moveTask: (taskId, toColumnId) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              tasks: state.boards[state.selectedDashboard].tasks.map((task) =>
                task.id === taskId ? { ...task, columnId: toColumnId } : task
              ),
            },
          },
        })),

      reorderTasks: (activeId, overId) =>
        set((state) => {
          const tasks = [...state.boards[state.selectedDashboard].tasks];
          const activeTask = tasks.find((t) => t.id === activeId);
          const overTask = tasks.find((t) => t.id === overId);

          if (!activeTask || !overTask || activeTask.columnId !== overTask.columnId) {
            return state;
          }

          const activeIndex = tasks.indexOf(activeTask);
          const overIndex = tasks.indexOf(overTask);

          tasks.splice(activeIndex, 1);
          tasks.splice(overIndex, 0, activeTask);

          return {
            boards: {
              ...state.boards,
              [state.selectedDashboard]: {
                ...state.boards[state.selectedDashboard],
                tasks,
              },
            },
          };
        }),

      toggleDarkMode: () =>
        set((state) => ({
          darkMode: !state.darkMode,
        })),

      setSearchQuery: (query) =>
        set(() => ({
          searchQuery: query,
        })),

      setTagSearch: (tags) =>
        set(() => ({
          tagSearch: tags,
        })),

      setGoogleCalendarUrl: (url: string) => {
        localStorage.setItem('googleCalendarUrl', url);
        set({ googleCalendarUrl: url });
      },

      removeGoogleCalendarUrl: () => {
        localStorage.removeItem('googleCalendarUrl');
        set({ googleCalendarUrl: null });
      },

      setWeatherLocation: (location: string) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [state.selectedDashboard]: {
              ...state.boards[state.selectedDashboard],
              weatherLocation: location,
            },
          },
        })),

      getFilteredTasks: () => {
        const state = get();
        const searchLower = state.searchQuery.toLowerCase();
        const searchTags = state.tagSearch
          .toLowerCase()
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);

        return state.boards[state.selectedDashboard].tasks
          .filter((task) => {
            const matchesSearch = task.title.toLowerCase().includes(searchLower);
            const matchesTags =
              searchTags.length === 0 ||
              task.labels.some((label) => searchTags.includes(label.toLowerCase()));
            return matchesSearch && matchesTags;
          })
          .sort((a, b) => b.createdAt - a.createdAt);
      },
    }),
    {
      name: 'kanban-storage',
    }
  )
);

export const reorderTasks = useBoardStore.getState().reorderTasks;