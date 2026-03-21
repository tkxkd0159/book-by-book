export type InvitationCodeCreateActionState = {
  error: string | null;
  formattedCode: string | null;
  label: string | null;
  rawCode: string | null;
  status: "error" | "idle" | "success";
};

export const INITIAL_INVITATION_CODE_CREATE_STATE: InvitationCodeCreateActionState =
  {
    status: "idle",
    error: null,
    rawCode: null,
    formattedCode: null,
    label: null,
  };
