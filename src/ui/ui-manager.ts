import { getColorCapabilities, determineOutputFormatting } from './color-detection';
import { createLoadingIndicator } from './loading-indicator';
import { formatMarkdown } from './output-formatter';
import type { ColorCapabilities, OutputFormatting } from './color-detection';
import type { LoadingIndicatorOptions, LoadingIndicatorResult } from './types';

// Module-level state (private to this module)
let colorCapabilities: ColorCapabilities | null = null;
let currentIndicator: LoadingIndicatorResult | null = null;

/**
 * Initialize UI capabilities once (lazy initialization)
 */
const initializeUI = (): ColorCapabilities => {
    if (!colorCapabilities) {
        colorCapabilities = getColorCapabilities();
    }
    return colorCapabilities;
};

/**
 * Start loading indicator with optional configuration
 */
export const startLoading = (options?: LoadingIndicatorOptions): void => {
    const capabilities = initializeUI();
    
    if (capabilities.shouldShowLoadingIndicator) {
        currentIndicator = createLoadingIndicator({
            message: 'Starting...',
            showTokenCount: true,
            ...options
        });
        currentIndicator.start();
    }
};

/**
 * Update the current stage message of the loading indicator
 * If loading indicator was stopped, automatically restart it
 */
export const updateLoadingStage = (stage: string): void => {
    if (!currentIndicator || !currentIndicator.isRunning()) {
        // Loading indicator was stopped or doesn't exist, restart it
        startLoading({ message: stage, showTokenCount: true });
    } else {
        // Loading indicator is running, just update the stage
        currentIndicator.updateStage(stage);
    }
};

/**
 * Update token count in the loading indicator
 */
export const updateTokenCount = (count: number): void => {
    currentIndicator?.updateTokenCount(count);
};

/**
 * Stop the loading indicator and wait for it to complete
 */
export const stopLoading = async (): Promise<void> => {
    if (currentIndicator?.isRunning()) {
        currentIndicator.stop();
        // Wait for next tick to ensure terminal processes the clear
        await new Promise(resolve => process.nextTick(resolve));
    }
    currentIndicator = null;
};

/**
 * Check if loading indicator is currently running
 */
export const isLoadingActive = (): boolean => {
    return currentIndicator?.isRunning() ?? false;
};

/**
 * Get UI capabilities for the current terminal
 */
export const getUICapabilities = (): ColorCapabilities => {
    return initializeUI();
};

/**
 * Determine output formatting based on user preferences and terminal capabilities
 */
export const getOutputFormatting = (
    outputMode: 'markdown' | 'plain' | undefined,
    forcePlain?: boolean
): OutputFormatting => {
    return determineOutputFormatting(outputMode, forcePlain);
};

/**
 * Format output content based on preferences
 */
export const formatOutput = async (content: string, shouldFormat: boolean): Promise<string> => {
    return shouldFormat ? await formatMarkdown(content) : content;
};

/**
 * Clean shutdown function - stops any active loading indicators
 */
export const shutdownUI = (): void => {
    stopLoading();
    // Reset capabilities for next initialization
    colorCapabilities = null;
};