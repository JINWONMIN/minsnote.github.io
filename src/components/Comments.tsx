"use client";

import { useEffect, useState } from "react";
import {
  getComments,
  postComment,
  deleteComment,
  editComment,
  type Comment,
} from "@/lib/api";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + "Z").getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

function CommentForm({
  slug,
  parentId,
  onSuccess,
  onCancel,
  compact,
}: {
  slug: string;
  parentId?: number | null;
  onSuccess: () => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await postComment(slug, nickname, content, password, parentId).catch(
      () => ({ success: false, error: "네트워크 오류가 발생했습니다." })
    );

    if (result.success) {
      setContent("");
      setPassword("");
      onSuccess();
    } else {
      setError(result.error || "댓글 작성에 실패했습니다.");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={30}
          required
          className={`${compact ? "w-24 sm:w-32" : "w-32 sm:w-40"} px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="비밀번호 4자리"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
          maxLength={4}
          required
          className={`${compact ? "w-24 sm:w-32" : "w-32 sm:w-36"} px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
        />
      </div>
      <textarea
        placeholder={parentId ? "답글을 남겨주세요" : "댓글을 남겨주세요"}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        required
        rows={compact ? 2 : 3}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || password.length !== 4}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "등록 중..." : parentId ? "답글 등록" : "댓글 등록"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  slug,
  replies,
  onRefresh,
}: {
  comment: Comment;
  slug: string;
  replies: Comment[];
  onRefresh: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete" | "reply">("view");
  const [password, setPassword] = useState("");
  const [editContent, setEditContent] = useState(comment.content);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isReply = comment.parent_id !== null;

  function reset() {
    setMode("view");
    setPassword("");
    setEditContent(comment.content);
    setError("");
  }

  async function handleDelete() {
    setError("");
    setLoading(true);
    const result = await deleteComment(comment.id, password).catch(() => ({
      success: false,
      error: "네트워크 오류가 발생했습니다.",
    }));
    setLoading(false);
    if (result.success) {
      onRefresh();
    } else {
      setError(result.error || "삭제에 실패했습니다.");
    }
  }

  async function handleEdit() {
    setError("");
    setLoading(true);
    const result = await editComment(comment.id, editContent, password).catch(
      () => ({ success: false, error: "네트워크 오류가 발생했습니다." })
    );
    setLoading(false);
    if (result.success) {
      reset();
      onRefresh();
    } else {
      setError(result.error || "수정에 실패했습니다.");
    }
  }

  return (
    <div>
      <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 ${isReply ? "ml-8 border-l-2 border-l-primary-500/30" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isReply && (
              <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v6M3 10l6-6M3 10l6 6" />
              </svg>
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {comment.nickname}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {timeAgo(comment.created_at)}
            </span>
          </div>
          {mode === "view" && (
            <div className="flex items-center gap-1">
              {!isReply && (
                <>
                  <button
                    onClick={() => setMode("reply")}
                    className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
                  >
                    답글
                  </button>
                  <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
                </>
              )}
              <button
                onClick={() => setMode("edit")}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                수정
              </button>
              <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
              <button
                onClick={() => setMode("delete")}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {mode === "view" && (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.content}
          </p>
        )}

        {mode === "delete" && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {comment.content}
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="비밀번호 4자리"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
                className="w-28 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                onClick={handleDelete}
                disabled={password.length !== 4 || loading}
                className="px-2 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "..." : "삭제"}
              </button>
              <button
                onClick={reset}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                취소
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
            />
            <div className="flex items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="비밀번호 4자리"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
                className="w-28 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                onClick={handleEdit}
                disabled={password.length !== 4 || !editContent.trim() || loading}
                className="px-2 py-1 text-xs font-medium rounded bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "..." : "수정"}
              </button>
              <button
                onClick={reset}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                취소
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>

      {/* Reply form */}
      {mode === "reply" && (
        <div className="ml-8 mt-2">
          <CommentForm
            slug={slug}
            parentId={comment.id}
            compact
            onSuccess={() => {
              reset();
              onRefresh();
            }}
            onCancel={reset}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              slug={slug}
              replies={[]}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);

  function refresh() {
    getComments(slug).then(setComments).catch(() => {});
  }

  useEffect(() => {
    refresh();
  }, [slug]);

  const rootComments = comments.filter((c) => c.parent_id === null);
  const repliesByParent = comments.reduce<Record<number, Comment[]>>((acc, c) => {
    if (c.parent_id !== null) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  const totalCount = comments.length;

  return (
    <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        댓글{" "}
        {totalCount > 0 && (
          <span className="text-sm font-normal text-gray-400">
            ({totalCount})
          </span>
        )}
      </h2>

      {rootComments.length > 0 && (
        <div className="space-y-4 mb-8">
          {rootComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              slug={slug}
              replies={repliesByParent[comment.id] || []}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <CommentForm slug={slug} onSuccess={refresh} />
    </section>
  );
}
