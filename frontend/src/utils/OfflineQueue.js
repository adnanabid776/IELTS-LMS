import { toast } from "react-toastify";
import { bulkSaveAnswers } from "../services/api";

class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isSyncing = false;
    this.STORAGE_KEY = "ielts_lms_offline_queue";

    // Load queue on init
    this.loadQueue();

    // Listen for online events
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("🌐 Network restored - Attempting to sync offline data...");
        this.process();
      });
    }
  }

  // Load queue from local storage
  loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load offline queue:", error);
      this.queue = [];
    }
  }

  // Save queue to local storage
  saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
      // Dispatch event for UI updates
      window.dispatchEvent(new Event("offline-queue-changed"));
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    }
  }

  /**
   * Add an action to the queue
   * @param {string} type - Action type (e.g., 'SAVE_ANSWER')
   * @param {object} payload - Action data
   */
  add(type, payload) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const action = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(action);
    this.saveQueue();
    console.log(
      `📥 Added to offline queue: ${type} (${this.queue.length} items pending)`,
    );
  }

  /**
   * Get current queue items
   */
  getQueue() {
    return this.queue;
  }

  /**
   * Clear the queue (e.g., after successful submission or session end)
   */
  clear() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Process the queue (Sync with backend)
   */
  async process() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) return;

    this.isSyncing = true;
    window.dispatchEvent(new Event("offline-sync-start"));
    console.log("🔄 Starting offline sync...");

    const queueCopy = [...this.queue];
    const successfulIds = [];
    const failedItems = [];

    // Group by Session ID to batch requests effectively
    const answersBySession = {};

    queueCopy.forEach((item) => {
      if (item.type === "SAVE_ANSW_BULK") {
        const { sessionId, answers } = item.payload;
        if (!answersBySession[sessionId]) {
          answersBySession[sessionId] = [];
        }
        // answers is array of answer objects
        answersBySession[sessionId].push(...answers);
        successfulIds.push(item.id); // Mark as processed (we'll re-queue if batch fails)
      }
    });

    // Process Batches
    for (const sessionId in answersBySession) {
      const allAnswers = answersBySession[sessionId];

      // Deduplicate unique answers (keep latest answer for each questionId)
      const uniqueAnswers = {};
      allAnswers.forEach((ans) => {
        uniqueAnswers[ans.questionId] = ans;
      });
      const finalAnswersPayload = Object.values(uniqueAnswers);

      if (finalAnswersPayload.length === 0) continue;

      try {
        console.log(
          `📤 Syncing ${finalAnswersPayload.length} answers for session ${sessionId}...`,
        );
        await bulkSaveAnswers(sessionId, finalAnswersPayload);
        console.log(`✅ Synced successfully for session ${sessionId}`);
      } catch (error) {
        console.error(`❌ Sync failed for session ${sessionId}`, error);

        // Re-queue the consolidated batch as a new single item
        failedItems.push({
          id: Date.now().toString(),
          type: "SAVE_ANSW_BULK",
          payload: { sessionId, answers: finalAnswersPayload },
          timestamp: Date.now(),
          retryCount: 1,
        });
      }
    }

    // Update Queue: Remove successful, Add failed (consolidated)
    // Filter out processed items from original queue
    this.queue = this.queue.filter((item) => !successfulIds.includes(item.id));

    // Add back any failed consolidated items
    if (failedItems.length > 0) {
      this.queue.push(...failedItems);
    }

    this.saveQueue();
    this.isSyncing = false;
    window.dispatchEvent(new Event("offline-sync-end"));

    if (this.queue.length === 0) {
      toast.success("All offline changes have been saved to the server.");
    } else {
      // toast.warn("Some changes could not be synced. Will retry when connection improves.");
    }
  }
}

// Singleton
const offlineQueue = new OfflineQueue();
export default offlineQueue;
