import supportsColor from 'supports-color';

export interface ColorCapabilities {
    hasBasicColors: boolean;
    hasExtendedColors: boolean;
    hasTrueColor: boolean;
    shouldUseColors: boolean;
    shouldShowLoadingIndicator: boolean;
}

export interface OutputFormatting {
    shouldFormatMarkdown: boolean;
    shouldShowLoadingIndicator: boolean;
    shouldUseColors: boolean;
}

/**
 * Detects terminal color capabilities and whether to show visual indicators
 */
export const detectColorCapabilities = (): ColorCapabilities => {
    const stdout = supportsColor.stdout;
    const stderr = supportsColor.stderr;
    
    // Use stdout capabilities as primary, fallback to stderr
    const colorSupport = stdout || stderr;
    
    const hasBasicColors = colorSupport !== false && (colorSupport?.level ?? 0) >= 1;
    const hasExtendedColors = colorSupport !== false && (colorSupport?.level ?? 0) >= 2;
    const hasTrueColor = colorSupport !== false && (colorSupport?.level ?? 0) >= 3;
    
    // Use colors if any color support is detected
    const shouldUseColors = hasBasicColors;
    
    // Show loading indicator if we have colors and terminal supports it
    // Also check if stdout is a TTY for interactive terminals
    const shouldShowLoadingIndicator = shouldUseColors && process.stdout.isTTY === true;
    
    return {
        hasBasicColors,
        hasExtendedColors,
        hasTrueColor,
        shouldUseColors,
        shouldShowLoadingIndicator
    };
};

/**
 * Centralized function to determine output formatting based on:
 * - User's output preference (markdown/plain)
 * - Terminal capabilities (color support, TTY)
 * - Plain mode flag
 */
export const determineOutputFormatting = (
    outputMode: 'markdown' | 'plain' | undefined,
    forcePlain?: boolean
): OutputFormatting => {
    const colorCapabilities = detectColorCapabilities();
    
    // Loading indicator should show whenever terminal supports it (even in plain mode)
    const shouldShowIndicator = colorCapabilities.shouldShowLoadingIndicator;
    
    // If plain mode is forced, only show loading indicator (no colors/formatting)
    if (forcePlain) {
        return {
            shouldFormatMarkdown: false,
            shouldShowLoadingIndicator: shouldShowIndicator,
            shouldUseColors: false
        };
    }
    
    // If plain mode is explicitly requested, show loading indicator but no formatting
    if (outputMode === 'plain') {
        return {
            shouldFormatMarkdown: false,
            shouldShowLoadingIndicator: shouldShowIndicator,
            shouldUseColors: colorCapabilities.shouldUseColors
        };
    }
    
    // For markdown output, check terminal capabilities
    if (outputMode === 'markdown') {
        const canUseFormatting = colorCapabilities.shouldUseColors && process.stdout.isTTY === true;
        
        return {
            shouldFormatMarkdown: canUseFormatting,
            shouldShowLoadingIndicator: shouldShowIndicator,
            shouldUseColors: canUseFormatting
        };
    }
    
    // Default case - use terminal capabilities
    return {
        shouldFormatMarkdown: false,
        shouldShowLoadingIndicator: shouldShowIndicator,
        shouldUseColors: colorCapabilities.shouldUseColors
    };
};

/**
 * Get color capabilities for the current terminal
 */
export const getColorCapabilities = (): ColorCapabilities => {
    return detectColorCapabilities();
};

/**
 * Check if colors should be used in output
 */
export const shouldUseColors = (): boolean => {
    return detectColorCapabilities().shouldUseColors;
};

/**
 * Check if loading indicators should be shown
 */
export const shouldShowLoadingIndicator = (): boolean => {
    return detectColorCapabilities().shouldShowLoadingIndicator;
};