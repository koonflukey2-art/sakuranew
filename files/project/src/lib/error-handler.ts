import { toast } from "@/hooks/use-toast";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

export async function handleAPIError(error: unknown, defaultMessage: string) {
  console.error("API Error:", error);

  if (error instanceof APIError) {
    toast({
      title: "ผิดพลาด",
      description: error.message,
      variant: "destructive",
    });
    return;
  }

  if (error instanceof Error) {
    toast({
      title: "ผิดพลาด",
      description: error.message || defaultMessage,
      variant: "destructive",
    });
    return;
  }

  toast({
    title: "ผิดพลาด",
    description: defaultMessage,
    variant: "destructive",
  });
}

export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.message || `HTTP Error ${response.status}`,
        response.status,
        error.code
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError("เกิดข้อผิดพลาดในการเชื่อมต่อ", 0);
  }
}
