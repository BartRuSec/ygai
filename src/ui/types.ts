export interface LoadingIndicatorOptions {
    message?: string;
    color?: boolean;
    isTTY: boolean;
    showTokenCount?: boolean;
}

export interface LoadingIndicatorResult {
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
    updateTokenCount: (count: number) => void;
}