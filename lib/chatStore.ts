// Agent chat history, kept in the browser (localStorage) so it never fills the database.
// Every read/write is wrapped: storage can be unavailable (private mode, quota, blocked).

export type StoredChat = {
  id: string;
  title: string;
  updatedAt: number;
  msgs: unknown[];
  jobs: Record<string, unknown>;
};

const KEY = "vlipa-chats-v1";
const MAX = 40;

function read(): StoredChat[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as StoredChat[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: StoredChat[]) {
  // Drop the oldest chats until it fits.
  for (let n = list.length; n > 0; n = Math.floor(n * 0.75)) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, n)));
      return;
    } catch {}
  }
}

export const listChats = () => read().sort((a, b) => b.updatedAt - a.updatedAt);
export const getChat = (id: string) => read().find((c) => c.id === id) ?? null;

export function saveChat(chat: StoredChat) {
  const rest = read().filter((c) => c.id !== chat.id);
  write([chat, ...rest].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX));
}

export function deleteChat(id: string) {
  write(read().filter((c) => c.id !== id));
}
