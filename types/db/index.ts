type UserGender = "MAN" | "WOMAN" | "NON_BINARY" | "PREFER_NOT_TO_SAY";

type FavoriteGenre =
  | "Fantasy"
  | "Sci-Fi"
  | "Mystery & Crime"
  | "Thriller & suspense"
  | "Romance"
  | "Historical Fiction"
  | "Horror"
  | "Literary Fiction"
  | "Biography & Autobiography"
  | "Memoir"
  | "History"
  | "True Crime"
  | "Personal Development"
  | "Science"
  | "Philosophy"
  | "Travel"
  | "Business & Economics"
  | "Cooking & Food"
  | "Essays & Journalism";

type AppSessionIdentity = "PUBLIC_INCOMPLETE" | "PUBLIC" | "INTERNAL_ADMIN";

type UserRecord = {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  nickname: string | null;
  gender: UserGender | null;
  countryCode: string | null;
  favoriteGenres: FavoriteGenre[];
  signupCompletedAt: Date | null;
  passwordHash: string | null;
};

type AuthUser = Omit<UserRecord, "passwordHash"> & {
  isInternalAdmin: boolean;
  isSignupComplete: boolean;
  sessionIdentity: AppSessionIdentity;
};

type InternalAdminAuthUser = UserRecord & {
  isInternalAdmin: true;
  isSignupComplete: false;
  sessionIdentity: "INTERNAL_ADMIN";
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

type InvitationCodePurpose = "BETA_SIGNUP";

type InvitationCodeStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXHAUSTED";

type InvitationCodeRecord = {
  id: string;
  purpose: InvitationCodePurpose;
  codeHash: string;
  label: string;
  isActive: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

type InvitationCodeRedemptionRecord = {
  id: string;
  codeId: string;
  userId: string;
  createdAt: Date;
};

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

type ShelfRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ShelfItemRecord = {
  id: string;
  shelfId: string;
  bookId: string;
  note: string | null;
  sortOrder: number;
  addedAt: Date;
};

type ReviewRating = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

type ReviewRecord = {
  id: string;
  userId: string;
  bookId: string;
  rating: ReviewRating | null;
  title: string | null;
  body: string | null;
  containsSpoilers: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  AppSessionIdentity,
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
  FavoriteGenre,
  InternalAdminAuthUser,
  InvitationCodePurpose,
  InvitationCodeRecord,
  InvitationCodeRedemptionRecord,
  InvitationCodeStatus,
  ReviewRating,
  ReviewRecord,
  ShelfItemRecord,
  ShelfRecord,
  ThreadPostRecord,
  ThreadRecord,
  UserGender,
  UserRecord,
};
