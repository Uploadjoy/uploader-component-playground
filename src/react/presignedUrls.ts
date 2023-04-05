import { z } from "zod";
import { GetPresignedUrlOpts } from "../core/types";
import { uploadjoyPutObjectApiOutputSchema as presignedUrlFetchResponseSchema } from "../core/validators";

export const getPresignedUrls = async ({
  files,
  folder,
  fileAccess,
  apiUrl,
}: GetPresignedUrlOpts) => {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files, folder, fileAccess }),
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch presigned URLs \n
        Status: ${response.status} \n
        Body: ${response.json()}`,
      );
      return;
    }

    const data = await response.json();

    const parseResult = presignedUrlFetchResponseSchema.safeParse(data);
    if (!parseResult.success) {
      console.error(
        `Failed to parse presigned URL response \n
        ${parseResult.error.issues.toString()}`,
      );
      return;
    }

    return data as z.infer<typeof presignedUrlFetchResponseSchema>;
  } catch (error) {
    console.error(error);
  }
};
