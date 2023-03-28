type PresignedUrlFetchResponse = {
  [fileName: string]: string;
};

type GetPresignedUrlOpts = {
  fileName: string;
  folder: string;
  visibility: "public" | "private";
  apiUrl?: string;
};

export const getPresignedUrl = async ({
  fileName,
  folder,
  visibility,
  apiUrl,
}: GetPresignedUrlOpts) => {
  const response = await fetch(`${apiUrl}/presigned-url`, {
    method: "POST",
    body: JSON.stringify({ fileName, folder, visibility }),
  });
  const data: PresignedUrlFetchResponse = await response.json();
  return data[fileName];
};
