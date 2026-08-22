
// A simple logger utility to standardize console output.
// This can be expanded later to integrate with a remote logging service.

const formatMessage = (level: string, message: string, ...optionalParams: any[]) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
    log: (message: string, ...optionalParams: any[]) => {
        console.log(formatMessage('info', message), ...optionalParams);
    },
    warn: (message: string, ...optionalParams: any[]) => {
        console.warn(formatMessage('warn', message), ...optionalParams);
    },
    error: (message: string, ...optionalParams: any[]) => {
        console.error(formatMessage('error', message), ...optionalParams);
    },
};
