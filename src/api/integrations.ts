interface EmailPayload {
  to: string
  subject: string
  body: string
}

const logStub = (action: string, payload?: unknown): void => {
  if (typeof console !== 'undefined') {
    console.info(`[paltra-local] ${action} invoked`, payload)
  }
}

export const Core = {
  async InvokeLLM(payload: Record<string, unknown>): Promise<void> {
    logStub('InvokeLLM', payload)
  },
  async SendEmail(payload: EmailPayload): Promise<void> {
    logStub('SendEmail', payload)
  },
  async UploadFile(payload: Record<string, unknown>): Promise<void> {
    logStub('UploadFile', payload)
  },
  async GenerateImage(payload: Record<string, unknown>): Promise<void> {
    logStub('GenerateImage', payload)
  },
  async ExtractDataFromUploadedFile(payload: Record<string, unknown>): Promise<void> {
    logStub('ExtractDataFromUploadedFile', payload)
  },
}

export const InvokeLLM = Core.InvokeLLM
export const SendEmail = Core.SendEmail
export const UploadFile = Core.UploadFile
export const GenerateImage = Core.GenerateImage
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile
