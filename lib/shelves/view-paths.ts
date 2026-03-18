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
  userId: string;
  shelfId: string;
}) {
  return `/users/${input.userId}/shelves/${input.shelfId}`;
}
