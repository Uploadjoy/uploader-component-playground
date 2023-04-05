import { uploadjoyPutObjectApiOutputSchema as presignedUrlFetchResponseSchema } from "../core/validators";
import { z } from "zod";

export type OnUploadProgress = (event: ProgressEvent, file: File) => void;
export type OnUploadSuccess = (file: File) => void;
export type OnUploadError = (file: File) => void;

const upload = async ({
  file,
  url,
  onProgress,
  onSuccess,
  onError,
}: {
  file: File;
  url: string;
  onProgress: OnUploadProgress;
  onSuccess: OnUploadSuccess;
  onError: OnUploadError;
}) => {
  const buffer = await file.arrayBuffer();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = async (event: ProgressEvent) => {
      onProgress(event, file);
    };

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          onSuccess(file);
          resolve();
        } else {
          reject();
        }
      }
    };

    xhr.onerror = async () => onError(file);

    xhr.send(buffer);
  });
};

export const submit = async ({
  acceptedFiles,
  presignedUrls,
  onProgress,
  onSuccess,
  onError,
}: {
  acceptedFiles: File[];
  presignedUrls: z.infer<typeof presignedUrlFetchResponseSchema>;
  onProgress: OnUploadProgress;
  onSuccess: OnUploadSuccess;
  onError: OnUploadError;
}) => {
  const promises = acceptedFiles.map((file) => {
    const presignedUrlData = presignedUrls[file.name];
    if (!presignedUrlData) {
      throw new Error("No presigned URL found for file");
    }
    return upload({
      file,
      url: presignedUrlData.url,
      onProgress,
      onSuccess,
      onError,
    });
  });

  await Promise.all(promises);
};
