"use client";

import { useTransition } from "react";
import { signIn } from "next-auth/react";

import { GOOGLE_AUTH_PROVIDER } from "@/lib/auth/identity";

type SignInGoogleButtonProps = {
  callbackUrl?: string;
};

export default function SignInGoogleButton({
  callbackUrl = "/books/search",
}: SignInGoogleButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="google-signin-button"
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            void signIn(GOOGLE_AUTH_PROVIDER, { callbackUrl });
          });
        }}
      >
        <span className="google-signin-state" />
        <span className="google-signin-content-wrapper">
          <span className="google-signin-icon" aria-hidden>
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              style={{ display: "block" }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          </span>
          <span className="google-signin-contents">
            {isPending ? "Redirecting..." : "Continue with Google"}
          </span>
        </span>
      </button>

      <style jsx>{`
        .google-signin-button {
          -moz-user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          -webkit-appearance: none;
          appearance: none;
          align-items: center;
          background: linear-gradient(
            135deg,
            var(--accent) 0%,
            color-mix(in oklab, var(--accent) 88%, black) 100%
          );
          border: 1px solid color-mix(in oklab, var(--accent) 75%, black);
          border-radius: 999px;
          box-sizing: border-box;
          box-shadow: 0 8px 18px rgba(10, 74, 62, 0.24);
          color: var(--accent-foreground);
          cursor: pointer;
          display: inline-flex;
          font-family: "Avenir Next", "Segoe UI", arial, sans-serif;
          font-size: 15px;
          font-weight: 600;
          height: 46px;
          letter-spacing: 0.25px;
          max-width: 360px;
          outline: none;
          overflow: hidden;
          padding: 0;
          position: relative;
          text-align: center;
          transition:
            transform 0.18s ease,
            box-shadow 0.2s ease,
            filter 0.2s ease;
          vertical-align: middle;
          white-space: nowrap;
          width: 100%;
        }

        .google-signin-content-wrapper {
          align-items: center;
          display: flex;
          height: 100%;
          justify-content: flex-start;
          position: relative;
          width: 100%;
          z-index: 2;
        }

        .google-signin-icon {
          align-items: center;
          background: #fff;
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
          display: inline-flex;
          height: 34px;
          justify-content: center;
          margin-left: 6px;
          min-width: 34px;
          width: 34px;
        }

        .google-signin-icon :global(svg) {
          height: 20px;
          width: 20px;
        }

        .google-signin-contents {
          flex-grow: 1;
          font-family: "Avenir Next", "Segoe UI", arial, sans-serif;
          font-weight: 600;
          overflow: hidden;
          padding: 0 16px 0 12px;
          text-align: center;
          text-overflow: ellipsis;
          vertical-align: top;
        }

        .google-signin-state {
          background: #001d35;
          bottom: 0;
          left: 0;
          opacity: 0;
          position: absolute;
          right: 0;
          top: 0;
          transition: opacity 0.18s;
          z-index: 1;
        }

        .google-signin-button:disabled {
          cursor: default;
          filter: grayscale(0.15);
          opacity: 0.72;
        }

        .google-signin-button:disabled .google-signin-state {
          background-color: #1f1f1f1f;
          opacity: 1;
        }

        .google-signin-button:disabled .google-signin-contents,
        .google-signin-button:disabled .google-signin-icon {
          opacity: 0.85;
        }

        .google-signin-button:not(:disabled):active {
          transform: translateY(1px);
        }

        .google-signin-button:not(:disabled):active .google-signin-state,
        .google-signin-button:not(:disabled):focus .google-signin-state {
          opacity: 0.12;
        }

        .google-signin-button:not(:disabled):hover {
          box-shadow: 0 12px 22px rgba(10, 74, 62, 0.3);
          transform: translateY(-1px);
        }

        .google-signin-button:not(:disabled):hover .google-signin-state {
          opacity: 0.08;
        }

        @media (max-width: 480px) {
          .google-signin-button {
            max-width: none;
          }
        }
      `}</style>
    </>
  );
}
