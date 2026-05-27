export type Source = { page: string | number; snippet: string };

export type Message = {
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
};

export type Doc = { name: string; pages: number | string };

export type Chat = {
  id: string;
  title: string;
  updated: number;
  doc?: Doc;
  messages: Message[];
};
