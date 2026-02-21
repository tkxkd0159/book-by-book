export as namespace Props;

declare namespace Props {
  type ErrorPage = {
    error: Error & { digest?: string };
    reset: () => void;
  };

  type Layout = Readonly<{
    children: React.ReactNode;
  }>;
  type ParallelLayout = Readonly<Record<string, React.ReactNode>>;

  type Page = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  };

  type Default<T extends Record<string, string>> = {
    params: Promise<T>;
  };
}
