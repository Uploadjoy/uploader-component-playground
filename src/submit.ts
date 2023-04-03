import { PresignedUrlFetchResponse } from "./presignedUrls";

const upload = async ({
  file,
  url,
  onProgress,
}: {
  file: File;
  url: string;
  onProgress: (event: ProgressEvent, file: File) => void;
}) => {
  const buffer = await file.arrayBuffer();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event: ProgressEvent) => {
      onProgress(event, file);
    };

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Cache-Control", "max-age=630720000");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject();
        }
      }
    };

    xhr.send(buffer);
  });
};

export const submit = async ({
  acceptedFiles,
  presignedUrls,
  onProgress,
}: {
  acceptedFiles: File[];
  presignedUrls: PresignedUrlFetchResponse;
  onProgress: (event: ProgressEvent, file: File) => void;
}) => {
  const promises = acceptedFiles.map((file) => {
    const url = presignedUrls[file.name];
    if (!url) {
      throw new Error("No presigned URL found for file");
    }
    return upload({ file, url, onProgress });
  });

  await Promise.all(promises);
};
