const API_BASE = "https://minsnote-api.minsnote-cms-auth.workers.dev";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
}

export async function trackView(slug: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/views`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ slug }),
  });
  const data = await res.json();
  return data.views;
}

export async function getViews(slug: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/views?slug=${encodeURIComponent(slug)}`, {
    headers: headers(),
  });
  const data = await res.json();
  return data.views;
}

export async function trackVisitor(): Promise<{ today: number; total: number }> {
  const res = await fetch(`${API_BASE}/api/visitors`, {
    method: "POST",
    headers: headers(),
  });
  return res.json();
}

export async function getVisitors(): Promise<{ today: number; total: number }> {
  const res = await fetch(`${API_BASE}/api/visitors`, {
    headers: headers(),
  });
  return res.json();
}

export async function getLikes(slug: string): Promise<{ likes: number; liked: boolean }> {
  const res = await fetch(`${API_BASE}/api/likes?slug=${encodeURIComponent(slug)}`, {
    headers: headers(),
  });
  return res.json();
}

export async function toggleLike(slug: string): Promise<{ likes: number; liked: boolean }> {
  const res = await fetch(`${API_BASE}/api/likes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ slug }),
  });
  return res.json();
}

export interface Comment {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  parent_id: number | null;
}

export async function getComments(slug: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/api/comments?slug=${encodeURIComponent(slug)}`, {
    headers: headers(),
  });
  const data = await res.json();
  return data.comments;
}

export async function postComment(slug: string, nickname: string, content: string, password: string, parentId?: number | null): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/comments`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ slug, nickname, content, password, parent_id: parentId ?? null }),
  });
  return res.json();
}

export async function deleteComment(id: number, password: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/comments`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ id, password }),
  });
  return res.json();
}

export async function editComment(id: number, content: string, password: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/comments`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ id, content, password }),
  });
  return res.json();
}
