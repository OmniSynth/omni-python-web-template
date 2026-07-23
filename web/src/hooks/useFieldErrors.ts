import { useCallback, useState } from "react";

export type FieldErrors = Record<string, string>;

/** 管理字段级错误状态，修改字段时可即时清除对应错误。 */
export function useFieldErrors(initial: FieldErrors = {}) {
  const [fieldErrors, setFieldErrorsState] = useState<FieldErrors>(initial);

  const setFieldErrors = useCallback((errors: FieldErrors) => {
    setFieldErrorsState(errors);
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrorsState({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrorsState((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrorsState((prev) => ({ ...prev, [field]: message }));
  }, []);

  return {
    fieldErrors,
    setFieldErrors,
    clearFieldErrors,
    clearFieldError,
    setFieldError,
  };
}
