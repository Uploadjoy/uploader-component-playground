"use client";

import {
  ChangeEventHandler,
  HTMLProps,
  MouseEventHandler,
  Reducer,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { fromEvent } from "file-selector";
import {
  acceptPropAsAcceptAttr,
  composeEventHandlers,
  canUseFileSystemAccessAPI,
  isAbort,
  isPropagationStopped,
  isSecurityError,
  onDocumentDragOver,
  pickerOptionsFromAccept,
  isEventWithFiles,
  isEdge,
  AcceptProp,
  FileValidator,
  noop,
  UploaderError,
  validateFile,
  noopPromise,
} from "./utils";
import { PresignedUrlFetchResponse, getPresignedUrls } from "./presignedUrls";
import {
  OnUploadError,
  OnUploadProgress,
  OnUploadSuccess,
  submit,
} from "./submit";

type UseInputProps = {
  accept?: AcceptProp;
  acceptAll?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  validator?: FileValidator;
  minSize?: number;
  maxSize?: number;
  maxFiles?: number;
  fileAccess: "public" | "private";
  folder?: string;
  useFsAccessApi?: boolean;
  getFilesFromEvent?: typeof fromEvent;
  onFileDialogCancel?: () => void;
  onFileDialogOpen?: () => void;
  onError?: (error: Error) => void;

  onUploadProgress?: OnUploadProgress;
  onUploadSuccess?: OnUploadSuccess;
  onUploadError?: OnUploadError;
};

type UseInputPropsState = {
  isFileDialogActive: boolean;
  isFocused: boolean;
  acceptedFiles: File[];
  fileRejections: {
    file: File;
    errors: (UploaderError | { code: string; message: string })[];
  }[];
  presignedUrls?: PresignedUrlFetchResponse;
};

const initialState: UseInputPropsState = {
  isFileDialogActive: false,
  isFocused: false,
  acceptedFiles: [],
  fileRejections: [],
  presignedUrls: undefined,
};

type UseInputPropsAction = {
  type: "focus" | "blur" | "openDialog" | "closeDialog" | "setFiles" | "reset";
} & Partial<UseInputPropsState>;

const reducer: Reducer<UseInputPropsState, UseInputPropsAction> = (
  state,
  action,
) => {
  switch (action.type) {
    case "focus":
      return { ...state, isFocused: true };
    case "blur":
      return { ...state, isFocused: false };
    case "openDialog":
      return { ...state, isFileDialogActive: true };
    case "closeDialog":
      return { ...state, isFileDialogActive: false };
    case "setFiles":
      return {
        ...state,
        acceptedFiles: action.acceptedFiles ?? [],
        fileRejections: action.fileRejections ?? [],
        presignedUrls: action.presignedUrls ?? undefined,
      };
    case "reset":
      return {
        ...initialState,
      };
  }
};

const useInput = ({
  acceptAll = false,
  disabled = false,
  getFilesFromEvent = fromEvent,
  maxSize = Infinity,
  minSize = 0,
  maxFiles = 0,
  multiple = true,
  validator,
  useFsAccessApi = true,
  accept,
  onFileDialogCancel,
  onFileDialogOpen,
  onError,
  fileAccess = "private",
  folder,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
}: UseInputProps) => {
  const acceptAttr = useMemo(() => acceptPropAsAcceptAttr(accept), [accept]);
  const pickerTypes = useMemo(() => pickerOptionsFromAccept(accept), [accept]);

  const onFileDialogOpenCb = useMemo(
    () => (typeof onFileDialogOpen === "function" ? onFileDialogOpen : noop),
    [onFileDialogOpen],
  );
  const onFileDialogCancelCb = useMemo(
    () =>
      typeof onFileDialogCancel === "function" ? onFileDialogCancel : noop,
    [onFileDialogCancel],
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { isFocused, isFileDialogActive, acceptedFiles, presignedUrls } = state;

  const fsAccessApiWorksRef = useRef(
    typeof window !== "undefined" &&
      window.isSecureContext &&
      useFsAccessApi &&
      canUseFileSystemAccessAPI(),
  );

  // Update file dialog active state when the window is focused on
  const onWindowFocus = () => {
    // Execute the timeout only if the file dialog is opened in the browser
    if (!fsAccessApiWorksRef.current && isFileDialogActive) {
      setTimeout(() => {
        if (inputRef.current) {
          const { files } = inputRef.current;

          if (!files || files.length === 0) {
            dispatch({ type: "closeDialog" });
            onFileDialogCancelCb();
          }
        }
      }, 300);
    }
  };

  useEffect(() => {
    window.addEventListener("focus", onWindowFocus, false);
    return () => {
      window.removeEventListener("focus", onWindowFocus, false);
    };
  }, [inputRef, isFileDialogActive, onFileDialogCancelCb, fsAccessApiWorksRef]);

  const onErrCb = useCallback(
    (e: Error) => {
      if (onError) {
        onError(e);
      } else {
        // Let the user know something's gone wrong if they haven't provided the onError cb.
        console.error(e);
      }
    },
    [onError],
  );

  const setFiles = useCallback(
    async (files: File[]) => {
      const acceptedFiles: File[] = [];
      const fileRejections: {
        file: File;
        errors: (UploaderError | { code: string; message: string })[];
      }[] = [];

      files.forEach((file) => {
        const { file: maybeValidatedFile, errors } = validateFile(
          file,
          acceptAttr,
          acceptAll,
          minSize,
          maxSize,
          validator,
        );

        if (errors.length === 0) {
          acceptedFiles.push(maybeValidatedFile);
        } else {
          fileRejections.push({
            file: maybeValidatedFile,
            errors,
          });
        }
      });

      if (
        (!multiple && acceptedFiles.length > 1) ||
        (multiple && maxFiles >= 1 && acceptedFiles.length > maxFiles)
      ) {
        // Reject everything and empty accepted files
        acceptedFiles.forEach((file) => {
          fileRejections.push({
            file,
            errors: [
              {
                code: "too-many-files",
                message: `Too many files. Maximum allowed is ${maxFiles}.`,
              },
            ],
          });
        });
        acceptedFiles.splice(0);
      }

      if (acceptedFiles.length > 0) {
        const presignedUrls = await getPresignedUrls({
          files: acceptedFiles.map(({ name, size, type }) => ({
            name,
            size,
            type,
          })),
          fileAccess,
          folder: folder ?? "",
          apiUrl: "/api/uploadjoy/presignedUrls/upload",
        });

        dispatch({
          acceptedFiles,
          fileRejections,
          presignedUrls,
          type: "setFiles",
        });

        return;
      }

      dispatch({
        acceptedFiles,
        fileRejections,
        type: "setFiles",
      });
    },
    [dispatch, multiple, acceptAttr, minSize, maxSize, maxFiles, validator],
  );

  // Fn for opening the file dialog programmatically
  const openFileDialog = useCallback(() => {
    // No point to use FS access APIs if context is not secure
    // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#feature_detection
    if (fsAccessApiWorksRef.current) {
      dispatch({ type: "openDialog" });
      onFileDialogOpenCb();
      // https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker
      const opts = {
        multiple,
        types: pickerTypes ?? undefined,
      };
      window
        .showOpenFilePicker(opts)
        .then((handles) => getFilesFromEvent(handles))
        .then(async (files) => {
          await setFiles(files as File[]);
          dispatch({ type: "closeDialog" });
        })
        .catch((e: Error) => {
          // AbortError means the user canceled
          if (isAbort(e)) {
            onFileDialogCancelCb();
            dispatch({ type: "closeDialog" });
          } else if (isSecurityError(e)) {
            fsAccessApiWorksRef.current = false;
            // CORS, so cannot use this API
            // Try using the input
            if (inputRef.current) {
              inputRef.current.value = "";
              inputRef.current.click();
            } else {
              onErrCb(
                new Error(
                  "Cannot open the file picker because the https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API is not supported and no <input> was provided.",
                ),
              );
            }
          } else {
            onErrCb(e);
          }
        });
      return;
    }
    if (inputRef.current) {
      dispatch({ type: "openDialog" });
      onFileDialogOpenCb();
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }, [
    dispatch,
    onFileDialogOpenCb,
    onFileDialogCancelCb,
    useFsAccessApi,
    setFiles,
    onErrCb,
    pickerTypes,
    multiple,
  ]);

  const onInputElementClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  // eslint-disable-next-line @typescript-eslint/ban-types
  const composeHandler = (fn: Function) => {
    return disabled ? noop : fn;
  };

  const getInputProps = useMemo(
    () =>
      ({ onChange, onClick, ...rest }: HTMLProps<HTMLInputElement> = {}) => {
        const inputProps = {
          accept: acceptAttr ? acceptAttr.join(",") : "",
          multiple,
          type: "file",
          style: { display: "none" },
          onChange: composeHandler(
            composeEventHandlers(onChange ?? noop),
          ) as ChangeEventHandler<HTMLInputElement>,
          onClick: composeHandler(
            composeEventHandlers(onClick ?? noop, onInputElementClick),
          ) as MouseEventHandler<HTMLInputElement>,
          tabIndex: -1,
          ref: inputRef,
        };

        return {
          ...inputProps,
          ...rest,
        };
      },
    [inputRef, accept, multiple, disabled],
  );

  const uploadFiles = useCallback(async () => {
    if (!presignedUrls) return;
    await submit({
      acceptedFiles,
      presignedUrls,
      onProgress: onUploadProgress ?? noop,
      onError: onUploadError ?? noop,
      onSuccess: onUploadSuccess ?? noop,
    });
  }, [acceptedFiles, presignedUrls, submit]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
  }, [dispatch]);

  return {
    ...state,
    isFocused: isFocused && !disabled,
    getInputProps,
    openFileDialog: disabled ? noop : openFileDialog,
    uploadFiles: disabled ? noopPromise : uploadFiles,
    reset,
  };
};

export { useInput };
