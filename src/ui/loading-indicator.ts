import type { LoadingIndicatorOptions, LoadingIndicatorResult } from './types';

// ANSI color codes
const COLORS = {
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    RESET: '\x1b[0m',
    CLEAR_LINE: '\x1b[2K\r'
} as const;

// Classic spinner frames
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

const createSpinnerFrame = (frameIndex: number, message: string, useColor: boolean, tokenCount?: number): string => {
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    
    const displayMessage = tokenCount !== undefined 
        ? `${message} (${tokenCount} tokens)`
        : message;
    
    if (useColor) {
        const tokenPart = tokenCount !== undefined 
            ? ` (${COLORS.CYAN}${tokenCount}${COLORS.RESET}${COLORS.WHITE} tokens)`
            : '';
        const basePart = tokenCount !== undefined 
            ? message
            : displayMessage;
        return `${COLORS.CYAN}${frame}${COLORS.RESET} ${COLORS.WHITE}${basePart}${tokenPart}${COLORS.RESET}`;
    } else {
        return `${frame} ${displayMessage}`;
    }
};

const renderFrame = (frame: string, isTTY: boolean): void => {
    if (isTTY) {
        // Clear line and write frame
        process.stdout.write(COLORS.CLEAR_LINE + frame);
    }
};

const clearLine = (isTTY: boolean): void => {
    if (isTTY) {
        process.stdout.write(COLORS.CLEAR_LINE);
    }
};

export const createLoadingIndicator = (options: LoadingIndicatorOptions): LoadingIndicatorResult => {
    const message = options.message || 'Invoking model...';
    const useColor = options.color !== false && options.isTTY;
    const showTokenCount = options.showTokenCount === true;
    let intervalId: NodeJS.Timeout | null = null;
    let frameIndex = 0;
    let running = false;
    let currentTokenCount = 0;

    const start = (): void => {
        if (running || !options.isTTY) {
            return;
        }

        running = true;
        frameIndex = 0;
        currentTokenCount = 0;

        // Render initial frame (no token count initially)
        const initialFrame = createSpinnerFrame(frameIndex, message, useColor);
        renderFrame(initialFrame, options.isTTY);

        // Start animation loop - updates every 100ms (10fps)
        intervalId = setInterval(() => {
            frameIndex++;
            const frame = createSpinnerFrame(
                frameIndex, 
                message, 
                useColor, 
                showTokenCount && currentTokenCount > 0 ? currentTokenCount : undefined
            );
            renderFrame(frame, options.isTTY);
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
        clearLine(options.isTTY);
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