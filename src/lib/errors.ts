import { toast } from "sonner";
import i18n from "@/i18n";

type ErrorPayloadLike = {
  code?: unknown;
  message?: unknown;
};

export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as ErrorPayloadLike).code;
  return typeof code === "string" ? code : null;
}

export function errorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          typeof (error as ErrorPayloadLike).message === "string"
        ? ((error as ErrorPayloadLike).message as string)
        : i18n.t("errors.unexpected");
  return raw.slice(0, 240);
}

export function reportError(title: string, error: unknown): void {
  toast.error(title, { description: errorMessage(error) });
}
