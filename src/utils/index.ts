


export function createPageUrl(pageName: string) {
    // Keep original casing for explicit routes like "/LiveLoads", "/Call-Ins" etc.
    return '/' + pageName;
}