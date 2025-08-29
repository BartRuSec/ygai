export { formatMarkdown } from './output-formatter';
export { createLoadingIndicator } from './loading-indicator';
export type { LoadingIndicatorOptions } from './types';

// Export UI Manager functions
export {
    startLoading,
    updateLoadingStage,
    updateTokenCount,
    stopLoading,
    isLoadingActive,
    getUICapabilities,
    getOutputFormatting,
    formatOutput,
    shutdownUI
} from './ui-manager';

// Export color detection functions
export {
    getColorCapabilities,
    determineOutputFormatting,
    shouldUseColors,
    shouldShowLoadingIndicator
} from './color-detection';

// Export types
export type {
    ColorCapabilities,
    OutputFormatting
} from './color-detection';