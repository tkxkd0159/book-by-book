type AuthUser = {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
};

type BookRecord = {
  id: string;
  googleVolumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  isbn10: string | null;
  isbn13: string | null;
  pageCount: number | null;
  categories: string[];
  language: string | null;
  thumbnailUrl: string | null;
  previewLink: string | null;
  infoLink: string | null;
  canonicalLink: string | null;
  createdAt: Date;
  updatedAt: Date;
  rawGoogleJson: unknown;
};

type ClubVisibility = "PUBLIC" | "PRIVATE";

type ClubMemberRole = "OWNER" | "ADMIN" | "MEMBER";

type ClubInvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

type ClubBookStatus = "WANT_TO_READ" | "READING" | "READ";

type ClubRecord = {
  id: string;
  name: string;
  description: string | null;
  visibility: ClubVisibility;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type ClubMemberRecord = {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  joinedAt: Date;
};

type ClubInvitationRecord = {
  id: string;
  clubId: string;
  invitedById: string;
  invitedUserId: string | null;
  invitedEmail: string | null;
  status: ClubInvitationStatus;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  updatedAt: Date;
};

type ClubBookRecord = {
  id: string;
  clubId: string;
  bookId: string;
  status: ClubBookStatus;
  addedById: string;
  sortOrder: number;
  addedAt: Date;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ThreadRecord = {
  id: string;
  clubId: string;
  clubBookId: string;
  bookId: string;
  authorId: string;
  title: string;
  body: string | null;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ThreadPostRecord = {
  id: string;
  threadId: string;
  parentPostId: string | null;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type {
  AuthUser,
  BookRecord,
  ClubBookRecord,
  ClubBookStatus,
  ClubInvitationRecord,
  ClubInvitationStatus,
  ClubMemberRecord,
  ClubMemberRole,
  ClubRecord,
  ClubVisibility,
  ThreadPostRecord,
  ThreadRecord,
};
