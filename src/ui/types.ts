export interface LoadingIndicatorOptions {
    message?: string;
    showTokenCount?: boolean;
}

export interface LoadingIndicatorResult {
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
    updateTokenCount: (count: number) => void;
    updateStage: (stage: string) => void;
}