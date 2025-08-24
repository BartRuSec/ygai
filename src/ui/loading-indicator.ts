import type { LoadingIndicatorOptions, LoadingIndicatorResult } from './types';
import { getColorCapabilities } from '../utils/color-detection';
import chalk from 'chalk';

// Classic spinner frames
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

const createSpinnerFrame = (frameIndex: number, message: string, useColor: boolean, tokenCount?: number): string => {
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    
    const displayMessage = tokenCount !== undefined 
        ? `${message} (${tokenCount} tokens)`
        : message;
    
    if (useColor) {
        const tokenPart = tokenCount !== undefined 
            ? ` (${chalk.cyan(tokenCount)} tokens)`
            : '';
        const basePart = tokenCount !== undefined 
            ? message
            : displayMessage;
        return `${chalk.cyan(frame)} ${chalk.white(basePart)}${tokenPart}`;
    } else {
        return `${frame} ${displayMessage}`;
    }
};

const renderFrame = (frame: string, shouldShow: boolean): void => {
    if (shouldShow) {
        // Clear line and write frame
        process.stdout.write('\x1b[2K\r' + frame);
    }
};

const clearLine = (shouldShow: boolean): void => {
    if (shouldShow) {
        process.stdout.write('\x1b[2K\r');
    }
};

export const createLoadingIndicator = (options: LoadingIndicatorOptions): LoadingIndicatorResult => {
    const colorCapabilities = getColorCapabilities();
    const message = options.message || 'Invoking model...';
    const useColor = colorCapabilities.shouldUseColors;
    const shouldShow = colorCapabilities.shouldShowLoadingIndicator;
    const showTokenCount = options.showTokenCount === true;
    let intervalId: NodeJS.Timeout | null = null;
    let frameIndex = 0;
    let running = false;
    let currentTokenCount = 0;

    const start = (): void => {
        if (running || !shouldShow) {
            return;
        }

        running = true;
        frameIndex = 0;
        currentTokenCount = 0;

        // Render initial frame (no token count initially)
        const initialFrame = createSpinnerFrame(frameIndex, message, useColor);
        renderFrame(initialFrame, shouldShow);

        // Start animation loop - updates every 100ms (10fps)
        intervalId = setInterval(() => {
            frameIndex++;
            const frame = createSpinnerFrame(
                frameIndex, 
                message, 
                useColor, 
                showTokenCount && currentTokenCount > 0 ? currentTokenCount : undefined
            );
            renderFrame(frame, shouldShow);
        }, 100); // 10fps

        // Handle process interruption
        const cleanup = (): void => {
            stop();
            process.exit(0);
        };

        process.once('SIGINT', cleanup);
        process.once('SIGTERM', cleanup);
    };

    const stop = (): void => {
        if (!running) {
            return;
        }

        running = false;

        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        // Clear the spinner line
        clearLine(shouldShow);
    };

    const updateTokenCount = (count: number): void => {
        currentTokenCount = count;
        // Token count will be displayed on next 10fps animation frame
    };

    const isRunning = (): boolean => running;

    return {
        start,
        stop,
        isRunning,
        updateTokenCount
    };
};