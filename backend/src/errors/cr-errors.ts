export class ClashRoyaleApiError extends Error {
    public status?: number;
    public details?: string;
    constructor(message: string, opts?: { status?: number; details?: string }) {
      super(message);
      this.name = "ClashRoyaleApiError";
      this.status = opts?.status;
      this.details = opts?.details;
    }
  }