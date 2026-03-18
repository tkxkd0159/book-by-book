export function threadListQueryKey(input: {
  clubId: string;
  clubBookId: string;
}) {
  return ["club-book-threads", input.clubId, input.clubBookId] as const;
}

export function threadCommentsQueryKey(input: {
  clubId: string;
  threadId: string;
}) {
  return ["thread-comments", input.clubId, input.threadId] as const;
}
