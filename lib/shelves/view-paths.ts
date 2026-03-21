export function createMyShelvesHref() {
  return "/me/shelves";
}

export function createNewShelfHref() {
  return "/me/shelves/new";
}

export function createMyShelfHref(shelfId: string) {
  return `${createMyShelvesHref()}/${shelfId}`;
}

export function createPublicShelfHref(input: {
  nickname: string;
  shelfId: string;
}) {
  return `/users/${encodeURIComponent(input.nickname)}/shelves/${encodeURIComponent(input.shelfId)}`;
}
