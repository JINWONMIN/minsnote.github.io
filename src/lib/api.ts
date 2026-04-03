const API_BASE = "https://minsnote-api.minsnote-cms-auth.workers.dev";

export async function trackView(slug: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/views`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const data = await res.json();
  return data.views;
}

export async function getViews(slug: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/views?slug=${encodeURIComponent(slug)}`);
  const data = await res.json();
  return data.views;
}

export async function trackVisitor(): Promise<{ today: number; total: number }> {
  const res = await fetch(`${API_BASE}/api/visitors`, { method: "POST" });
  return res.json();
}

export async function getVisitors(): Promise<{ today: number; total: number }> {
  const res = await fetch(`${API_BASE}/api/visitors`);
  return res.json();
}

export interface Comment {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
}

export async function getComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/api/comments?slug=${encodeURIComponent(slug)}`);
  const data = await res.json();
  return data.comments;
}

export async function postComment(slug: string, nickname: string, content: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, nickname, content }),
  });
  return res.json();
}
