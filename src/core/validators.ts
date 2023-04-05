import { z } from "zod";

const folderRegex = /^([a-zA-Z0-9_-])+(\/([a-zA-Z0-9_-]+))*\/$/;
const fileNameRegex = /^[a-zA-Z0-9_.-]*$/;

const folderNameSchema = z.string().regex(folderRegex, {
  message:
    "File path must consist of alphanumeric characters, underscores, and dashes, and must end with a slash. e.g. 'my-folder/', 'my-folder/sub-folder/'",
});

const fileNameSchema = z.string().regex(fileNameRegex, {
  message:
    "File name must consist of alphanumeric characters, underscores, dashes, and periods. e.g. 'my-file.txt', 'my_file'",
});

export const validateFolder = (
  folder: string | undefined,
): { success: true } | { success: false; errorMessage: string } => {
  if (folder) {
    const result = folderNameSchema.safeParse(folder);
    if (!result.success) {
      return {
        success: false,
        errorMessage: result.error.message,
      };
    }
  }

  return { success: true };
};

const validateFolderAsync = async (
  folder: string | undefined,
): Promise<{ success: true } | { success: false; errors: z.ZodIssue[] }> => {
  if (folder) {
    const result = await folderNameSchema.safeParseAsync(folder);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues,
      };
    }
  }

  return { success: true };
};

const validateFilenamesAsync = async (
  files: { name: string; size: number; type: string }[],
): Promise<{ success: true } | { success: false; errors: z.ZodIssue[] }> => {
  const filenames = files.map((file) => file.name);
  const result = await fileNameSchema.array().safeParseAsync(filenames);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues,
    };
  }

  return { success: true };
};

export const validateFileNamesAndFolderAsync = async (
  files: { name: string; size: number; type: string }[],
  folder: string | undefined,
): Promise<{ success: true } | { success: false; errors: z.ZodIssue[] }> => {
  const folderValidation = validateFolderAsync(folder);
  const filenamesValidation = validateFilenamesAsync(files);

  const [folderValidationResult, filenamesValidationResult] = await Promise.all(
    [folderValidation, filenamesValidation],
  );

  if (!folderValidationResult.success && !filenamesValidationResult.success) {
    return {
      success: false,
      errors: [
        ...folderValidationResult.errors,
        ...filenamesValidationResult.errors,
      ],
    };
  }

  if (!folderValidationResult.success) {
    return folderValidationResult;
  }

  if (!filenamesValidationResult.success) {
    return filenamesValidationResult;
  }

  return { success: true };
};

export const uploadjoyPutObjectApiOutputSchema = z.record(
  z.string(),
  z.object({
    url: z.string(),
    location: z.string(),
  }),
);
